import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadTypeScript(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}
const { getBackendUrl } = await loadTypeScript("../lib/backend-config.ts");
const { readApiJson } = await loadTypeScript("../lib/api.ts");

test("Vercel requires a public backend origin while local development accepts localhost", () => {
  assert.equal(getBackendUrl({ BACKEND_URL: "http://localhost:8000/" }), "http://localhost:8000");
  assert.equal(getBackendUrl({}), undefined);
  for (const BACKEND_URL of [undefined, "", "http://localhost:8000", "https://localhost", "https://127.0.0.1", "https://10.0.0.2", "https://192.168.1.10", "https://172.16.0.2", "https://[::1]", "https://[fd00::1]"]) {
    assert.throws(() => getBackendUrl({ VERCEL: "1", BACKEND_URL }), /BACKEND_URL/);
  }
  assert.equal(getBackendUrl({ VERCEL: "1", BACKEND_URL: " https://api.example.com/ " }), "https://api.example.com");
});

test("backend configuration rejects duplicated API paths, credentials and frontend loops", () => {
  for (const BACKEND_URL of ["not a URL", "https://api.example.com/api/v1", "https://user:secret@api.example.com", "https://api.example.com?token=secret", "https://api.example.com#fragment"]) {
    assert.throws(() => getBackendUrl({ BACKEND_URL }), /BACKEND_URL/);
  }
  assert.throws(() => getBackendUrl({ VERCEL: "1", VERCEL_PROJECT_PRODUCTION_URL: "front.example.com", BACKEND_URL: "https://front.example.com" }), /frontend/);
});

test("HTML and text proxy errors produce a safe service message", async () => {
  for (const status of [200, 404, 502]) {
    for (const body of ["<!DOCTYPE html><html>Not found</html>", "DNS_HOSTNAME_RESOLVED_PRIVATE"]) {
      await assert.rejects(readApiJson(new Response(body, { status }), "Invalid credentials"),
        { message: "The account service is unavailable. Please try again later." });
    }
  }
});

test("FastAPI errors and successful account JSON retain their meaning", async () => {
  const account = { id: 1, name: "Test farmer", role: "user" };
  assert.deepEqual(await readApiJson(Response.json(account, { status: 201 }), "Invalid credentials"), account);
  await assert.rejects(readApiJson(Response.json({ detail: "Incorrect email or password." }, { status: 401 }), "Invalid credentials"),
    { message: "Incorrect email or password." });
  await assert.rejects(readApiJson(Response.json({ detail: [{ msg: "Required field" }] }, { status: 422 }), "Check the fields"),
    { message: "Check the fields" });
});
