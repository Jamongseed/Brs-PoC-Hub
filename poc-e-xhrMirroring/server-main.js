const express = require("express");
const path = require("path");

const app = express();

const HOOK_ORIGIN = (process.env.POC_E_HOOK_ORIGIN || "http://localhost:4000").replace(/\/$/, "");
const C1 = (process.env.POC_E_C1 || "http://localhost:5001").replace(/\/$/, "");
const C2 = (process.env.POC_E_C2 || "http://localhost:5002").replace(/\/$/, "");
const C3 = (process.env.POC_E_C3 || "http://localhost:5003").replace(/\/$/, "");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => res.type("text/plain").send("ok"));

app.get("/runtime-config.js", (req, res) => {
  const cfg = {
    hookOrigin: HOOK_ORIGIN,
    collectors: {
      c1: `${C1}/mirror`,
      c2: `${C2}/mirror`,
      c3: `${C3}/mirror`,
    },
  };

  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(`window.__POC_E__ = ${JSON.stringify(cfg)};`);
});

// demo API
app.get("/api/data", (req, res) => {
  res.json({
    ok: true,
    from: "main",
    ts: Date.now(),
    message: "PoC-E: XHR target API response (original)",
  });
});

app.post("/api/submit", (req, res) => {
  res.json({
    ok: true,
    from: "main",
    ts: Date.now(),
    received: req.body || null,
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("MAIN listening on", port));