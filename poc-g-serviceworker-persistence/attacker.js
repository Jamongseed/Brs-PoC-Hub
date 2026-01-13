import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.static(path.join(__dirname, "public-attacker")));

app.get("/health", (req, res) => res.send("ok"));
 
app.get("/", (req, res) => {
  res
    .type("text/plain")
    .send("PoC-G attacker server is running. Try /sdk_sw_register.js or other static assets.");
});

const port = process.env.PORT || process.env.ATTACKER_PORT || 4000;
app.listen(port, () => console.log("[attacker] listening on", port));