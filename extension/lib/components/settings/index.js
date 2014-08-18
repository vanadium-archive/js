
var mercury = require('mercury');
var h = mercury.h;
var debug = require('debug')('component:settings');
var setting = require('./setting');

// Temporary method of dealing with CSS
var fs = require('fs');
var insert = require('insert-css');
var css = fs.readFileSync(__dirname + '/index.css');

module.exports = create;
module.exports.render = render;

function render(settings) {
  debug('rendering', settings);
  insert(css);

  return h('form.settings', settings.collection.map(setting.render));
}

function create() {
  debug('initializing');

  var state = mercury.struct({
    error: mercury.value(null),
    collection: mercury.array([])
  });

  return { state: state };
}
