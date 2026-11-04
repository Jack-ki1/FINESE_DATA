const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("the public homepage is a single-page product experience", () => {
  const page = read("app/page.tsx");
  assert.match(page, /FINESE DATA/);
  assert.match(page, /\/signup/);
  assert.match(page, /\/login/);
  assert.match(page, /Model Studio|machine learning/i);
});

test("the Studio exposes exactly the six primary work areas", () => {
  const studio = read("components/studio-client.tsx");
  for (const label of ["Overview", "Upload", "Cleaning", "Plot Studio", "Model Studio", "Export"]) {
    assert.ok(studio.includes(`label:"${label}"`), `Missing sidebar section: ${label}`);
  }
  assert.ok(!studio.includes(`label:"Chat Studio"`), "Chat Studio must be renamed to Plot Studio");
  assert.match(studio, /api\/jobs/);
  assert.match(studio, /api\/datasets/);
  assert.match(studio, /api\/chat/);
});

test("Studio sessions are stored in an HttpOnly cookie and checked server-side", () => {
  assert.match(read("app/api/auth/login/route.ts"), /httpOnly:true/);
  assert.match(read("app/studio/layout.tsx"), /redirect\("\/login"\)/);
  assert.match(read("app/api/proxy/[...path]/route.ts"), /Request origin is not allowed/);
});
