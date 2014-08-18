
var mercury = require('mercury');
var h = mercury.h;
var debug = require('debug')('component:setting');

module.exports = create;
module.exports.render = render;

function render(setting) {
  debug('rendering', setting);
  var id = 'setting-' + setting.key;

  return h('.input', [
    h('label', { for: id }, setting.key),
    h('input', {
      id: id,
      name: 'value',
      type: 'text',
      value: setting.value,
      'ev-event': mercury.changeEvent(setting.events.update)
    })
  ]);
}

function create(opts) {
  opts = opts || {};

  debug('initializing', opts);

  var state = mercury.struct({
    key: mercury.value(opts.key || null),
    value: mercury.value(opts.value || null),
    events: mercury.input([ 'update' ])
  });

  state.events.update = function(data) {
    debug('updating', data);
    state.value.set(data.value);
  };

  return { state: state };
}
