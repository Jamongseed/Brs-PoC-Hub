import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

app.use(express.static(path.join(__dirname, "thirdparty")));

app.get("/", (req, res) => {
  res.type("text/plain").send("PoC-H thirdparty server (ok)");
});

app.get("/health", (req, res) => res.send("ok"));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log("THIRDPARTY listening on http://localhost:" + port));