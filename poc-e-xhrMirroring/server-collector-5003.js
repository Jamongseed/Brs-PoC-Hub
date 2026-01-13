const express = require("express");

const app = express();
app.use(express.json({ limit: "1mb" }));

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-BRS-Mirror, X-POC-Session");
  res.setHeader("Access-Control-Max-Age", "600");
}

app.use((req, res, next) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

app.get("/health", (req, res) => res.type("text/plain").send("ok"));

app.get("/", (req, res) => {
  res.type("text/plain").send("PoC-E Collector C3 running. POST /mirror");
});

app.post("/mirror", (req, res) => {
  console.log("[collector:c3] /mirror", {
    ts: Date.now(),
    ua: req.headers["user-agent"],
    mirror: req.headers["x-brs-mirror"],
    session: req.headers["x-poc-session"],
    body: req.body,
  });

  res.json({ ok: true, collector: "c3", ts: Date.now() });
});

const port = process.env.PORT || 5003;
app.listen(port, () => console.log("COLLECTOR c3 listening on", port));