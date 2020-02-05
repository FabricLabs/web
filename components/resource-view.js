'use strict';

const Component = require('../types/component');
const Collection = require('./collection');
const Resource = require('@fabric/core/types/resource');

class ResourceView extends Component {
  constructor (settings = {}) {
    super(settings);

    this.settings = Object.assign({
      handle: 'fabric-resource-view',
      path: '/resources/:id'
    }, settings);

    return this;
  }

  _getInnerHTML () {
    return `<strong>Resource view here...`;
  }
}

module.exports = ResourceView;
