import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use((req, res, next) => {
  // PoC Hub detail 페이지에서 iframe embed가 가능하도록 허용
  res.setHeader("Content-Security-Policy", "frame-ancestors *");
  next();
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (req, res) => res.send("ok"));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("[poc-AI-test] listening on", port));