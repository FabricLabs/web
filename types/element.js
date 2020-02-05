'use strict';

class HTMLCustomElement extends HTMLElement {
  constructor (...$) {
    const _ = super(...$);
    _.init();
    return _;
  }

  /**
   * Initialize the element.  Use in place of constructor behavior.
   */
  init () {
    if (this.settings && this.settings.verbosity >= 5) {
      console.log('[FABRIC:ELEMENT]', 'Initializing...');
    }
  }
}

module.exports = HTMLCustomElement;
