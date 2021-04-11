'use strict';

require('debug-trace')({ always: true });

const assert = require('assert');

// Web Client
const HTTPClient = require('../types/client');
const HTTPServer = require('../types/server');

const TEST_HOST = 'example.com';
const TEST_CONFIG = require('../settings/test');

const authority = new HTTPServer(TEST_CONFIG);

describe('@fabric/http/types/client', function () {
  describe('Client', function () {
    it('should expose a constructor', function () {
      assert.equal(typeof HTTPClient, 'function');
    });

    it('can retrieve content from a local server', async function () {
      const server = new HTTPServer(TEST_CONFIG);
      const client = new HTTPClient(TEST_CONFIG);
      await server.start();

      const result = await client._GET('/');
      await server.stop();

      // console.log('result:', result.toString());
      assert.ok(result);
    });

    xit('can post content to a local server', async function () {
      const server = new HTTPServer(TEST_CONFIG);
      const client = new HTTPClient(TEST_CONFIG);
      await server.start();

      const before = await client._GET('/examples');
      const result = await client._POST('/examples', { id: 'test', foo: 'bar' });
      const after = await client._GET('/examples');
      await server.stop();

      assert.deepEqual(before, []);
      assert.deepEqual(after, [{ id: 'test', foo: 'bar' }]);
      assert.ok(result);
    });

    it('can create content on a local server', async function () {
      const server = new HTTPServer(TEST_CONFIG);
      const client = new HTTPClient(TEST_CONFIG);
      await server.start();

      const before = await client._GET('/examples/test');
      const result = await client._PUT('/examples/test', { id: 'test', foo: 'qux' });
      const after = await client._GET('/examples/test');
      await server.stop();

      // TODO: define 404 behavior
      // assert.deepEqual(before, null);
      assert.deepEqual(after, { id: 'test', foo: 'qux' });
      assert.ok(result);
    });

    it('can update content on a local server', async function () {
      const server = new HTTPServer(TEST_CONFIG);
      const client = new HTTPClient(TEST_CONFIG);
      await server.start();

      const before = await client._GET('/examples/test');
      const during = await client._PUT('/examples/test', { id: 'test', foo: 'qux' });
      const result = await client._PATCH('/examples/test', { foo: 'baz' });
      const after = await client._GET('/examples/test');
      await server.stop();

      // TODO: define 404 behavior
      // assert.deepEqual(before, null);
      assert.deepEqual(during, { id: 'test', foo: 'qux' });
      assert.deepEqual(after, { id: 'test', foo: 'baz' });
      assert.ok(result);
    });

    xit('can delete content on a local server', async function () {
      const server = new HTTPServer(TEST_CONFIG);
      let client = new HTTPClient(TEST_CONFIG);
      await server.start();
      let before = await client._GET('/examples/test');
      let result = await client._DELETE('/examples/test');
      let after = await client._GET('/examples/test');
      await server.stop();
      assert.deepEqual(before, { id: 'test', foo: 'baz' });
      assert.deepEqual(after, {});
      assert.equal(result, null);
    });

    xit('can retrieve content from the legacy web', async function () {
      let client = new HTTPClient({ authority: TEST_HOST, secure: false });
      let result = await client._GET('/');
      assert.ok(result);
    });

    xit('can post content to the legacy web', async function () {
      let client = new HTTPClient({ authority: TEST_HOST, secure: false });
      let result = await client._POST('/examples', {
        id: 'test',
        foo: 'bar'
      });
      assert.ok(result);
    });

    xit('can create content on the legacy web', async function () {
      let client = new HTTPClient({ authority: TEST_HOST, secure: false });
      let result = await client._PUT('/examples/test', {
        id: 'test',
        foo: 'qux'
      });
      assert.ok(result);
    });

    xit('can update content on the legacy web', async function () {
      let client = new HTTPClient({ authority: TEST_HOST, secure: false });
      let result = await client._PATCH('/examples/test', {
        foo: 'baz'
      });
      assert.ok(result);
    });

    xit('can delete content on the legacy web', async function () {
      let client = new HTTPClient({ authority: TEST_HOST, secure: false });
      let result = await client._DELETE('/examples/test');
      assert.ok(result);
    });

    xit('can crawl an HTML page', async function () {
      let client = new HTTPClient({ authority: TEST_HOST, secure: false });
      let result = await client.crawl(`http://${TEST_HOST}`);
      assert.ok(result);
      assert.ok(result.metadata);
      assert.ok(result.content);
    });
  });
});
