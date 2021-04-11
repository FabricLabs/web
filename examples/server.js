'use strict';

const settings = require('../settings/default');
const Server = require('@fabric/http/types/server');

async function main () {
  const server = new Server(settings);

  await server.define('Example', {
    components: {
      list: 'example-list',
      view: 'example-view'
    }
  });

  await server.start();
}

main();
