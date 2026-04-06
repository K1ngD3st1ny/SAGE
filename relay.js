const fs = require("fs");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

const STREAM_SECRET = "sage_secure_link";
const STREAM_PORT = 8081; // FFmpeg pushes here
const WEBSOCKET_PORT = 8082; // Website connects here
const WEB_PORT = 8080; // Dashboard served here

// 0. Static Web Server (Serves the dashboard)
const webServer = http.createServer(function (req, res) {
  let filePath;
  if (req.url === "/" || req.url === "/index.html") {
    filePath = path.join(__dirname, "index.html");
  } else {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }
  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(500);
      res.end("Internal Server Error");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(data);
  });
});
webServer.listen(WEB_PORT);

// 1. WebSocket Server (Sends video to browser)
const socketServer = new WebSocket.Server({
  port: WEBSOCKET_PORT,
  perMessageDeflate: false,
});
socketServer.connectionCount = 0;

socketServer.on("connection", function (socket, upgradeReq) {
  socketServer.connectionCount++;
  console.log(
    `[SAGE] New Ground Station Connected. Total: ${socketServer.connectionCount}`,
  );
  socket.on("close", function (code, message) {
    socketServer.connectionCount--;
    console.log(`[SAGE] Disconnected. Total: ${socketServer.connectionCount}`);
  });
});

socketServer.broadcast = function (data) {
  socketServer.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

// 2. HTTP Server (Receives video from FFmpeg)
const streamServer = http.createServer(function (request, response) {
  const params = request.url.substr(1).split("/");

  if (params[0] !== STREAM_SECRET) {
    console.log("[SAGE] Unauthorized Stream Attempt Refused.");
    response.end();
    return;
  }

  response.connection.setTimeout(0);
  console.log(`[SAGE] Drone Video Feed Established on Port ${STREAM_PORT}`);

  request.on("data", function (data) {
    socketServer.broadcast(data);
  });
});

streamServer.listen(STREAM_PORT);
console.log(`[SAGE SYSTEM ACTIVE]`);
console.log(`   Dashboard:    http://localhost:${WEB_PORT}/`);
console.log(
  `   Stream Input: http://localhost:${STREAM_PORT}/${STREAM_SECRET}`,
);
console.log(`   WebSocket:    ws://localhost:${WEBSOCKET_PORT}/`);
console.log(
  `\n[SAGE] Waiting for Raspberry Pi camera feed...`,
);
console.log(`[SAGE] Run this on the Raspberry Pi:`);
console.log(
  `   rpicam-vid -t 0 --width 1280 --height 720 --framerate 30 --codec h264 --inline -o - | \\`,
);
console.log(
  `     ffmpeg -i - -f mpegts -codec:v mpeg1video -s 960x540 -b:v 1500k -bf 0 http://<YOUR_PC_IP>:${STREAM_PORT}/${STREAM_SECRET}`,
);
