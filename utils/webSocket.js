// websocket.js
const WebSocket = require('ws');

let wss;

// Initialize WebSocket server with a specific server instance
function initialize(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    const origin = req.headers.origin;

    // Reject connections that do not come from an expected secure origin
    if (!origin || !origin.startsWith('https://')) {
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
