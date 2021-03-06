'use strict';

const {
  HTTP_SERVER_PORT,
  HTTPS_SERVER_PORT
} = require('../constants');

// trusted community modules
// const fs = require('fs');
const http = require('http');
// const crypto = require('crypto');
// TODO: remove Express entirely...
// NOTE: current blockers include PeerServer...
const express = require('express');
const session = require('express-session');
const parsers = require('body-parser');
const pluralize = require('pluralize');
const stoppable = require('stoppable');

// Core components
const Fabric = require('@fabric/core');
// const App = require('./app');
// const Client = require('./client');
// const Component = require('./component');
const SPA = require('./spa');

// Dependencies
const WebSocket = require('ws');
const PeerServer = require('peer').ExpressPeerServer;

/**
 * The primary web server.
 * @extends Oracle
 */
class HTTPServer extends Fabric.Oracle {
  /**
   * Create an instance of the HTTP server.
   * @param  {Object} [settings={}] Configuration values.
   * @return {HTTPServer} Fully-configured instance of the HTTP server.
   */
  constructor (settings = {}) {
    super(settings);

    this.settings = Object.assign({
      name: 'FabricHTTPServer',
      host: '0.0.0.0',
      path: './stores/server',
      port: HTTP_SERVER_PORT,
      resources: {},
      components: {},
      services: {},
      seed: Math.random(),
      sessions: false,
      verbose: false
    }, settings);

    this.connections = {};
    this.definitions = {};

    this.app = new SPA(Object.assign({}, this.settings, {
      path: './stores/server-application'
    }));

    /* this.compiler = webpack({
      // webpack options
    }); */

    this.wss = null;
    this.http = null;
    this.express = express();
    this.sessions = session({
      resave: true,
      saveUninitialized: false,
      secret: this.settings.seed
    });

    this.coordinator = new PeerServer(this.express, {
      path: '/services/peering'
    });

    this.collections = [];
    this.customRoutes = [];

    return this;
  }

  /**
   * Define a {@link Type} by name.
   * @param  {String} name       Human-friendly name of the type.
   * @param  {Definition} definition Configuration object for the type.
   * @return {HTTPServer}            Instance of the configured server.
   */
  async define (name, definition) {
    let resource = await super.define(name, definition);
    let snapshot = Object.assign({
      names: { plural: pluralize(name) }
    }, resource);

    this.definitions[name] = snapshot;
    this.collections.push(snapshot.routes.list);

    return this;
  }

  trust (source) {
    source.on('message', function (msg) {
      console.log('[RPG:SERVER]', 'trusted source:', source.constructor.name, 'sent message:', msg);
    });
  }

  /**
   * Connection manager for WebSockets.  Called once the handshake is complete.
   * @param  {WebSocket} socket The associated WebSocket.
   * @param  {http.IncomingMessage} request Incoming HTTP request.
   * @return {WebSocket} Returns the connected socket.
   */
  _handleWebSocket (socket, request) {
    // console.log('incoming WebSocket:', socket);
    let server = this;

    // TODO: check security of common defaults for `sec-websocket-key` params
    // Chrome?  Firefox?  Safari?  Opera?  What defaults do they use?
    let buffer = Buffer.from(request.headers['sec-websocket-key'], 'base64');
    let player = new Fabric.State({
      connection: buffer.toString('hex'),
      entropy: buffer.toString('hex')
    });

    // Clean up memory when the connection has been safely closed (ideal case).
    socket.on('close', function () {
      delete server.connections[player['@data'].connection];
    });

    // TODO: set up heartbeat
    // socket.heartbeat = setInterval([...]);

    // TODO: message handler on base class
    socket.on('message', async function handler (msg) {
      console.log('websocket incoming message:', msg);

      // always send a receipt of acknowledgement
      socket.send(JSON.stringify({
        '@type': 'Receipt',
        '@actor': buffer.toString('hex'),
        '@data': msg,
        '@version': 1
      }));

      try {
        let message = JSON.parse(msg);
        let type = message['@type'];

        switch (type) {
          default:
            console.log('[SERVER]', 'unhandled type:', type);
            break;
          case 'GET':
            let answer = await server._GET(message['@data']['path']);
            console.log('answer:', answer);
            return answer;
          case 'POST':
            let link = await server._POST(message['@data']['path'], message['@data']['value']);
            console.log('[SERVER]', 'posted link:', link);
            break;
          case 'PATCH':
            let result = await server._PATCH(message['@data']['path'], message['@data']['value']);
            console.log('[SERVER]', 'patched:', result);
            break;
        }

        server._relayFrom(buffer.toString('hex'), msg);
      } catch (E) {
        console.error('could not parse message:', E);
        console.log('you should disconnect from this peer:', buffer.toString('hex'));
      }
    });

    // set up an oracle, which listens to patches from server
    socket.oracle = server.on('patches', function (patches) {
      console.log('magic oracle patches:', patches);
    });

    // insert connection to library
    server.connections[player['@data'].connection] = socket;
    // server.players[player['@data'].connection] = player;

    // send result
    socket.send(JSON.stringify({
      '@type': 'VerAck',
      '@version': 1
    }));

    socket.send(JSON.stringify({
      '@type': 'Inventory',
      '@parent': this.app.id,
      '@version': 1
    }));

    socket.send(JSON.stringify({
      '@type': 'State',
      '@data': this.app.state,
      '@version': 1
    }));

    return socket;
  }

  _relayFrom (actor, msg) {
    let peers = Object.keys(this.connections).filter(key => {
      return key !== actor;
    });

    this.log(`relaying message from ${actor} to peers:`, peers);

    for (let i = 0; i < peers.length; i++) {
      try {
        this.connections[peers[i]].send(msg);
      } catch (E) {
        console.error('Could not relay to peer:', E);
      }
    }
  }

  /**
   * Special handler for first-page requests.
   * @param {HTTPRequest} req Incoming request.
   * @param {HTTPResponse} res Outgoing response.
   */
  _handleIndexRequest (req, res) {
    console.log('[HTTP:SERVER]', 'Handling request for Index...');
    let html = this.app.render();
    console.log('[HTTP:SERVER]', 'Generated HTML:', html);
    res.set('Content-Type', 'text/html');
    res.send(`${html}`);
  }

  _handleOptionsRequest (req, res) {
    res.send({
      resources: this.definitions
    });
  }

  _logRequest (req, res, next) {
    if (!this.settings.verbose) return next();
    // TODO: switch to this.log
    console.log([
      `${req.host}:${this.settings.port}`,
      req.hostname,
      req.user,
      `"${req.method} ${req.path} HTTP/${req.httpVersion}"`,
      res.statusCode,
      res.getHeader('content-length')
    ].join(' '));
    return next();
  }

  _verifyClient (info, done) {
    console.log('[HTTP:SERVER]', '_verifyClient', info);
    if (!this.settings.sessions) return done();
    this.sessions(info.req, {}, () => {
      // TODO: reject unknown (!info.req.session.identity)
      done();
    });
  }

  /**
   * Add a route manually.
   * @param {String} method  HTTP verb.
   * @param {String} path    HTTP route.
   * @param {Function} handler HTTP handler (req, res, next)
   */
  _addRoute (method, path, handler) {
    if (this.settings.verbosity >= 4) console.log('[HTTP:SERVER]', 'Adding route:', path);
    this.customRoutes.push({ method, path, handler });
  }

  async _handleRoutableRequest (req, res, next) {
    // TODO: check known resources
    // if (~this.resouces.indexOf(req.path)) {
    // ...
    // }

    switch (req.method) {
      default:
        return next();
      case 'GET':
        let mem = await this._GET(req.path);
        if (!mem) return res.status(404).end();
        return res.send(mem);
      case 'PUT':
        let obj = await this._PUT(req.path, req.body);
        return res.send(obj);
      case 'POST':
        let link = await this._POST(req.path, req.body);
        return res.redirect(303, link);
      case 'PATCH':
        let patch = await this._PATCH(req.path, req.body);
        return res.send(patch);
      case 'DELETE':
        await this._DELETE(req.path);
        return res.sendStatus(204);
      case 'OPTIONS':
        return res.send({
          '@type': 'Error',
          '@data': 'Not yet supported.'
        });
    }
  }

  async start () {
    if (this.settings.verbosity >= 4) console.log('[HTTP:SERVER]', 'Starting...');
    const server = this;
    server.status = 'starting';

    for (let name in server.settings.resources) {
      const definition = server.settings.resources[name];
      const resource = await server.define(name, definition);
      // console.log('[AUDIT]', 'Created resource:', resource);
    }

    try {
      await server.app.start();
    } catch (E) {
      console.error('Could not start server app:', E);
    }

    // configure router
    // TODO: defer to an in-memory datastore for requested files
    // NOTE: disable this line to compile on-the-fly
    server.express.use(express.static('assets'));

    // configure sessions & parsers
    server.express.use(server.sessions);
    server.express.use(parsers.urlencoded({ extended: true }));
    server.express.use(parsers.json());
    server.express.use(server._logRequest.bind(server));

    // TODO: render page
    server.express.options('/', server._handleOptionsRequest.bind(server));
    // TODO: enable this route by disabling or moving the static asset handler above
    // NOTE: see `server.express.use(express.static('assets'));`
    server.express.get('/', server._handleIndexRequest.bind(server));

    // TODO: consolidate into earlier loop
    // NOTE: reconcile this against tests...
    for (let name in server.settings.resources) {
      const def = server.settings.resources[name];
      const resource = new Fabric.Resource(def);

      // TODO: re-bind this
      server._addRoute('GET', `${resource.routes.view}`, function (req, res, next) {
        res.format({
          json: function () {
            return next();
          },
          html: function () {
            let output = server.app._loadHTML(resource.render());
            return server.app._renderWith(output);
          }
        });
      });

      // TODO: re-bind this
      server._addRoute('GET', `${resource.routes.list}`, function (req, res, next) {
        res.format({
          json: function () {
            return next();
          },
          html: function () {
            let output = server.app._loadHTML(resource.render());
            return server.app._renderWith(output);
          }
        });
      });
    }

    // handle custom routes.
    // TODO: abolish this garbage in favor of resources.
    for (let i = 0; i < server.customRoutes.length; i++) {
      let route = server.customRoutes[i];
      switch (route.method.toLowerCase()) {
        case 'get':
        case 'put':
        case 'post':
        case 'patch':
        case 'delete':
          server.express[route.method.toLowerCase()](route.path, route.handler);
          break;
      }
    }

    // Attach the internal router
    server.express.get('/*', server._handleRoutableRequest.bind(server));
    server.express.put('/*', server._handleRoutableRequest.bind(server));
    server.express.post('/*', server._handleRoutableRequest.bind(server));
    server.express.patch('/*', server._handleRoutableRequest.bind(server));
    server.express.delete('/*', server._handleRoutableRequest.bind(server));
    server.express.options('/*', server._handleRoutableRequest.bind(server));

    // create the HTTP server
    server.http = stoppable(http.createServer(server.express), 0);

    // attach a WebSocket handler
    this.wss = new WebSocket.Server({
      server: server.http,
      // TODO: validate entire verification chain
      // verifyClient: this._verifyClient.bind(this)
    });

    // set up the WebSocket connection handler
    this.wss.on('connection', this._handleWebSocket.bind(this));

    // TODO: test?
    await server.http.listen(this.settings.port, this.settings.host);

    this.status = 'started';

    // commit to our results
    // await this.commit();

    this.emit('ready');

    // inform the user
    if (this.settings.verbose) {
      let address = server.http.address();
      console.log('address:', address);
      if (!address) console.error('could not get address:', server.http);
      let link = `http://${address.address}:${address.port}`;
      console.log('[FABRIC:WEB]', 'Started!', `Now listening on ${link} ⇐ live URL`);
      // TODO: include somewhere
      // console.log('[FABRIC:WEB]', 'You should consider changing the `host` property in your config,');
      // console.log('[FABRIC:WEB]', 'or set up a TLS server to encrypt traffic to and from this node.');
    }

    if (this.settings.verbosity >= 4) console.log('[HTTP:SERVER]', 'Started!');

    return server;
  }

  async stop () {
    if (this.settings.verbosity >= 4) console.log('[HTTP:SERVER]', 'Stopping...');
    let server = this;
    this.status = 'stopping';

    try {
      await server.http.stop();
    } catch (E) {
      console.error('Could not stop HTTP listener:', E);
    }

    try {
      await server.app.stop();
    } catch (E) {
      console.error('Could not stop server app:', E);
    }

    this.status = 'stopped';
    server.emit('stopped');

    if (this.settings.verbosity >= 4) console.log('[HTTP:SERVER]', 'Stopped!');
    return server;
  }

  async _GET (path) {
    if (this.settings.verbosity >= 4) console.log('[HTTP:SERVER]', 'Handling GET to', path);
    let result = await this.app.store._GET(path);
    if (this.settings.verbosity >= 5) console.log('[HTTP:SERVER]', 'Retrieved:', result);
    if (!result && this.collections.includes(path)) result = [];
    return result;
  }

  async _PUT (path, data) {
    return this.app.store._PUT(path, data);
  }

  async _POST (path, data) {
    if (this.settings.verbosity >= 4) console.log('[HTTP:SERVER]', 'Handling POST to', path, data);
    return this.app.store._POST(path, data);
  }

  async _PATCH (path, data) {
    if (this.settings.verbosity >= 4) console.log('[HTTP:SERVER]', 'Handling PATCH to', path, data);
    return this.app.store._PATCH(path, data);
  }

  async _DELETE (path) {
    if (this.settings.verbosity >= 4) console.log('[HTTP:SERVER]', 'Handling DELETE to', path);
    return this.app.store._DELETE(path, data);
  }
}

module.exports = HTTPServer;
