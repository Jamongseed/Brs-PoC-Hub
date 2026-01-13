import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

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
      "  /health\n"
    );
});

app.get("/health", (req, res) => res.send("ok"));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log("THIRDPARTY listening on http://localhost:" + port));