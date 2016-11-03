const WebSocket = require('ws');
const msgpack = require('msgpack-lite');
const client = new WebSocket('ws://localhost:8080/');

client.on('error', (error) => {
  console.log(`Connection Error: ${error.toString()}`);
});

client.on('close', () => {
  console.log('Connection Closed');
});

client.on('open', () => {
  console.log('WebSocket Client Connected');

  client.send(msgpack.encode({
    type: 'fetch-all',
    request_id: 'test-fetch-all'
  }));
});

client.on('message', (encoded_message) => {
  const message = msgpack.decode(encoded_message);
  console.log('Received');
  console.log(message);
});
