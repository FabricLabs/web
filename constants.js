'use strict';

// engine
const TICK_INTERVAL = 1000;
const SESSION_SEED = '79084a7963fc1761e8f6871d6aa704c4922316030af4aa5a076dde35fc0b6857';

// http
const HTTP_CLIENT_PORT = 80;
const HTTP_SERVER_PORT = 9999;

// https
const HTTPS_CLIENT_PORT = 443;
const HTTPS_SERVER_PORT = 19999;

// websockets
const MAXIMUM_PING = 10000;
const WEBSOCKET_KEEPALIVE = 600000; // 10 minutes

// browser / dom
const BROWSER_TARGET = '#browser-content';

// exports
module.exports = {
  TICK_INTERVAL,
  SESSION_SEED,
  HTTP_CLIENT_PORT,
  HTTP_SERVER_PORT,
  HTTPS_CLIENT_PORT,
  HTTPS_SERVER_PORT,
  MAXIMUM_PING,
  WEBSOCKET_KEEPALIVE,
  BROWSER_TARGET
};
