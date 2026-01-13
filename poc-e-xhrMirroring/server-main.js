const express = require("express");
const path = require("path");
const multer = require("multer");

const app = express();

const HOOK_ORIGIN = (process.env.POC_E_HOOK_ORIGIN || "http://localhost:4000").replace(/\/$/, "");
const C1 = (process.env.POC_E_C1 || "http://localhost:5001").replace(/\/$/, "");
const C2 = (process.env.POC_E_C2 || "http://localhost:5002").replace(/\/$/, "");
const C3 = (process.env.POC_E_C3 || "http://localhost:5003").replace(/\/$/, "");

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

app.get("/health", (req, res) => res.type("text/plain").send("ok"));

app.get("/runtime-config.js", (req, res) => {
  const cfg = {
    hookOrigin: HOOK_ORIGIN,
    collectors: {
      c1: `${C1}/mirror`,
      c2: `${C2}/mirror`,
      c3: `${C3}/mirror`,
    },
  };
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(`window.__POC_E__ = ${JSON.stringify(cfg)};`);
});

app.get("/api/products", (req, res) => {
  const { category = "all", sort = "popular", page = "1" } = req.query || {};
  res.json({
    ok: true,
    from: "main",
    route: "/api/products",
    ts: Date.now(),
    query: { category, sort, page },
    items: [
      { id: "p-101", name: "Demo Shoes", price: 59000, category: "shoes" },
      { id: "p-202", name: "Demo Tops", price: 29000, category: "tops" },
    ],
  });
});

app.post("/api/cart/add", (req, res) => {
  res.json({
    ok: true,
    from: "main",
    route: "/api/cart/add",
    ts: Date.now(),
    received: req.body || null,
  });
});

app.post("/api/coupon/apply", (req, res) => {
  res.json({
    ok: true,
    from: "main",
    route: "/api/coupon/apply",
    ts: Date.now(),
    received: req.body || null,
    applied: true,
    discountPercent: 10,
  });
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  const file = req.file || null;
  res.json({
    ok: true,
    from: "main",
    route: "/api/upload",
    ts: Date.now(),
    meta: req.body && req.body.meta ? req.body.meta : null,
    file: file
      ? { originalname: file.originalname, mimetype: file.mimetype, size: file.size }
      : null,
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("MAIN listening on", port));