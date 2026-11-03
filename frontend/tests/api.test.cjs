const assert = require("node:assert/strict");
const Module = require("node:module");
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
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "@/lib/api-client") {
    request = path.join(__dirname, "..", "lib", "api-client.ts");
  }
  return resolveFilename.call(this, request, parent, isMain, options);
};
const aiRoute = require(path.join(__dirname, "..", "app", "api", "ai", "insights", "route.ts"));
const contactRoute = require(path.join(__dirname, "..", "app", "api", "contact", "route.ts"));
Module._resolveFilename = resolveFilename;

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

test("AI gateway validates consent and token limits before contacting the backend", async () => {
  const originalFetch = global.fetch;
  let fetchCalled = false;
  global.fetch = async () => {
    fetchCalled = true;
    return Response.json({});
  };
  try {
    const noConsent = await aiRoute.POST(new Request("http://localhost/api/ai/insights", {
      method: "POST",
      body: JSON.stringify({ prompt: "Summarize data", user_consent: false }),
    }));
    assert.equal(noConsent.status, 400);
    assert.equal((await noConsent.json()).error.code, "CONSENT_REQUIRED");

    const invalidTokens = await aiRoute.POST(new Request("http://localhost/api/ai/insights", {
      method: "POST",
      body: JSON.stringify({ prompt: "Summarize data", user_consent: true, max_tokens: "100" }),
    }));
    assert.equal(invalidTokens.status, 400);
    assert.equal((await invalidTokens.json()).error.code, "INVALID_INPUT");
    assert.equal(fetchCalled, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test("AI gateway preserves provider errors and reports unreachable backend", async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async () => Response.json({ error: { code: "AI_PROVIDER_ERROR" } }, { status: 502 });
    const providerError = await aiRoute.POST(new Request("http://localhost/api/ai/insights", {
      method: "POST",
      body: JSON.stringify({ prompt: "Summarize data", user_consent: true }),
    }));
    assert.equal(providerError.status, 502);
    assert.equal((await providerError.json()).error.code, "AI_PROVIDER_ERROR");

    global.fetch = async () => {
      throw new TypeError("fetch failed");
    };
    const unavailable = await aiRoute.POST(new Request("http://localhost/api/ai/insights", {
      method: "POST",
      body: JSON.stringify({ prompt: "Summarize data", user_consent: true }),
    }));
    assert.equal(unavailable.status, 503);
    assert.equal((await unavailable.json()).error.code, "BACKEND_UNAVAILABLE");
  } finally {
    global.fetch = originalFetch;
  }
});

test("contact gateway never reports successful delivery when backend is unavailable", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => {
    throw new TypeError("fetch failed");
  };
  try {
    const response = await contactRoute.POST(new Request("http://localhost/api/contact", {
      method: "POST",
      body: JSON.stringify({
        name: "Analyst",
        email: "analyst@example.com",
        message: "I would like to discuss data analytics.",
      }),
    }));
    assert.equal(response.status, 503);
    const data = await response.json();
    assert.equal(data.error.code, "BACKEND_UNAVAILABLE");
    assert.equal(data.delivered, undefined);

    global.fetch = async () => Response.json({
      error: { code: "CONTACT_DELIVERY_UNAVAILABLE", message: "Nothing was sent." },
    }, { status: 503 });
    const notConfigured = await contactRoute.POST(new Request("http://localhost/api/contact", {
      method: "POST",
      body: JSON.stringify({
        name: "Analyst",
        email: "analyst@example.com",
        message: "I would like to discuss data analytics.",
      }),
    }));
    assert.equal(notConfigured.status, 503);
    assert.equal((await notConfigured.json()).error.code, "CONTACT_DELIVERY_UNAVAILABLE");
  } finally {
    global.fetch = originalFetch;
  }
});
