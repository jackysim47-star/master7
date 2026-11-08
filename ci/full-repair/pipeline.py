#!/usr/bin/env python3
"""Build an isolated, reviewable MASTER7 candidate; never deploy or publish."""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tarfile

REPOSITORY = "jackysim47-star/master7"
BRANCH = "codex/master7-full-repair-20261107"
BASE_COMMIT = "e3faa8ddc6b6fe87768e9e71f466ce48538bfad7"
BASE_SHA256 = "6d1a96b5a5cfa6e88a87908485c6af32e5d4cfc6a57da49420b1be48b76598d2"
BASE_DECLARED_SOURCE_COMMIT = "a0b3b2ede1f0e51f4dfeccc666637ca5f0643c05"
CANDIDATE_RELEASE = "17.0.0-selfbuilt.99-provider-entry"
ARCHIVE_ROOT = "master7-v17-render-staging"
ARCHIVE_NAME = ARCHIVE_ROOT + ".tar.gz"
PATCH_PATH = "docs/patches/full-closeout-20261107/master7-full-closeout.patch"
RECEIPT_NAME = "MASTER7_FULL_REPAIR_CANDIDATE_20261107.json"
NODE_VERSION = "v24.22.1"
PNPM_VERSION = "11.25.0"
REGISTRY = "https://registry.npmjs.org/"
DEPLOYMENT_CONFIGS = ("vercel.json", "domain-gateway/front/vercel.json", "domain-gateway/admin/vercel.json")


def require(value, message):
    if not value:
        raise RuntimeError(message)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_json(path, value):
    Path(path).write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")


def deployment_guards(repo):
    for name in DEPLOYMENT_CONFIGS:
        value = json.loads((repo / name).read_text())
        require(value.get("git", {}).get("deploymentEnabled") is False,
                "Automatic deployment must be disabled in " + name)


def archive_members(archive):
    members = archive.getmembers()
    require(0 < len(members) <= 2000, "Unexpected archive entry count")
    require(sum(member.size for member in members) <= 64 * 1024 * 1024, "Archive exceeds source size limit")
    seen = set()
    for member in members:
        path = PurePosixPath(member.name)
        require(member.name == path.as_posix(), "Non-canonical archive path")
        require(not path.is_absolute() and path.parts and path.parts[0] == ARCHIVE_ROOT,
                "Archive root is not the verified source root")
        require(not any(part in ("", ".", "..", ".git", "node_modules") for part in path.parts),
                "Unsafe archive path")
        require(member.name not in seen, "Duplicate archive path")
        seen.add(member.name)
        require(member.isdir() or member.isfile() and not member.issparse(), "Archive links and special files are forbidden")
        require(not any(part.startswith(".env") and part != ".env.example" for part in path.parts),
                "Runtime environment file is forbidden")
    return members


def extract_verified(archive_path, work):
    require(digest(archive_path) == BASE_SHA256, "Original archive SHA-256 mismatch")
    with tarfile.open(archive_path, "r:gz") as archive:
        members = archive_members(archive)
        for member in members:
            target = work.joinpath(*PurePosixPath(member.name).parts)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
                target.chmod(0o755)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.extractfile(member) as incoming, target.open("xb") as outgoing:
                    shutil.copyfileobj(incoming, outgoing)
                target.chmod(0o755 if member.mode & 0o111 else 0o644)
    return work / ARCHIVE_ROOT


def source_manifest(source):
    result = {}
    for path in sorted(source.rglob("*")):
        require(not path.is_symlink(), "Source symlink is forbidden")
        if path.is_file():
            relative = path.relative_to(source).as_posix()
            require(not any(part in (".git", "node_modules") for part in Path(relative).parts),
                    "Unexpected source metadata or dependencies")
            require(not any(part.startswith(".env") and part != ".env.example" for part in Path(relative).parts),
                    "Runtime environment file is forbidden")
            result[relative] = {"sha256": digest(path), "mode": 0o755 if path.stat().st_mode & 0o111 else 0o644}
    return result


def check_locked_source(source):
    package = json.loads((source / "package.json").read_text())
    require(package.get("packageManager") == "pnpm@" + PNPM_VERSION, "Unexpected package manager")
    require(package.get("devDependencies", {}).get("wrangler") == "4.92.0",
            "Identity boundary test must retain its pinned wrangler dependency")
    require(package.get("scripts", {}).get("build:render") == "NITRO_PRESET=node vite build --config vite.render.config.ts",
            "Unexpected Render build command")
    require(not any(key in package.get("scripts", {}) for key in ("preinstall", "install", "postinstall", "rebuild", "rb")),
            "New package lifecycle scripts require review")
    lock = (source / "pnpm-lock.yaml").read_text()
    require(lock.startswith("lockfileVersion: '9.0'"), "Unexpected lockfile format")
    require(not re.search(r"^\s+(?:specifier|version):\s+['\"]?(?:git\+|github:|git@|file:|link:|workspace:|https?://)", lock, re.M),
            "Lockfile contains a non-registry dependency reference")
    resolutions = re.findall(r"^    resolution: (.+)$", lock, re.M)
    require(resolutions and all(re.fullmatch(r"\{integrity: sha512-[A-Za-z0-9+/=]+\}", value) for value in resolutions),
            "Every package resolution must have a locked SHA-512 integrity")
    npmrc = (source / ".npmrc").read_text()
    require(not re.search(r"(?:auth|password|registry|token)", npmrc, re.I), "Unexpected npm credentials or registry override")
    require(not (source / ".pnpmfile.cjs").exists(), "pnpm hook requires review")
    return len(resolutions)


def clean_env(work, mode="test", guard=False, log_name="network.jsonl"):
    temporary = work / "tmp"
    temporary.mkdir(exist_ok=True)
    # Deliberately omit all GitHub tokens, DB URLs, vendor keys and inherited
    # application settings. Do not create or rewrite a HOME directory.
    env = {"PATH": os.environ["PATH"], "CI": "true", "TZ": "UTC", "TMPDIR": str(temporary),
           "NODE_ENV": mode, "NEXT_TELEMETRY_DISABLED": "1", "DO_NOT_TRACK": "1",
           "NITRO_TELEMETRY_DISABLED": "1", "npm_config_registry": REGISTRY,
           "npm_config_audit": "false", "npm_config_fund": "false"}
    for name in ("user", "global"):
        settings = work / ("empty-" + name + ".npmrc")
        settings.touch(exist_ok=True)
        env["NPM_CONFIG_" + name.upper() + "CONFIG"] = str(settings)
    if guard:
        guard_path = Path(__file__).with_name("deny-network.mjs").resolve()
        env["NODE_OPTIONS"] = "--import=" + str(guard_path)
        env["MASTER7_TEST_GUARD_LOG"] = str(work / "out" / log_name)
    return env


def run(command, cwd, env, log, timeout=900):
    with log.open("w") as stream:
        completed = subprocess.run(command, cwd=cwd, env=env, stdout=stream, stderr=subprocess.STDOUT, timeout=timeout)
    if completed.returncode:
        print(log.read_text(errors="replace")[-16000:])
        raise RuntimeError("Command failed; see " + log.name)


def state_for(work):
    return json.loads((work / "state.json").read_text())


def save_state(work, state):
    write_json(work / "state.json", state)


def prepare(args):
    require(args.repository == REPOSITORY and args.ref == "refs/heads/" + BRANCH, "Wrong repository or branch")
    require(re.fullmatch(r"[0-9a-f]{40}", args.commit), "Expected an exact source commit")
    repo, work = Path(args.repo).resolve(), Path(args.work).resolve()
    checkout_commit = subprocess.check_output(["git", "-C", str(repo), "rev-parse", "HEAD"], text=True).strip()
    require(checkout_commit == args.commit, "Checkout does not match the declared source commit")
    deployment_guards(repo)
    require(not work.exists(), "Use a new isolated work directory")
    patch = repo / PATCH_PATH
    require(patch.is_file() and not patch.is_symlink(), "Unified patch is missing")
    work.mkdir(mode=0o700)
    (work / "out").mkdir()
    source = extract_verified(Path(args.archive), work)
    lock_before = digest(source / "pnpm-lock.yaml")
    package_before = digest(source / "package.json")
    subprocess.run(["git", "apply", "--check", str(patch)], cwd=source, check=True)
    subprocess.run(["git", "apply", str(patch)], cwd=source, check=True)
    require(digest(source / "pnpm-lock.yaml") == lock_before and digest(source / "package.json") == package_before,
            "Dependency manifest changes need separate lockfile review")
    count = check_locked_source(source)
    release = re.search(r"export const RELEASE\s*=\s*['\"]([^'\"]+)['\"]", (source / "lib/backend.ts").read_text())
    require(release and release.group(1) == CANDIDATE_RELEASE, "Candidate release has not been updated")
    manifest = source_manifest(source)
    state = {"repository": REPOSITORY, "branch": BRANCH, "sourceCommit": args.commit,
             "baseCommit": BASE_COMMIT, "baseArchiveSha256": BASE_SHA256,
             "baseDeclaredSourceCommit": BASE_DECLARED_SOURCE_COMMIT,
             "candidateRelease": CANDIDATE_RELEASE, "patchPath": PATCH_PATH,
             "patchSha256": digest(patch), "lockfileSha256": lock_before, "lockedPackageCount": count,
             "node": NODE_VERSION, "pnpm": PNPM_VERSION, "files": manifest}
    save_state(work, state)
    print("Prepared verified source; locked packages:", count, "; source files:", len(manifest))


def install(args):
    work = Path(args.work).resolve()
    state = state_for(work)
    source, out = work / ARCHIVE_ROOT, work / "out"
    env = clean_env(work, mode="development")
    require(subprocess.check_output(["node", "--version"], env=env, text=True).strip() == NODE_VERSION,
            "Node version mismatch")
    tooling = work / "tooling"
    metadata = json.loads(subprocess.check_output(
        ["npm", "view", "pnpm@" + PNPM_VERSION, "--json", "--registry=" + REGISTRY], env=env, text=True, timeout=60))
    require(metadata.get("version") == PNPM_VERSION
            and not metadata.get("dependencies") and not metadata.get("optionalDependencies"),
            "Pinned package-manager bundle has unexpected transitive dependencies")
    manager_integrity = metadata.get("dist", {}).get("integrity", "")
    require(re.fullmatch(r"sha512-[A-Za-z0-9+/=]+", manager_integrity), "Missing official package-manager integrity")
    run(["npm", "install", "--prefix", str(tooling), "--ignore-scripts", "--no-audit", "--no-fund",
         "--save-exact", "--registry=" + REGISTRY, "pnpm@" + PNPM_VERSION],
        work, env, out / "manager-install.log")
    pnpm = tooling / "node_modules/pnpm/bin/pnpm.cjs"
    require(subprocess.check_output(["node", str(pnpm), "--version"], env=env, text=True).strip() == PNPM_VERSION,
            "pnpm version mismatch")
    manager_lock = json.loads((tooling / "package-lock.json").read_text())
    manager_packages = manager_lock.get("packages", {})
    require(set(manager_packages) == {"", "node_modules/pnpm"}
            and manager_packages["node_modules/pnpm"].get("version") == PNPM_VERSION
            and manager_packages["node_modules/pnpm"].get("integrity") == manager_integrity
            and manager_packages["node_modules/pnpm"].get("resolved") == REGISTRY + "pnpm/-/pnpm-" + PNPM_VERSION + ".tgz",
            "Installed package manager does not match its exact official release")
    run(["node", str(pnpm), "install", "--frozen-lockfile", "--prod=false", "--ignore-scripts",
         "--ignore-pnpmfile", "--registry=" + REGISTRY, "--reporter=append-only"],
        source, env, out / "install.log", timeout=1200)
    require(digest(source / "pnpm-lock.yaml") == state["lockfileSha256"], "Installation changed the lockfile")
    state["dependenciesInstalled"] = True
    state["pnpmIntegrity"] = manager_integrity
    save_state(work, state)


def verify(args):
    work = Path(args.work).resolve()
    state = state_for(work)
    require(state.get("dependenciesInstalled"), "Complete dependency install is required")
    require(os.geteuid() != 0, "Dependency and application code must not run as root")
    # Compare with the runner's own namespace captured before unshare; this
    # avoids needing to inspect a root-owned /proc/1 namespace.
    require(args.parent_netns and re.fullmatch(r"net:\[\d+\]", args.parent_netns)
            and os.readlink("/proc/self/ns/net") != args.parent_netns, "Network namespace is not isolated")
    source, out = work / ARCHIVE_ROOT, work / "out"
    pnpm = work / "tooling/node_modules/pnpm/bin/pnpm.cjs"
    env = clean_env(work, guard=True, log_name="rebuild-network.jsonl")
    env["npm_config_offline"] = "true"
    run(["node", str(pnpm), "rebuild", "--pending"], source, env, out / "rebuild.log")
    require(not (out / "rebuild-network.jsonl").exists(), "Dependency rebuild attempted networking")
    tests = sorted(source.glob("tests/*.test.mjs"))
    require(source / "tests/hosted-identity-boundary.test.mjs" in tests, "Identity boundary test cannot be omitted")
    env = clean_env(work, guard=True, log_name="tests-network.jsonl")
    run(["node", "--test", "--test-concurrency=4", "--test-reporter=tap", *map(str, tests)],
        source, env, out / "tests.tap")
    require(not (out / "tests-network.jsonl").exists(), "A test attempted real networking")
    tap = (out / "tests.tap").read_text()
    counts = {}
    for name in ("tests", "pass", "fail", "cancelled", "skipped", "todo"):
        matches = re.findall(r"^# " + name + r" (\d+)$", tap, re.M)
        require(matches, "Missing TAP summary: " + name)
        counts[name] = int(matches[-1])
    require(counts["tests"] > 0 and counts["tests"] == counts["pass"]
            and all(counts[name] == 0 for name in ("fail", "cancelled", "skipped", "todo")),
            "Full test suite did not pass without omissions")
    env = clean_env(work, mode="production", guard=True, log_name="build-network.jsonl")
    run(["node", str(pnpm), "run", "build:render"], source, env, out / "build.log", timeout=1200)
    require(not (out / "build-network.jsonl").exists(), "Render build attempted networking")
    server = source / ".output/server/index.mjs"
    require(server.is_file() and server.stat().st_size > 0, "Real Nitro server build output is missing")
    for relative, entry in state["files"].items():
        path = source / relative
        require(path.is_file() and not path.is_symlink() and digest(path) == entry["sha256"],
                "Install/test/build changed reviewed source: " + relative)
    state["validation"] = {"tests": counts, "testFiles": len(tests), "identityBoundaryIncluded": True,
                           "realRenderBuild": True, "buildServerSha256": digest(server),
                           "networkAttempts": 0, "networkNamespaceIsolated": True,
                           "productionCredentialsInjected": False}
    save_state(work, state)
    print("All tests and real Render build passed in the isolated network namespace")


def package(args):
    work = Path(args.work).resolve()
    state = state_for(work)
    require(state.get("validation", {}).get("realRenderBuild") is True, "Successful complete validation is required")
    source, out = work / ARCHIVE_ROOT, work / "out"
    archive_path = out / ARCHIVE_NAME
    # Only pre-install, reviewed source paths enter this archive. Dependencies,
    # temporary DBs, caches, environment files and build products cannot sneak in.
    with archive_path.open("xb") as raw, gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode="w", format=tarfile.PAX_FORMAT) as archive:
            for relative, entry in sorted(state["files"].items()):
                path = source / relative
                require(path.is_file() and not path.is_symlink() and digest(path) == entry["sha256"], "Source changed before packaging")
                info = tarfile.TarInfo(ARCHIVE_ROOT + "/" + relative)
                info.size = path.stat().st_size
                info.mode = entry["mode"]
                info.mtime = 0
                with path.open("rb") as stream:
                    archive.addfile(info, stream)
    receipt = {key: value for key, value in state.items() if key != "files"}
    receipt.update({"archiveName": ARCHIVE_NAME, "archiveSha256": digest(archive_path),
                    "archiveBytes": archive_path.stat().st_size, "sourceFileCount": len(state["files"]),
                    "sourceManifestSha256": hashlib.sha256(json.dumps(state["files"], sort_keys=True).encode()).hexdigest(),
                    "scope": "Undeployed API-automatic and interface-cleanup candidate source; no real transactions or acceptance attestation performed"})
    write_json(out / RECEIPT_NAME, receipt)
    (out / "SHA256SUMS").write_text(digest(archive_path) + "  " + ARCHIVE_NAME + "\n"
                                   + digest(out / RECEIPT_NAME) + "  " + RECEIPT_NAME + "\n")
    print("Candidate archive SHA-256:", receipt["archiveSha256"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("phase", choices=("prepare", "install", "verify", "package"))
    parser.add_argument("--work", required=True)
    parser.add_argument("--repo")
    parser.add_argument("--archive")
    parser.add_argument("--commit")
    parser.add_argument("--ref")
    parser.add_argument("--repository")
    parser.add_argument("--parent-netns")
    args = parser.parse_args()
    {"prepare": prepare, "install": install, "verify": verify, "package": package}[args.phase](args)
