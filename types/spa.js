'use strict';

const {
  BROWSER_TARGET
} = require('../constants');

const config = {
  title: '@fabric/http',
  synopsis: 'Making beautiful apps a breeze.',
  description: 'Legacy web support for Fabric.',
  handle: 'html',
  language: 'en',
  components: {},
  offline: false
};

// core dependencies
const crypto = require('crypto');
const page = require('page');
const pluralize = require('pluralize');

// Requisite Types
const App = require('./app');
const Bridge = require('./bridge');
const Browser = require('./browser');
const Router = require('./router');

// Fabric Types
const Message = require('@fabric/core/types/message');
const Circuit = require('@fabric/core/types/circuit');
const Resource = require('@fabric/core/types/resource');
const Store = require('@fabric/core/types/store');

/**
 * Fully-managed HTML application.
 * @extends App
 */
class SPA extends App {
  /**
   * Create a single-page app.
   * @param  {Object} [settings={}] Settings for the application.
   * @param  {String} [settings.name="@fabric/maki"] Name of the app.
   * @param  {Boolean} [settings.offline=true] Hint offline mode to browsers.
   * @param  {Object} [components] Map of Web Components for the application to utilize.
   * @return {App}               Instance of the application.
   */
  constructor (settings = {}) {
    super(settings);

    // Assist in debugging
    if (settings.verbosity >= 4) console.log('[WEB:SPA]', 'Creating instance with constructor settings:', settings);

    // Assign defaults
    this.settings = Object.assign({
      name: "@fabric/maki",
      authority: 'localhost.localdomain:9999',
      persistent: true,
      // TODO: enable by default?
      websockets: false,
      secure: false, // TODO: default to secure (i.e., TLS on all connections)
      components: {}
    }, config, settings);

    // TODO: enable Web Worker integration
    /* this.worker = new Worker('./worker', {
      type: 'module'
    }); */

    this.bridge = new Bridge(this.settings);
    this.router = new Router(this.settings);
    this.store = new Store(this.settings);

    this.routes = [];
    this.bindings = {
      'click': this._handleClick.bind(this)
    };

    return this;
  }

  // TODO: reconcile with super(), document use of constructor vs. CustomElements
  init (settings = {}) {
    if (settings && settings.verbosity >= 5) console.trace('[WEB:SPA]', 'Calling init() with settings:', settings);
    this.bridge = new Bridge(this.settings);
    this.browser = new Browser(this.settings);
    this.store = new Store(Object.assign({}, this.settings, { path: './stores/spa' }));
    this.settings = Object.assign({}, this.settings, settings);
    this._state = (window.app && window.app.state) ? window.app.state : {};
  }

  get handler () {
    return page;
  }

  set state (state) {
    if (!state) throw new Error('State must be provided.');
    this._state = state;
    this._redraw(this._state);
  }

  get state () {
    return Object.assign({}, this._state);
  }

  define (name, definition) {
    if (this.settings.verbosity >= 5) console.trace('[WEB:SPA]', 'Defining for SPA:', name, definition);
    // TODO: check for async compatibility in HTTP.App
    super.define(name, definition);

    let resource = new Resource(definition);
    let snapshot = Object.assign({
      name: name,
      names: { plural: pluralize(name) }
    }, resource);

    let address = snapshot.routes.list.split('/')[1];

    // TODO: reconcile with server.define
    // if (this.settings.verbosity >= 5) console.log('[WEB:SPA]', 'Defining for SPA:', name, definition);
    let route = this.router.define(name, definition);
    // if (this.settings.verbosity >= 5) console.log('[WEB:SPA]', 'Defined:', name, route);
    this.types.state[name] = definition;
    this.resources[name] = definition;

    this.state[address] = {};

    return this.resources[name];
  }

  // TODO: document this vs. @fabric/core/types/app
  _defineElement (handle, definition) {
    this.components[handle] = definition;

    // TODO: custom elements polyfill
    if (typeof customElements !== 'undefined') {
      try {
        customElements.define(handle, definition);
      } catch (E) {
        console.error('[MAKI:APP]', 'Could not define Custom Element:', E, handle, definition);
      }
    }
  }

  register () {
    return this;
  }

  route (path) {
    for (let i = 0; i < this.routes.length; i++) {
      console.log('[MAKI:SPA]', 'testing route:', this.routes[i]);
    }
  }

  disconnectedCallback () {
    for (let name in this._boundFunctions) {
      this.removeEventListener('message', this._boundFunctions[name]);
    }
  }

  _handleClick (e) {
    console.log('SPA CLICK EVENT:', e);
  }

  async _handleNavigation (ctx) {
    let address = await this.browser.route(ctx.path);
    let element = document.createElement(address.route.component);

    this.target = element;

    this.browser._setAddress(ctx.path);
    this.browser._setElement(element);

    element.state = (typeof window !== 'undefined' && window.app) ? window.app.state : this.state; 
  }

  /* async _loadIndex (ctx) {
    console.log('[WEB:SPA]','loading index, app:', this);
    console.log('[WEB:SPA]','loading index, app.settings:', this.settings);
    console.log('[WEB:SPA]','loading index, ctx:', ctx);
    console.log('[WEB:SPA]','all components:', Object.keys(this.components));
    console.log('[WEB:SPA]','Seeking for index:', this.settings.components.index);
    let address = await this.browser.route(ctx.path);
    let Index = this.components[this.settings.components.index];
    if (!Index) throw new Error(`Could not find component: ${this.settings.components.index}`);
    let resource = new Index(this.state);
    let content = resource.render();
    // this._setTitle(resource.name);
    // this._renderContent(content);

    let element = document.createElement(address.route.component);
    console.log('created element:', element);

    this.target = element;

    this.browser._setAddress(ctx.path);
    this.browser._setElement(element);

    for (let name in this.state) {
      element.state[name] = this.state[name];
    }
  } */

  _setTitle (title) {
    this.title = `${title} &middot; ${this.settings.name}`;
    document.querySelector('title').innerHTML = this.title;
  }

  _redraw (state = {}) {
    if (!state) state = this.state;
    // if (this.settings && this.settings.verbosity >= 5) console.log('[HTTP:SPA]', 'redrawing with state:', state);
    this.innerHTML = this._getInnerHTML(state);
    // this.init(state);
    return this;
  }

  _renderContent (html) {
    // TODO: enable multi-view composition?
    // NOTE: this means to iterate over all bound targets, instead of the first one...
    if (!this.target) this.target = document.querySelector(BROWSER_TARGET);
    if (!this.target) return console.log('COULD NOT ACQUIRE TARGET:', document);
    this.target.innerHTML = html;
    return this.target;
  }

  _renderWith (html) {
    let hash = crypto.createHash('sha256').update(html).digest('hex');

    // TODO: move CSS to inline from webpack
    return `<!DOCTYPE html>
<html lang="${this.settings.language}"${(this.settings.offline) ? 'manifest="cache.manifest"' : ''}>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>${this.title}</title>
  <!-- <link rel="manifest" href="/manifest.json"> -->
  <link rel="stylesheet" type="text/css" href="/styles/screen.css" />
  <link rel="stylesheet" type="text/css" href="/styles/semantic.css" />
</head>
<body data-bind="${hash}">${html}</body>
<script type="text/javascript" src="/scripts/jquery-3.4.1.js"></script>
<script type="text/javascript" src="/scripts/semantic.js"></script>
</html>`;
  }

  /**
   * Return a string of HTML for the application.
   * @return {String} Fully-rendered HTML document.
   */
  render () {
    let body = super.render();
    // TODO: define Custom Element
    // let app = SPA.toString('base64');
    // definition = customElements.define(name, SPA);

    return this._renderWith(body);
  }

  async stop () {
    if (this.settings.verbosity >= 4) console.log('[HTTP:SPA]', 'Stopping...');

    try {
      if (this.settings.verbosity >= 5) console.log('[HTTP:SPA]', 'Stopping bridge...');
      await this.bridge.stop();
    } catch (E) {
      console.error('Could not stop SPA bridge:', E);
    }

    try {
      if (this.settings.verbosity >= 5) console.log('[HTTP:SPA]', 'Stopping router...');
      await this.router.stop();
    } catch (E) {
      console.error('Could not stop SPA router:', E);
    }

    try {
      if (this.settings.verbosity >= 5) console.log('[HTTP:SPA]', 'Stopping store...');
      await this.store.stop();
    } catch (E) {
      console.error('Could not stop SPA store:', E);
    }

    // await super.stop();
    if (this.settings.verbosity >= 4) console.log('[HTTP:SPA]', 'Stopped!');
    return this;
  }

  async _handleBridgeMessage (msg) {
    if (this.settings.verbosity >= 4) console.log('[HTTP:SPA]', 'Handling message from Bridge:', msg);
    if (!msg.type && msg['@type']) msg.type = msg['@type'];
    if (!msg.data && msg['@data']) msg.data = msg['@data'];

    switch (msg.type) {
      default:
        console.warn('[HTTP:SPA]', 'Unhandled message type (origin: bridge)', msg.type);
        break;
      case 'Receipt':
        console.log('Receipt for your message:', msg);
        break;
      case 'Pong':
        console.log('Received pong:', msg.data);
        let time = new Date(msg.data / 1000);
        console.log('time:', time, time.toISOString());
      case 'Ping':
        const now = Date.now();
        const message = Message.fromVector(['Pong', now.toString()]);
        const pong = JSON.stringify(message.toObject());
        this.bridge.send(pong);
        break;
      case 'State':
        console.log('RAD STATE:', msg);
        this.state = msg.data;
        break;
      case 'Transaction':
        this._applyChanges(msg['@data']['changes']);
        await this.commit();
        break;
      case 'GenericMessage':
        console.warn('[AUDIT]', 'GENERIC MESSAGE:', msg);
        break;
    }
  }

  async start () {
    if (this.settings.verbosity >= 4) console.log('[HTTP:SPA]', 'Starting...');
    // await super.start();

    this.on('error', (error) => {
      console.error('got error:', error);
    });

    this.bridge.on('message', this._handleBridgeMessage.bind(this));

    if (this.settings.persistent) {
      try {
        if (this.settings.verbosity >= 5) console.log('[HTTP:SPA]', 'Starting bridge...');
        await this.store.start();
      } catch (E) {
        console.error('Could not start SPA store:', E);
      }
    }

    if (this.settings.verbosity >= 4) console.log('[HTTP:SPA]', 'Defining resources from settings...');

    /* Resources */
    for (let name in this.settings.resources) {
      if (this.settings.verbosity >= 4) console.log('[HTTP:SPA]', 'Defining Resource:', name);
      let definition = this.settings.resources[name];
      let plural = pluralize(name);
      let resource = await this.define(name, definition);
      // console.log('[AUDIT]', 'Created resource:', resource);

      // this.router._addFlat(`/${plural.toLowerCase()}`, definition);
      this.router._addRoute(`/${plural.toLowerCase()}/:id`, definition.components.view);
      this.router._addRoute(`/${plural.toLowerCase()}`, definition.components.list);

      // add menu items & handler
      if (!definition.hidden) {
        this.menu._addItem({ name: plural, path: `/${plural.toLowerCase()}`, icon: definition.icon });
      }

      // page.js router...
      this.handler(`/${plural.toLowerCase()}`, this._handleNavigation.bind(this));
      this.handler(`/${plural.toLowerCase()}/:id`, this._handleNavigation.bind(this));
    }

    /* Components */
    for (let name in this.settings.components) {
      if (this.settings.verbosity >= 4) console.log('[HTTP:SPA]', 'Defining Component:', name);
      let definition = this.settings.components[name];
      // TODO: consider async _defineElement (define at `function _defineElement`)
      let component = this._defineElement(name, definition);
    }

    /* Services */
    try {
      if (this.settings.verbosity >= 5) console.log('[HTTP:SPA]', 'Starting router...');
      await this.router.start();
    } catch (E) {
      console.error('Could not start SPA router:', E);
    }

    if (this.settings.websockets) {
      try {
        if (this.settings.verbosity >= 5) console.log('[HTTP:SPA]', 'Starting bridge...');
        this.bridge.start();
      } catch (exception) {
        console.error('Could not connect to bridge:', exception);
      }
    }

    /* HTML-specific traits */
    // Set page title
    this.title = `${this.settings.synopsis} &middot; ${this.settings.name}`;

    if (this.settings.verbosity >= 4) console.log('[HTTP:SPA]', 'Started!');
    return this;
  }
}

module.exports = SPA;
