'use strict';

const SPA = require('../types/spa');
const Compiler = require('../types/compiler');

async function main () {
  let spa = new SPA({
    resources: {
      'Depositor': {}
    }
  });
  let compiler = new Compiler({
    document: spa
  });

  compiler.compileTo('assets/index.html');
  compiler.compileTo('assets/spa.html');

  // TODO: why isn't SPA exiting?
  process.exit();
}

main();
