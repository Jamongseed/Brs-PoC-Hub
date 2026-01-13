import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const THIRD_ORIGIN = (process.env.POC_F_THIRD_ORIGIN || "http://localhost:4000").replace(/\/$/, "");

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "server-site", "public")));

app.get("/health", (req, res) => res.type("text/plain").send("ok"));

app.get("/runtime-config.js", (req, res) => {
  const cfg = {
    thirdOrigin: THIRD_ORIGIN,
    collectUrl: `${THIRD_ORIGIN}/collect`,
  };

  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(`window.__POC_F__ = ${JSON.stringify(cfg)};`);
});

app.post("/login", (req, res) => {
  const u = req.body.u ?? "";
  const p = req.body.p ?? "";
  res.type("text").send(
    `OK /login\nu=${u}\np=${p.slice(0, 2)}***\n`
  );
});

const PORT = 3000;
app.listen(process.env.PORT || PORT, () => console.log(`Main listening on ${process.env.PORT || PORT}`));