var url = require('url');
var debug = require('debug')('init');
var storage = require('./storage');
var setting = require('./components/settings/setting');

module.exports = init;

var defaults = {
  identityd: formatVeyronEP('identityd', 8215),
  proxyd: formatVeyronEP('proxyd', 8100),
  mounttabled: formatVeyronEP('mounttabled', 8101),
  wspr: 'http://localhost:8124'
};

function formatVeyronEP(service, port) {
  var host = 'proxy.envyor.com';
  return url.format({
    hostname: host,
    port: port,
    pathname: '/'
  }).replace('//', '/');
}

// Hydrates the settings from chrome storage.  Also binds changes in the
// settings to update chrome storage.  If callback is provided, it will be fired
// after settings are fetched from storage.
function init(callback){
  callback = callback || function(){};

  var state = require('./state');
  for (var key in defaults) {
    if (defaults.hasOwnProperty(key)) {
      state.settings.collection.push(setting({
        key: key,
        value: defaults[key]
      }).state);
    }
  }

  state.settings.collection(function onupdate(collection) {
    debug('updated collection', collection);

    storage.set('settings', collection, function(err, res) {
      if (err) {
        return console.error('err', err);
      }

      debug('saved settings');
    });
  });

  // Hydrate pieces of the state from local storage
  //
  // NOTE: the recursive loop below is due to using nested components where
  // the state does not like to be replaced wholesale. For long lived things
  // it's best to create the intial state and then reach-down as low as
  // possible to update them. You will see obvious unexpected behavior if you
  // don't
  //
  // TODO(jasoncampbell): Write this up and work out a plan for a decent
  // state serialize/deserialize methods that play nice with observ-struct
  storage.get('settings', function(err, res) {
    if (err) {
      console.error(err);
      callback(err);
    }

    debug('loaded settings from storage', res);

    res = res || [];

    // :(
    res.forEach(function(saved) {
      state.settings.collection.forEach(function(current) {
        if (saved.key === current.key()) {
          current.value.set(saved.value);
        }
      });
    });

    callback(null);
  });
}


