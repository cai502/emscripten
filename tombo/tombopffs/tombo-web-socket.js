const Events = require('minivents');
const msgpack = require('msgpack-lite');

class TomboWebSocket {
  constructor(url, protocol) {
    Events(this);
    const ws = this.ws = new WebSocket(url, protocol);
    ws.onopen = () => {
      console.groupCollapsed('TomboWebSocket.onopen:');
      console.log('url');
      console.log(url);
      console.log('protocol');
      console.log(protocol);
      console.groupEnd();
      this.emit('open');
    };
    ws.onerror = (error) => {
      console.groupCollapsed('TomboWebSocket.onerror:');
      console.log(error);
      console.groupEnd();
      this.emit('error', error);
    };
    ws.onclose = (e) => {
      this.emit('close', e);
    };
    ws.onmessage = (msg) => {
      console.log(msg.data);
      const data = msgpack.decode(msg.data);
      this.emit('message', data);
    };
  }
  send(msg) {
    this.ws.send(msgpack.encode(msg));
  }
  close() {
    this.ws.close.apply(this.ws, arguments);
  }
}

module.exports = TomboWebSocket;
