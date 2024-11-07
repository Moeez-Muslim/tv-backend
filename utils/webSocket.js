// websocket.js
const WebSocket = require('ws');

let wss;

// Initialize WebSocket server with a specific server instance
function initialize(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
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
