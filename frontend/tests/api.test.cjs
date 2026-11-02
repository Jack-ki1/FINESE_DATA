const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  module._compile(compiled, filename);
};

const api = require(path.join(__dirname, "..", "lib", "api-client.ts"));

test("createErrorResponse formats envelope per backend.md specification", async () => {
  const res = api.createErrorResponse("INVALID_INPUT", "Test error message", 400);
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error);
  assert.equal(data.error.code, "INVALID_INPUT");
  assert.equal(data.error.message, "Test error message");
  assert.ok(typeof data.error.requestId === "string");
  assert.ok(data.error.requestId.length > 10);
});

test("getBackendUrl defaults to localhost:8000 when BACKEND_URL is unset", () => {
  delete process.env.BACKEND_URL;
  assert.equal(api.getBackendUrl(), "http://127.0.0.1:8000");
  process.env.BACKEND_URL = "https://compute.finese.ai";
  assert.equal(api.getBackendUrl(), "https://compute.finese.ai");
  delete process.env.BACKEND_URL;
});
