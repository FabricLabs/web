'use strict';

const {
  HTTP_SERVER_PORT,
  BROWSER_TARGET
} = require('../constants');

const page = require('page');
const crypto = require('crypto');
const pluralize = require('pluralize');
const beautify = require('js-beautify');
// const d3 = require('d3');

const Fabric = require('@fabric/core');
// const Stash = require('@fabric/core/types/stash');

// Internal Types
const Avatar = require('./avatar');
const Router = require('./router');
const Browser = require('./browser');
const Resource = require('./resource');
const Identity = require('./identity');
// const Wallet = require('./wallet');
const Component = require('./component');

// TODO: move component imports to components/ or scripts/
const Introduction = require('../components/introduction');
const ResourceList = require('../components/resource-list');
const Menu = require('../components/menu');

/**
 * Applications can be deployed to the legacy web using {@link App}, a powerful
 * template for building modern web applications.
 * @extends Component
 */
class App extends Component {
  /**
   * Create a {@link Web} application.
   * @param  {Object} [settings={}] Application settings.
   * @param  {Circuit} [settings.circuit] Instance of an existing {@link Circuit}.
   * @param  {Object} [settings.resources] Map of {@link Resource} classes.
   * @return {App}               Instance of the application.
   */
  constructor (settings = {}) {
    super(settings);

    if (this.settings.verbosity >= 4) console.log('[FABRIC:HTTP]', 'creating new APP with:', settings);

    // settings
    this.settings = Object.assign({
      name: '@fabric/http',
      synopsis: 'HTTP, WebSockets, WebRTC, and more.',
      controls: false,
      language: 'en',
      namespace: 'maki',
      components: {
        index: 'maki-introduction'
      },
      identities: {},
      resources: {},
      seeds: [
        'hub.fabric.pub:9999',
        'chat.roleplaygateway.com:9999',
        'hub.roleplaygateway.com:9999'
      ],
      path: './stores/fabric-app',
      peers: {},
      port: HTTP_SERVER_PORT
    }, settings);

    this.menu = new Menu();
    this.types = new ResourceList();
    this.avatar = new Avatar();
    this.router = new Router(this.settings);
    // this.wallet = new Wallet();
    this.browser = new Browser(Object.assign({}, this.settings, {
      component: 'fabric-welcome',
      path: './stores/fabric-browser'
    }));

    // TODO: define these elsewhere!
    // These are internal components, should be on prototype.
    /* this.state = {
      methods: {},
      channels: {},
      components: {},
      resources: {},
      messages: {}
    }; */
    this._state = {};

    this.modal = null;
    this.target = null;
    this.identity = null;
    this.history = [];

    this.stash = new Fabric.Store(Object.assign({}, this.settings, {
      path: 'stores/stash'
    }));

    this.stash.on('patches', function (patches) {
      console.log('[HTTP:APP]', 'heard patches!', patches);
    });

    this.secrets = new Fabric.Store({
      path: 'stores/secrets'
    });

    this.wallets = new Fabric.Collection({
      name: 'Wallet',
      listeners: {
        'changes': this._handleWalletChanges.bind(this)
      }
    });

    this.circuit = this.settings.circuit || new Fabric.Circuit();

    // Add index menu item
    // this.menu._addItem({ name: this.settings.name, path: '/', brand: true });
    this.router._addRoute('/', this.settings.components.index);
    this.handler('/', this._handleNavigation.bind(this));

    // properties
    this.identities = {};
    this.peers = {};
    this.components = { ResourceList };
    this.resources = {};
    this.elements = {};
    this.routes = [];

    for (let name in this.settings.resources) {
      let definition = this.settings.resources[name];
      let plural = pluralize(name);

      this.define(name, definition);

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

    // Some default Components, available to all
    // TODO: expose this as the Library, namespace `alexandria`
    this.define('Introduction', Introduction);
    this._defineElement('maki-introduction', Introduction);

    this.route = '/';
    this.status = 'ready';

    return this;
  }

  get handler () {
    return page;
  }

  get page () {
    // TODO: return current page
    return new Resource({
      name: 'BlankPage'
    });
  }

  get state () {
    return this._state;
  }

  set state (value) {
    return this._state = value;
  }

  get version () {
    return this.settings.version;
  }

  connectedCallback () {
    super.connectedCallback();
  }

  define (name, definition) {
    let route = this.router.define(name, definition);
    if (this.settings.verbosity >= 4) console.log('[WEB:APP]', 'Defining', name, route);
    this.types.state[name] = definition;
    this.resources[name] = definition;
    this._state[pluralize(name).toLowerCase()] = definition.data || {};
  }

  dispatch (name, data = {}) {
    console.log('[WEB:APP]', 'dispatching:', name, data);
    this.emit('call', {
      type: name,
      data: data
    });
  }

  _route (path) {
    this.route = path;
  }

  _addRoute (definition) {
    this.routes.push(definition);
  }

  _addHandler (name, method) {
    this.circuit.methods[name] = method;
  }

  _registerMethod (name, method) {
    return this._addHandler(name, method);
  }

  _checkIntegrity (data, integrity) {
    let parts = integrity.split('-');
    let hash = crypto.createHash('sha256').update(data).digest('base64');
    return hash === parts[1];
  }

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

  _setIdentity (identity) {
    this.identity = identity;
  }

  _verifyElements () {
    let elements = document.querySelectorAll('*[integrity]');
    for (let i = 0; i < elements.length; i++) {
      let element = elements[i];
      let integrity = element.getAttribute('integrity');
      let valid = this._checkIntegrity(element.innerHTML, integrity);
      console.log('[MAKI:APP]', 'checking integrity:', 'element:', element);
      console.log('[MAKI:APP]', 'checking integrity:', 'innerHTML:', element.innerHTML);
      console.log('[MAKI:APP]', 'checking integrity:', 'valid', valid);
    }
  }

  _flush () {
    while (this.target.firstChild) {
      this.target.removeChild(this.target.firstChild);
    }
  }

  _appendElement (element) {
    this.target.appendChild(element);
    element.innerHTML = element._getInnerHTML();
    return this;
  }

  async _loadIndex (ctx) {
    let Index = this.components[this.settings.components.index];
    if (!Index) throw new Error(`Could not find component: ${this.settings.components.index}`);
    let resource = new Index(this.state);
    let content = resource.render();
    this._setTitle(resource.name);
    this._renderContent(content);
  }

  /**
   * Trigger navigation.
   * @param  {Context}   ctx  Navigating context.
   * @param  {Function} next Function called if no route found.
   * @return {Promise}       Resolved on routing complete.
   */
  async _handleNavigation (ctx, next) {
    console.log('[MAKI:APP]', 'handling navigation intent:', ctx);

    let self = this;
    let address = await self.browser.route(ctx.path);
    let sample = await self.browser.load(ctx.path);

    console.log('[MAKI:APP]', 'final testing:', sample);

    let element = document.createElement(address.route.component);

    if (!element.state) element.state = {};
    if (address) {
      console.log('[MAKI:APP]', 'resolved address:', address);
      console.log('[MAKI:APP]', 'appending element:', element);
      console.log('[MAKI:APP]', 'self data:', self.state);

      for (let name in self.state) {
        element.state[name] = self.state[name];
      }

      /* self._GET(ctx.path).then(async function (x) {
        console.log('GOT DATA:', x);
        element._redraw(x);
      }, function (e) {
        console.error('WAT:', e);
      }); */

      self._setTitle(element.title);

      self.browser._setAddress(ctx.path);
      self.browser._setElement(element);

      self.target = element;
    }
  }

  async _handleWalletChanges (event) {
    console.log('WALLET CHANGES:', event);
  }

  async _restoreIdentity () {
    let identities = null;

    try {
      identities = await this.secrets._GET(`/identities`);
    } catch (E) {
      console.error('Could not load history:', E);
    }

    if (!identities || !identities.length) {
      return this._generateIdentity();
    }

    return new Identity(identities[0]);
  }

  async _generateIdentity () {
    let item = null;
    let result = null;
    let link = null;

    // TODO: async generation
    let key = new Fabric.Key();
    let struct = {
      name: prompt('What shall be your name?'),
      address: key.address,
      private: key.private.toString('hex'),
      public: key.public
    };

    let existing = await this._getIdentityByName(struct.name);
    console.log('existing check:', existing);

    if (!existing) {
      try {
        let id = await this.secrets._POST(`/identities`, struct);
        link = id;
      } catch (E) {
        console.error('broken:', E);
      }
    } else {
      link = existing;
    }

    // TODO: verify login here
    // TODO: encrypt local storage with password

    this.identities[struct.address] = struct;
    this.identity = struct;

    // TODO: remove public key from character, use only address (or direct hash)
    return {
      address: struct.address,
      public: struct.public
    };
  }

  async _getIdentityByName (name) {
    let candidates = Object.keys(this.identities).map((x) => {
      return this.identities[x];
    }).filter((x) => {
      return x.name === name;
    });

    console.log('candidates:', candidates);
    return candidates[0] || null;
  }

  async _handleCall (event) {
    console.log('[WEB:APP]', 'call received:', event);
    if (this.methods && this.methods[event.type] instanceof Function) {
      return this.methods[event.type](event.data || {});
    } else {
      return false;
    }
  }

  async _registerWallet (input) {
    let wallet = await this.wallets.create(input);
    console.log('[MAKI:APP]', 'wallet registered:', wallet);
    return wallet;
  }

  _setTitle (title) {
    this.title = `${title} &middot; ${this.settings.name}`;
    document.querySelector('title').innerHTML = this.title;
  }

  _refresh () {
    let resource = new Fabric.Resource();
    this.target.innerHTML = this._loadHTML(resource.render());
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

  // TODO: write Purity-based version, use in production
  _loadHTML (html) {
    let blob = JSON.stringify(this.state, null, '  ');
    let verification = crypto.createHash('sha256').update(blob).digest('hex');
    let content = ``;

    // Begin Content Body
    content += `<fabric-application route="${this.route}" integrity="${this.integrity}" class="window">`;

    if (this.settings.header) {
      content += `<header>
        <fabric-grid-row id="details" class="ui grid">
          <div class="wide column">
            <div class="ui inverted header">
              <a href="/"><img src="/images/brand.png" class="ui small image" /></a>
              <h1 class="content"><a href="/">${this.settings.name}</a></h1>
              <p class="sub header">${this.settings.synopsis}</p>
            </div>
          </div>
        </fabric-grid-row>
      </header>`;
    }

    // Main Browser Viewport
    content += `<fabric-grid-row id="browser">${this.browser.render()}</fabric-grid-row>`;

    if (this.settings.footer) {
      content += `<footer>
        <fabric-debug></fabric-debug>
      </footer>`;
    }

    content += `<div id="ephemeral-content"></div>
      <!-- TODO: rollup semantic into build process -->
      <!-- <script type="text/javascript" src="/scripts/semantic.min.js"></script> -->
      <!-- <script type="text/javascript" src="/scripts/index.min.js"></script> -->
      <!-- <script type="text/javascript" src="/scripts/rpg.min.js"></script> -->
      <script type="text/javascript" src="/scripts/app.js"></script>
    </fabric-application>`;
    return content;
  }

  async _toggleFullscreen () {
    // TODO: implement fullscreen from RPG
  }

  /**
   * Generate the rendered HTML output of the application's user interface.
   * @return {String} HTML string.
   */
  render () {
    let page = this.page.render();
    let html = this._loadHTML(page);
    let pretty = beautify.html(html, {
      indent_size: 2,
      extra_liners: []
    });

    return pretty;
  }

  /**
   * Launches any necessary processes and notifies the user on ready.
   * @return {Promise} Resolves on completion.
   */
  async start () {
    if (typeof window !== 'undefined' && window.app) await window.app.stop();

    try {
      await this.store.start();
    } catch (E) {
      console.error('Could not open store:', E);
    }

    await this.define('FabricMenu', Menu);
    await this.define('ResourceList', ResourceList);

    for (let name in this.resources) {
      let definition = this.resources[name];
      if (definition.data) {
        // TODO: move this to `types/resource.js`
        if (!definition.names) {
          definition.names = {
            singular: name,
            plural: pluralize(name)
          };
        }
        await this.set(`/${definition.names.plural.toLowerCase()}`, definition.data);
      }
    }

    this.on('call', this._handleCall.bind(this));

    // await this.fabric.start();
    try {
      await this.circuit.start();
      await this.browser.start();
      await this.router.start();
    } catch (E) {
      console.error('Could not start, Exception:', E);
    }

    return true;
  }

  async stop () {
    await this.router.stop();
    await this.browser.stop();
    await this.circuit.stop();
    await this.store.stop();

    return true;
  }
}

module.exports = App;
