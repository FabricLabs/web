'use strict';

require('debug-trace')({ always: true });

const assert = require('assert');

// Web Client
const HTTPClient = require('../types/client');
const HTTPServer = require('../types/server');
const HTTPBridge = require('../types/server');

const TEST_CONFIG = require('../settings/test');

const authority = new HTTPServer(TEST_CONFIG);

describe('@fabric/http/types/bridge', function () {
  describe('Bridge', function () {
    it('should expose a constructor', function () {
      assert.equal(typeof HTTPBridge, 'function');
    });

    xit('can connect to a spawned server', async function () {
      const server = new HTTPServer(TEST_CONFIG);
      const bridge = new HTTPBridge(TEST_CONFIG);

      await server.start();
      // await bridge.start();

      bridge.on('connected', async function () {
        await bridge.stop();
        await server.stop();

        assert.ok(bridge);
      });
    });
  });
});