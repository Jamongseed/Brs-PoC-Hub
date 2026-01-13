const express = require("express");
const path = require("path");

const app = express();

app.use(express.static(path.join(__dirname, "hook")));

app.get("/health", (req, res) => res.type("text/plain").send("ok"));

app.get("/", (req, res) => {
  res
    .type("text/plain")
    .send("PoC-E HOOK server is running. Try /xhr-hook.js");
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log("HOOK listening on", port));