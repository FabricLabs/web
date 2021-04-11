'use strict';

// Configuration
const TEST_CONFIG = require('../settings/test');

// Test
const assert = require('assert');

// Dependencies
const WebSocket = require('ws');

// Types
const HTTPServer = require('../types/server');
const HTTPClient = require('../types/client');

describe('@fabric/http/types/server', function () {
  describe('Server', function () {
    this.timeout(10000);

    it('should expose a constructor', function () {
      assert.equal(typeof HTTPServer, 'function');
    });

    it('should start (and stop) smoothly', async function () {
      let server = new HTTPServer(TEST_CONFIG);

      try {
        await server.start();
      } catch (E) {
        console.error('Could not start:', E);
      }

      try {
        await server.stop();
      } catch (E) {
        console.error('Could not stop:', E);
      }

      assert.ok(server);
      assert.equal(server.status, 'stopped');
    });

    it('can serve a simple GET request', async function () {
      let client = new HTTPClient(TEST_CONFIG);
      let server = new HTTPServer(TEST_CONFIG);
      let result = null;

      try {
        await server.start();
      } catch (exception) {
        assert.fail(exception);
      }

      try {
        result = await client._GET('/');
      } catch (exception) {
        assert.fail(exception);
      }

      try {
        await server.flush();
      } catch (exception) {
        assert.fail(exception);
      }

      try {
        await server.stop();
      } catch (exception) {
        assert.fail(exception);
      }

      // console.log('result:', result);
      assert.ok(result);
    });

    it('can store an object in a collection', async function () {
      let client = new HTTPClient(TEST_CONFIG);
      let server = new HTTPServer(TEST_CONFIG);
      let result = null;
      let posted = null;

      let object = {
        name: 'Sample'
      };

      try {
        await server.start();
      } catch (exception) {
        assert.fail(exception);
      }

      try {
        posted = await client._POST('/examples', object);
      } catch (exception) {
        assert.fail(exception);
      }

      try {
        result = await client._GET('/examples');
      } catch (exception) {
        assert.fail(exception);
      }

      try {
        await server.flush();
      } catch (exception) {
        assert.fail(exception);
      }

      try {
        await server.stop();
      } catch (exception) {
        assert.fail(exception);
      }

      assert.ok(result);
      assert.equal(result.length, 1);
    });

    it('can restore collections after a restart', async function () {
      let client = new HTTPClient(TEST_CONFIG);
      let server = new HTTPServer(TEST_CONFIG);
      let result = null;
      let posted = null;
      let prior = null;

      let object = {
        name: 'Sample'
      };

      try {
        await server.start();
      } catch (exception) {
        assert.fail(exception);
      }

      try {
        prior = await client._GET('/examples');
      } catch (exception) {
        assert.fail(exception);
      }

      try {
        posted = await client._POST('/examples', object);
      } catch (exception) {
        assert.fail(exception);
      }

      try {
        await server.stop();
      } catch (exception) {
        assert.fail(exception);
      }

      try {
        await server.start();
      } catch (exception) {
        assert.fail(exception);
      }

      try {
        result = await client._GET('/examples');
      } catch (exception) {
        assert.fail(exception);
      }

      try {
        await server.flush();
      } catch (exception) {
        assert.fail(exception);
      }

      try {
        await server.stop();
      } catch (exception) {
        assert.fail(exception);
      }

      assert.ok(result);
      assert.equal(prior.length, 0);
      assert.equal(result.length, 1);
    });

    it('can handle a websocket connection', function (done) {
      async function test () {
        let client = new HTTPClient(TEST_CONFIG);
        let server = new HTTPServer(TEST_CONFIG);
        let result = null;
        let posted = null;
        let prior = null;

        let object = {
          name: 'Sample'
        };

        try {
          await server.start();
        } catch (exception) {
          assert.fail(exception);
        }

        let socket = new WebSocket(`ws://${TEST_CONFIG.authority}:${TEST_CONFIG.port}/`);

        socket.on('open', function onOpen () {
          console.log('socket open!');
        });

        socket.on('close', async function onClose () {
          console.log('socket closed!');
        });

        socket.on('message', async function onMessage (msg) {
          let message = null;

          try {
            message = JSON.parse(msg);
          } catch (exception) {
            assert.fail(`Exception: ${exception}`);
          }

          switch (message['@type']) {
            default:
              console.warn('Unhandled message type from WebSocket:', message['@type']);
              break;
            case 'StateUpdate':
              // console.log('got StateUpdate message:', message);
              break;
          }
        });

        try {
          prior = await client._GET('/examples');
        } catch (exception) {
          assert.fail(exception);
        }

        try {
          posted = await client._POST('/examples', object);
        } catch (exception) {
          assert.fail(exception);
        }

        try {
          result = await client._GET('/examples');
        } catch (exception) {
          assert.fail(exception);
        }

        assert.ok(result);
        assert.equal(prior.length, 0);
        assert.equal(result.length, 1);

        setTimeout(async function () {
          await socket.close();
          await server.flush();
          await server.stop();
          done();
        }, 1000);
      }

      test();
    });
  });
});
