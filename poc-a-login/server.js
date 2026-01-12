import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => res.send("ok"));

app.get("/poc-config.js", (req, res) => {
  const thirdpartyOrigin = process.env.THIRDPARTY_ORIGIN || "http://localhost:4000";
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.send(`window.__POC_THIRDPARTY_ORIGIN__ = ${JSON.stringify(thirdpartyOrigin)};`);
});

app.post("/collect", (req, res) => {
  console.log("[collect] submit", {
    ip: req.ip,
    ua: (req.get("user-agent") || "").slice(0, 120),
    ref: (req.get("referer") || "").slice(0, 200),
    keys: Object.keys(req.body || {}),
  });

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Received</title></head>
<body>
  <h1>Received</h1>
  <p>PoC endpoint. No credentials are stored.</p>
  <a href="/">Back</a>
</body>
</html>
  `);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("poc-a listening on", port));