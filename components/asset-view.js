'use strict';

const Component = require('../types/component');

class AssetView extends Component {
  constructor (settings = {}) {
    super(settings);

    this.settings = Object.assign({
      title: 'Asset View',
      handle: 'portal-asset-view'
    }, settings);

    this.assets = [];
    this.state = { assets: this.assets };

    return this;
  }

  _getInnerHTML () {
    let html = `<div class="ui segment">`;
    html += '<h3>Single Asset</h3>';
    html += '</div>';
    return html;
  }
}

module.exports = AssetView;
