'use strict';

const crypto = require('crypto');
const Service = require('@fabric/core/types/service');
// const Fabric = require('@fabric/core');

/**
 * Generic component.
 */
class Component extends Service {
  /**
   * Create a component.
   * @param  {Object} [settings={}] Settings for the component.
   * @return {Component}            Fully-configured component.
   */
  constructor (settings = {}) {
    super(settings);

    this.settings = Object.assign({
      handle: 'fabric-component',
      path: '/'
    }, settings);

    this.state = settings;
    this.element = null;

    return this;
  }

  get path () {
    return this.settings.path;
  }

  get data () {
    return JSON.stringify(this.state || {});
  }

  get hash () {
    // TODO: cache and skip
    return crypto.createHash('sha256').update(this.render()).digest('hex');
  }

  get integrity () {
    // TODO: cache and skip
    let hash = crypto.createHash('sha256').update(this.data).digest('base64');
    return `sha256-${hash}`;
  }


  attributeChangedCallback (name, old, value) {
    console.log('[MAKI:COMPONENT]', 'Component notified a change:', name, 'changed to:', value, `(was ${old})`);
  }

  connectedCallback () {
    console.log('[MAKI:COMPONENT]', 'Component added to page:', this);
    let html = this._getInnerHTML();

    this.setAttribute('data-integrity', Fabric.sha256(html));
    this.setAttribute('data-fingerprint', this.fingerprint);
    // this.innerHTML = html;
    this.innerHTML = html + '';

    /* let binding = this.getAttribute('data-bind');

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
    } */

    // Reflect.construct(HTMLElement, [], this.constructor);
    return this;
  }

  disconnectedCallback () {
    console.log('[MAKI:COMPONENT]', 'Component removed from page:', this);
    // TODO: remove event listeners, close connections, etc.
  }

  _bind (element) {
    if (this.element) {
      // TODO: unbind old handlers
    }

    this.element = element;
    this.element.addEventListener('refresh', this.refresh.bind(this));
    this.element.addEventListener('message', this._handleComponentMessage.bind(this));

    this.render();

    return this;
  }

  _handleComponentMessage (msg) {
    console.log('[FABRIC:COMPONENT]', 'Element emitted message:', msg);
  }

  _toElement () {
    let element = document.createElement(this.settings.handle);
    element.innerHTML = this._getInnerHTML(this.state);
    return element;
  }

  _loadHTML (content) {
    let hash = crypto.createHash('sha256').update(content).digest('base64');
    return `<${this.settings.handle} integrity="sha256-${hash}">${content}</${this.settings.handle}>`;
  }

  _getInnerHTML (state) {
    return `<code class="unconfigured" data-name="_getInnerHTML">${JSON.stringify(state || this.state)}</code>`;
  }

  _renderState (state) {
    // TODO: render Template here
    // cc: @melnx @lel @lllllll:fabric.pub
    let content = this._getInnerHTML(state);
    return this._loadHTML(content);
  }

  refresh () {
    if (this.element) {
      this.element.innerHTML = this._getInnerHTML(this.state);
    }
  }

  register () {
    customElements.define(this.settings.handle, Component, { extends: 'div' });
  }

  render () {
    if (this.element) {
      this.element.innerHTML = this._getInnerHTML();
    }
    return this._renderState(this.state);
  }
}

module.exports = Component;
