'use strict';

const Component = require('../types/component');

class AssetList extends Component {
  constructor (settings = {}) {
    super(settings);

    this.settings = Object.assign({
      title: 'Assets',
      handle: 'portal-asset-list'
    }, settings);

    this.assets = [];
    this.state = {
      assets: this.assets,
      methods: {}
    };

    return this;
  }

  _getInnerHTML () {
    let html = `<div class="ui segment">`;
    html += '<h3>Assets</h3>';
    html += `<table class="ui celled table">
  <thead>
    <tr>
      <th>#</th>
      <th>Hash</th>
      <th>Name</th>
      <th>Symbol</th>
      <th>Maximum</th>
      <th>Raw</th>
    </tr>
  </thead>
  <tbody>`;

    for (let i = 0; i < this.state.assets.length; i++) {
      let asset = this.state.assets[i];
      html += `<tr>
  <td>${asset.id}</td>
  <td>${asset.hash}</td>
  <td>${asset.name}</td>
  <td>${asset.symbol}</td>
  <td>${asset.maximum}</td>
  <td>${asset.raw}</td>
</tr>`;
    }

    html += `</tbody>
      </table>`;
    html += '</div>';
    return html;
  }
}

module.exports = AssetList;
