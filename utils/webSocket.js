// websocket.js
const WebSocket = require('ws');

let wss;

// Initialize WebSocket server with a specific server instance
function initialize(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    const proto = req.headers['x-forwarded-proto']; // Check the forwarded protocol

    // Reject the connection if the original request was not over HTTPS
    if (proto !== 'https') {
      ws.close(1008, 'Insecure connection not allowed');
      console.log('Rejected insecure connection');
      return;
    }

    console.log('Device connected to WebSocket');

    ws.on('message', (message) => {
      console.log('Received:', message); // Log messages from the device
    });

    ws.on('close', () => {
      console.log('Device disconnected');
    });
  });
}

// Broadcast a message to all connected clients
function broadcastMessage(data) {
  if (!wss) {
    console.error("WebSocket server is not initialized");
    return;
  }
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

module.exports = { initialize, broadcastMessage };
