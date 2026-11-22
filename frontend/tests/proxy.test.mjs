import assert from "node:assert/strict";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { parse } from "node:url";
import { buffer } from "node:stream/consumers";
import test from "node:test";
import { transpileConfig } from "next/dist/build/next-config-ts/transpile-config.js";
import { proxyRequest } from "next/dist/server/lib/router-utils/proxy-request.js";

async function listen(server, context) {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });
  return `http://127.0.0.1:${server.address().port}`;
}

test("multipart disease results survive 30 seconds through the configured Next.js proxy", { timeout: 45_000 }, async (context) => {
  const backend = await listen(createServer(async (req, res) => {
    if (req.url === "/api/v1/disease/identify") {
      const body = await buffer(req);
      const form = await new Request(`http://localhost${req.url}`, {
        method: req.method,
        headers: { "content-type": req.headers["content-type"] },
        body,
      }).formData();
      const timer = setTimeout(() => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          status: "possible_matches",
          crop: form.get("crop"),
          image: form.get("image").name,
          imageBytes: form.get("image").size,
        }));
      }, 31_000);
      res.once("close", () => clearTimeout(timer));
    } else {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ status: "needs_clarification", module: "planting" }));
    }
  }), context);

  const previousBackend = process.env.BACKEND_URL;
  // Load the real app config with a public test origin, even in hosted CI.
  process.env.BACKEND_URL = "https://proxy-test.example.invalid";
  let config;
  try {
    const loaded = await transpileConfig({
      nextConfigPath: fileURLToPath(new URL("../next.config.ts", import.meta.url)),
      dir: fileURLToPath(new URL("..", import.meta.url)),
    });
    config = loaded.default ?? loaded;
  } finally {
    if (previousBackend === undefined) delete process.env.BACKEND_URL;
    else process.env.BACKEND_URL = previousBackend;
  }
  assert.deepEqual(await config.rewrites(), [{
    source: "/api/v1/:path*",
    destination: "https://proxy-test.example.invalid/api/v1/:path*",
  }]);

  const frontend = await listen(createServer((req, res) => {
    proxyRequest(req, res, parse(`${backend}${req.url}`, true), undefined, undefined,
      config.experimental.proxyTimeout).catch(() => {
      if (!res.writableEnded) {
        res.statusCode = 500;
        res.end();
      }
    });
  }), context);

  const image = new Uint8Array([1, 2, 3]);
  const form = new FormData();
  form.set("crop", "Maize");
  form.set("image", new Blob([image], { type: "image/png" }), "crop.png");
  const diseaseRequest = fetch(`${frontend}/api/v1/disease/identify`, {
    method: "POST", body: form, signal: AbortSignal.timeout(40_000),
  });
  const planting = await fetch(`${frontend}/api/v1/planting/demo-recommend`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    signal: AbortSignal.timeout(5_000),
  });
  assert.equal(planting.status, 200);
  assert.equal((await planting.json()).module, "planting");
  const disease = await diseaseRequest;
  assert.equal(disease.status, 200);
  assert.deepEqual(await disease.json(), {
    status: "possible_matches", crop: "Maize", image: "crop.png", imageBytes: image.length,
  });
});
