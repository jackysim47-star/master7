#!/usr/bin/env python3
"""Optional reviewed writeback. Default is validation only, never a push."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import importlib.util

# Importing the helper must not create untracked files in the reviewed checkout.
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("pipeline", Path(__file__).with_name("pipeline.py"))
pipeline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pipeline)


def git(repo, *args):
    return subprocess.check_output(["git", "-C", str(repo), *args], text=True).strip()


def main(args):
    repo, artifacts = Path(args.repo).resolve(), Path(args.artifacts).resolve()
    pipeline.require(re.fullmatch(r"[0-9a-f]{40}", args.expected_sha), "Invalid source SHA")
    pipeline.require(git(repo, "rev-parse", "HEAD") == args.expected_sha, "Checkout is not the build source")
    pipeline.require(not git(repo, "status", "--porcelain"), "Publish checkout must be clean")
    pipeline.require(git(repo, "remote", "get-url", "origin") in (
        "https://github.com/" + pipeline.REPOSITORY,
        "https://github.com/" + pipeline.REPOSITORY + ".git"), "Unexpected remote")
    pipeline.deployment_guards(repo)
    receipt_path = artifacts / pipeline.RECEIPT_NAME
    receipt = json.loads(receipt_path.read_text())
    archive_path = artifacts / pipeline.ARCHIVE_NAME
    pipeline.require(receipt.get("sourceCommit") == args.expected_sha
                     and receipt.get("repository") == pipeline.REPOSITORY
                     and receipt.get("branch") == pipeline.BRANCH
                     and receipt.get("candidateRelease") == pipeline.CANDIDATE_RELEASE
                     and receipt.get("baseArchiveSha256") == pipeline.BASE_SHA256
                     and receipt.get("patchSha256") == pipeline.digest(repo / pipeline.PATCH_PATH),
                     "Artifact provenance does not match this reviewed commit")
    pipeline.require(receipt.get("archiveSha256") == pipeline.digest(archive_path)
                     and receipt.get("archiveBytes") == archive_path.stat().st_size, "Candidate archive mismatch")
    validation = receipt.get("validation", {})
    tests = validation.get("tests", {})
    pipeline.require(validation.get("realRenderBuild") is True
                     and validation.get("identityBoundaryIncluded") is True
                     and validation.get("networkNamespaceIsolated") is True
                     and validation.get("networkAttempts") == 0
                     and validation.get("productionCredentialsInjected") is False
                     and tests.get("tests", 0) > 0 and tests.get("tests") == tests.get("pass")
                     and all(tests.get(name) == 0 for name in ("fail", "cancelled", "skipped", "todo")),
                     "Complete build/test evidence is missing")
    with tarfile.open(archive_path, "r:gz") as archive:
        pipeline.archive_members(archive)
    if not args.publish:
        print("Artifact validated. Dry run only; no commit or push.")
        return
    branch_ref = "refs/heads/" + pipeline.BRANCH
    subprocess.run(["git", "-C", str(repo), "fetch", "--no-tags", "--depth=1", "origin", branch_ref], check=True)
    pipeline.require(git(repo, "rev-parse", "FETCH_HEAD") == args.expected_sha,
                     "Candidate branch advanced during CI; refuse stale writeback")
    archive_target = repo / pipeline.ARCHIVE_NAME
    receipt_relative = "docs/" + pipeline.RECEIPT_NAME
    receipt_target = repo / receipt_relative
    receipt_target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(archive_path, archive_target)
    shutil.copyfile(receipt_path, receipt_target)
    allowed = [pipeline.ARCHIVE_NAME, receipt_relative]
    subprocess.run(["git", "-C", str(repo), "add", "--", *allowed], check=True)
    changed = git(repo, "diff", "--cached", "--name-only").splitlines()
    pipeline.require(changed and set(changed) <= set(allowed), "Unexpected publish paths")
    subprocess.run(["git", "-C", str(repo), "-c", "user.name=github-actions[bot]",
                    "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com",
                    "commit", "-m", "build: retain verified .97 interface cleanup archive"], check=True)
    # Ordinary fast-forward push rejects an intervening branch update. Never
    # use force, rebase, merges, tags, releases, or a production branch here.
    subprocess.run(["git", "-C", str(repo), "push", "origin", "HEAD:" + branch_ref], check=True)
    print("Candidate-only archive commit:", git(repo, "rev-parse", "HEAD"))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True)
    parser.add_argument("--artifacts", required=True)
    parser.add_argument("--expected-sha", required=True)
    parser.add_argument("--publish", action="store_true")
    main(parser.parse_args())
