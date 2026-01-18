import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const THIRD_ORIGIN = (process.env.POC_H_THIRD_ORIGIN || "http://localhost:4000").replace(/\/$/, "");
const COLLECTOR_WS = (process.env.POC_H_COLLECTOR_WS || "ws://localhost:5000").replace(/\/$/, "");

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (req, res) => res.send("ok"));

app.get("/runtime-config.js", (req, res) => {
  const cfg = {
    thirdOrigin: THIRD_ORIGIN,
    injectedUrl: `${THIRD_ORIGIN}/loader.js`,
    loaderUrl: `${THIRD_ORIGIN}/loader.js`,
    payloadB64Url: `${THIRD_ORIGIN}/payload.b64`,
    mirrorUrl: `${THIRD_ORIGIN}/mirror`,
    collectorWs: COLLECTOR_WS
  };

  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(`window.__POC_H__ = ${JSON.stringify(cfg)};`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[poc-h/main] listening on ${PORT}`));