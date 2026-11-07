import {constants, copyFileSync, existsSync, lstatSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const [root, mode = '--check'] = process.argv.slice(2);
if (!root || !['--check', '--apply', '--rollback'].includes(mode) || process.argv.length > 4) {
  throw new Error('Usage: node apply.mjs /absolute/extracted/source [--check|--apply|--rollback]');
}
const target = resolve(root, 'public/assets/app.js');
if (!lstatSync(target).isFile() || lstatSync(target).isSymbolicLink()) throw new Error('Expected a regular public/assets/app.js file.');
const evidence = JSON.parse(readFileSync(join(here, 'evidence.json'), 'utf8'));
const original = readFileSync(join(here, 'before.js'), 'utf8');
const replacement = readFileSync(join(here, 'after.js'), 'utf8');
const current = readFileSync(target);
const hash = value => createHash('sha256').update(value).digest('hex');
const currentHash = hash(current);
const backup = `${target}.master7-payment-status-display.bak`;

function writeAtomically(bytes) {
  const temp = `${target}.master7-payment-status-display.${process.pid}.tmp`;
  writeFileSync(temp, bytes, {flag: 'wx', mode: lstatSync(target).mode});
  renameSync(temp, target);
}

if (mode === '--rollback') {
  if (currentHash !== evidence.patchedSourceSha256 || !existsSync(backup) || hash(readFileSync(backup)) !== evidence.source.sha256) {
    throw new Error('Rollback refused: the current file or original backup differs from the verified candidate.');
  }
  writeAtomically(readFileSync(backup));
  console.log('Restored the verified original JavaScript; the backup is retained.');
} else if (currentHash === evidence.patchedSourceSha256) {
  console.log('The verified display patch is already present; no file changed.');
} else {
  if (currentHash !== evidence.source.sha256) throw new Error('Source SHA-256 differs from the inspected .94 asset; review the current source before applying.');
  const text = current.toString('utf8');
  if (text.split(original).length !== 2) throw new Error('The exact original display functions were not found once.');
  const next = text.replace(original, replacement);
  if (hash(next) !== evidence.patchedSourceSha256) throw new Error('Candidate checksum mismatch.');
  if (mode === '--check') console.log('Exact .94 asset and patch verified; no file changed.');
  else {
    if (!existsSync(backup)) copyFileSync(target, backup, constants.COPYFILE_EXCL);
    else if (hash(readFileSync(backup)) !== evidence.source.sha256) throw new Error('An unrelated backup already exists; no file changed.');
    writeAtomically(next);
    console.log('Applied the display-only patch and retained the original JavaScript backup.');
  }
}
