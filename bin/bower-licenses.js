#!/usr/bin/env node

var licenses = require('../index.js');
var opts = require('nomnom')
  .option('path', {
    help: 'Define path where to put licenses',
    default: './'
  })
  .parse();

try {
  licenses(opts);
}
catch(err) {
  console.error(err.toString());
}
