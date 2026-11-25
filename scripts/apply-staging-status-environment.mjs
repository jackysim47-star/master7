// Run from the unpacked UAT portal before building the Render service.
import { readFile, writeFile } from 'node:fs/promises';

const files = new Map();
async function source(path) {
  if (!files.has(path)) files.set(path, await readFile(path, 'utf8'));
  return files.get(path);
}

async function replaceOnce(path, previous, next) {
  const text = await source(path);
  if (text.includes(next)) return;
  if (text.split(previous).length !== 2) {
    throw new Error('Expected one matching source fragment in ' + path);
  }
  files.set(path, text.replace(previous, () => next));
}

const backend = 'lib/backend.ts';
const route = 'app/api/[...path]/route.ts';
const aiTest = 'tests/openai-status-api.test.mjs';
const policyTest = 'tests/upload-policy-api.test.mjs';

await replaceOnce(
  route,
  "return handle(req,{db:env.DB,",
  "return handle(req,{\n  renderExternalUrl:config.RENDER_EXTERNAL_URL,\n  db:env.DB,",
);

await replaceOnce(
  backend,
  "export type Context=UploadPolicyContext & {db:",
  "export type Context=UploadPolicyContext & {\n renderExternalUrl?:string;\n db:",
);

await replaceOnce(
  backend,
  "function supportAiSettings(c:Context)",
  "function deploymentEnvironment(origin?: string): 'production' | 'staging' | 'unknown' {\n  switch (origin?.replace(/\\/$/, '')) {\n    case 'https://master7-v17-production.onrender.com': return 'production';\n    case 'https://master7-v17-staging.onrender.com': return 'staging';\n    default: return 'unknown';\n  }\n}\nfunction supportAiSettings(c:Context)",
);

await replaceOnce(
  backend,
  "environment:'staging',readOnly:true,...openAiGatewayStatus",
  "environment:deploymentEnvironment(c.renderExternalUrl),readOnly:true,...openAiGatewayStatus",
);

await replaceOnce(
  backend,
  "environment:'staging',readOnly:true,...uploadPolicyStatus",
  "environment:deploymentEnvironment(c.renderExternalUrl),readOnly:true,...uploadPolicyStatus",
);

await replaceOnce(
  policyTest,
  "contextFor(role,{uploadApprovalMode:",
  "contextFor(role,{renderExternalUrl:'https://master7-v17-staging.onrender.com',uploadApprovalMode:",
);

const environmentTest = "\ntest('admin status reports the server deployment independently of the request host', async () => {\n  const deployments = [\n    ['https://master7-v17-production.onrender.com', 'production'],\n    ['https://master7-v17-staging.onrender.com/', 'staging'],\n    ['https://master7-ui-preview.onrender.com', 'unknown'],\n    [undefined, 'unknown'],\n  ];\n  for (const [renderExternalUrl, expected] of deployments) {\n    for (const path of ['/api/admin/ai-status', '/api/admin/upload-policy']) {\n      const request = new Request(new URL(path, 'https://www.master7.site'), {\n        headers: { 'x-forwarded-host': 'master7-v17-staging.onrender.com' },\n      });\n      const response = await handle(request, contextFor('owner', { renderExternalUrl }));\n      assert.equal(response.status, 200);\n      assert.equal((await response.json()).environment, expected);\n    }\n  }\n});\n";

const tests = await source(aiTest);
if (!tests.includes(environmentTest)) {
  files.set(aiTest, tests + environmentTest);
}
for (const [path, text] of files) {
  await writeFile(path, text);
}
