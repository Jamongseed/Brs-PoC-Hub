import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-POC-Session");
  res.setHeader("Access-Control-Max-Age", "600");
}

app.use((req, res, next) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

app.use(express.static(path.join(__dirname, "server-thirdparty", "public")));
app.use(express.urlencoded({ extended: true }));
 
app.get("/health", (req, res) => res.type("text/plain").send("ok"));

app.post("/collect", (req, res) => {
  console.log("Collected from submit-hook:", req.body);
  res.sendStatus(200);
});

const PORT = 4000;
app.listen(process.env.PORT || PORT, () => console.log(`Third-party server running on http://localhost:${PORT}`));