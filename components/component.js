'use strict';

const Fabric = require('@fabric/core');
const FabricElement = require('../types/element');

const crypto = require('crypto');
const manager = require('fast-json-patch');
const pointer = require('json-pointer');

/**
 * The {@link Component} element is a generic class for creating interactive DOM
 * elements, usually for later composition in an {@link App}.
 */
class Component extends FabricElement {
  /**
   * Create a new {@link Fabric} {@link Component}.
   * @param  {Object} [settings={}] Settings for the {@link Component}.
   * @return {Component}               Instance of the {@link Component}.
   */
  init (settings = {}) {
    super.init(settings);

    this.settings = Object.assign({
      title: 'Fabric Component',
      handle: 'fabric-component'
    }, settings);

    // this.element = document.createElement(this.settings.handle);
    // this.fabric = new Fabric();
    this._boundFunctions = {};
    this._listeners = {};

    this.remote = new Fabric.Remote({
      host: window.host,
      port: window.port
    });

    this._state = {
      methods: {},
      handlers: {}
    };

    return this;
  }

  get fingerprint () {
    return crypto.createHash('sha256').update(JSON.stringify(this.state)).digest('hex');
  }

  get title () {
    return this.settings.title;
  }

  get methods () {
    return Object.keys(this.state.methods);
  }

  set state (state) {
    if (!state) throw new Error('State must be provided.');
    this._state = state;
    this._redraw(this._state);
  }

  get state () {
    return Object.assign({}, this._state);
  }

  /* init (state = {}) {
    // Assign Settings
    this.settings = Object.assign({
      handle: 'starforge-component'
    }, state);

    // Assign State
    this._state = {
      handlers: {}
    };

    this._registerHandler('click', this.click.bind(this));
    // this.addEventListener('click', this.click.bind(this));
  } */

  attributeChangedCallback (name, old, value) {
    console.log('[MAKI:COMPONENT]', 'Component notified a change:', name, 'changed to:', value, `(was ${old})`);
  }

  connectedCallback () {
    console.log('[MAKI:COMPONENT]', 'Component added to page:', this);
    const state = (typeof window !== 'undefined' && window.app) ? window.app.state : this.state;
    const html = this._getInnerHTML(state);

    this.setAttribute('data-integrity', Fabric.sha256(html));
    this.setAttribute('data-fingerprint', this.fingerprint);
    // this.innerHTML = html;
    this.innerHTML = html + '';

    let binding = this.getAttribute('data-bind');

    if (binding) {
      // TODO: use Fabric.Remote
      fetch(`fabric:${binding}`)
        .then((response) => response.text())
        .then((responseText) => {
          this.render(JSON.parse(responseText));
        })
        .catch((error) => {
          console.error(error);
        });
    }

    // Reflect.construct(HTMLElement, [], this.constructor);
    return this;
  }

  disconnectedCallback () {
    console.log('[MAKI:COMPONENT]', 'Component removed from page:', this);
    for (let name in this._boundFunctions) {
      this.removeEventListener('message', this._boundFunctions[name]);
    }
  }

  integrity (data = '') {
    // TODO: cache and skip
    return `sha256-${crypto.createHash('sha256').update(data).digest('base64')}`;
  }

  _getElement () {
    return this.element;
  }

  /**
   * Attach a handler to an event.
   * @param {String} name Name of the event to listen for.
   * @param {Function} method Function to execute.
   */
  _registerHandler (name, method) {
    this.state.handlers[name] = method.bind(this);

    switch (name) {
      default:
        console.warn('[MAKI:COMPONENT]', 'Unknown method for handler:', name);
        break;
      case 'click':
      case 'submit':
        // let listener = document.addEventListener(name, method);
        // console.log('listener created:', listener);
        let local = this.addEventListener(name, method);
        break;
    }
  }

  _registerMethod (name, method) {
    this.state.methods[name] = method.bind(this);

    if (window && window.app && window.app.circuit) {
      window.app.circuit._registerMethod(name, this.state.methods[name]);
    }
  }

  _handleLocalChange (patches) {
    console.log('[MAKI:COMPONENT]', 'local changes:', patches);

    for (let i = 0; i < patches.length; i++) {
      let patch = patches[i];
      switch (patch.op) {
        case 'add':
        case 'replace':
          this.emit(patch.path, {
            '@type': 'Snapshot',
            '@data': patch.value
          });
          break;
      }
    }

    this.emit('/', {
      '@type': 'Snapshot',
      '@data': this.state
    });
  }

  /**
   * Re-draw the component, using provided state or existing state.
   * @param  {Object} [state={}] State to render with (optional).
   * @return {Component}         Instance of the {@link Component}.
   */
  _redraw (state = {}) {
    if (!state) state = this.state;
    if (this.settings.verbosity >= 5) console.log('[MAKI:COMPONENT]', 'redrawing with state:', state);
    this.innerHTML = this._getInnerHTML(state);
    return this;
  }

  commit () {
    let id = this.fingerprint();
    return id;
  }

  _getInnerHTML (state) {
    if (!state) state = (typeof window !== 'undefined') ? window.app.state : this.state;
    return `<code integrity="${this.integrity}">${JSON.stringify(this.state)}</code>`;
  }

  render () {
    let content = this._getInnerHTML();
    let hash = Fabric.sha256(content);
    return `<${this.settings.handle} integrity="${this.integrity(content)}" data-hash="${hash}">${content}</${this.settings.handle}>`;
  }

  async _GET (path) {
    return pointer.get(this.state, path);
  }

  async _SET (path, value) {
    return pointer.set(this.state, path, value);
  }

  async _applyChanges (ops) {
    try {
      monitor.applyPatch(this.state, ops);
      await this.commit();
    } catch (E) {
      console.error('Error applying changes:', E);
    }

    return this;
  }
}

module.exports = Component;
