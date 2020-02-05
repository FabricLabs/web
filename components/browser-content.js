'use strict';

// const Component = require('../types/component');

class BrowserContent {
  constructor (settings = {}) {
    // super(settings);

    this.settings = Object.assign({
      name: 'UnsafeBrowserContent',
      title: 'UnsafeBrowserContent',
      handle: 'fabric-browser-content'
    }, settings);

    return this;
  }

  init () {
    console.log('[BROWSER:CONTENT]', 'init()');
  }

  _getInnerHTML () {
    let html = ``;
    html += `<div class="ui segment loading">`;
    html += `<h1 class="header">Preparing content...</h1>`;
    html += `<p>The application is compiling your document.</p>`;
    html += `</div>`;
    return html;
  }

  render () {
    return `<fabric-browser-content id="browser-content" class="ui container">${this._getInnerHTML()}</fabric-browser-content>`;
  }
}

module.exports = BrowserContent;
