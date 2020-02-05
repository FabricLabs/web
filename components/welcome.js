'use strict';

const Component = require('../types/component');

class Welcome extends Component {
  constructor (settings = {}) {
    super(settings);

    this.settings = Object.assign({
      handle: 'fabric-welcome'
    }, settings);

    return this;
  }

  _getInnerHTML () {
    let html = ``;
    html += `<div>`;
    html += `<h2>Welcome to Fabric!</h2>`;
    html += `</div>`;
    return html;
  }
}

module.exports = Welcome;
