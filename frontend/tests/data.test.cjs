const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

// Use TypeScript's installed transpiler so these deterministic core tests don't require a bundler.
require.extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  module._compile(compiled, filename);
};
const core = require(path.join(__dirname, "..", "lib", "data.ts"));

test("CSV parser handles quoted commas, CRLF, BOM and blank cells", () => {
  const ds = core.parseCSV('\uFEFFname,notes,amount\r\nA,"hello, world",12\r\nB,,4\r\n');
  assert.deepEqual(ds.columns, ["name", "notes", "amount"]);
  assert.equal(ds.rows[0].notes, "hello, world");
  assert.equal(ds.rows[0].amount, 12);
  assert.equal(ds.rows[1].notes, null);
});

test("CSV parser rejects malformed quoting and row caps", () => {
  assert.throws(() => core.parseCSV('a,b\n1,"no close'), /unclosed quoted field/i);
  assert.throws(() => core.parseCSV('header\n'), /header row and at least one data row/i);
  assert.throws(() => core.parseCSV("a,b\n1\n"), /inconsistent column counts/i);
});

test("profile computes missing values, duplicates, numeric stats and heuristic score", () => {
  const ds = core.parseCSV("group,value\na,2\na,2\nb,4\nc,\n");
  const p = core.profileDataset(ds);
  assert.equal(p.rows, 4);
  assert.equal(p.columns, 2);
  assert.equal(p.missing, 1);
  assert.equal(p.duplicates, 1);
  const numeric = p.columnProfiles.find(c => c.name === "value");
  assert.equal(numeric.mean, 8 / 3);
  assert.equal(numeric.min, 2);
  assert.equal(numeric.max, 4);
  assert.ok(p.quality >= 0 && p.quality <= 100);
});

test("cleaning functions are deterministic for trim, duplicate, drop-missing and fill-missing", () => {
  const ds = core.parseCSV("name,value\n A ,1\nA,1\nB,\n");
  assert.equal(core.cleanDataset(ds, "trim").rows[0].name, "A");
  assert.equal(core.cleanDataset(ds, "drop-duplicates").rows.length, 2);
  assert.equal(core.cleanDataset(ds, "drop-missing").rows.length, 2);
  assert.equal(core.cleanDataset(ds, "fill-missing").rows[2].value, "Unknown");
});

test("query helper returns local data and computes grouped counts", () => {
  const ds = core.parseCSV("region,amount\nEast,12\nWest,20\nEast,7\n");
  const result = core.runSafeQuery(ds, "SELECT region, COUNT(*) AS count FROM dataset GROUP BY region");
  assert.deepEqual(result.columns, ["region", "count"]);
  assert.deepEqual(result.rows, [{ region: "East", count: 2 }, { region: "West", count: 1 }]);
  assert.equal(core.runSafeQuery(ds, "SELECT * FROM dataset LIMIT 1").rows.length, 1);
  assert.equal(core.runSafeQuery(ds, "SELECT COUNT(*) AS total FROM data").rows[0].total, 3);
  assert.throws(() => core.runSafeQuery(ds, "SELECT region FROM dataset WHERE region = 'East'"), /unsupported query shape/i);
});

test("query helper blocks write, multi-statement, file/network and extension attempts", () => {
  const ds = core.parseCSV("value\n1\n");
  for (const q of ["DELETE FROM dataset", "SELECT * FROM dataset; DROP TABLE dataset", "SELECT * FROM read_csv('secret.csv')", "COPY dataset TO '/tmp/out.csv'", "INSTALL httpfs", "SELECT * FROM dataset JOIN read_parquet('x') x ON true"]) {
    assert.throws(() => core.runSafeQuery(ds, q), undefined, q);
  }
});

test("CSV export escapes spreadsheet formula-like text but preserves negative numeric values", () => {
  const ds = { name: "test.csv", columns: ["label", "number", "formula"], rows: [{ label: "-danger", number: -4, formula: "=1+1" }], updatedAt: "2026-01-01T00:00:00.000Z", source: "local-change" };
  const csv = core.toCSV(ds);
  assert.match(csv, /'\-danger/);
  assert.match(csv, /,-4,/);
  assert.match(csv, /'=1\+1/);
});
