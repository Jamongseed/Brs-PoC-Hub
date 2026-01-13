import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const ATTACKER_ORIGIN = (process.env.POC_G_ATTACKER_ORIGIN || "http://localhost:4000").replace(/\/$/, "");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public-victim")));

app.get("/health", (req, res) => res.send("ok"));

app.get("/runtime-config.js", (req, res) => {
  const cfg = {
    attackerOrigin: ATTACKER_ORIGIN,
    sdkUrl: `${ATTACKER_ORIGIN}/sdk_sw_register.js`,
  };
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(`window.__POC_G__ = ${JSON.stringify(cfg)};`);
});

app.get("/api/account", (req, res) => {
  const payload = {
    user: "jamong",
    plan: "FREE",
    balance: 100,
    serverTs: Date.now()
  };

  console.log("[victim] /api/account ->", payload);
  res.setHeader("Cache-Control", "no-store");
  res.json(payload);
});

app.get("/api/account-raw", (req, res) => {
  const payload = {
    user: "jamong",
    plan: "FREE",
    balance: 100,
    serverTs: Date.now()
  };

  console.log("[victim] /api/account-raw ->", payload);
  res.setHeader("Cache-Control", "no-store");
  res.json(payload);
});

const port = process.env.PORT || process.env.VICTIM_PORT || 3000;
app.listen(port, () => console.log("[victim] listening on", port));