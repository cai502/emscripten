const WebSocket = require('ws');
const client = new WebSocket('ws://localhost:8080/');

client.on('error', (error) => {
  console.log(`Connection Error: ${error.toString()}`);
});

client.on('close', () => {
  console.log('Connection Closed');
});

client.on('open', () => {
  console.log('WebSocket Client Connected');

  client.send(JSON.stringify({
    type: 'fetchall',
  }));
});

client.on('message', (message) => {
  console.log(`Received: ${message}`);
});
