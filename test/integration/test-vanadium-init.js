// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var extend = require('xtend');
var isBrowser = require('is-browser');
var parallel = require('run-parallel');
var test = require('prova');

var config = require('./default-config');
var vanadium = require('../../');

test('Test vanadium.init({authenticate: true}) gives runtime with account name',
    function(t) {

  var c = extend({authenticate: true}, config);

  vanadium.init(c, function(err, rt) {
    if (!isBrowser) {
      t.ok(err, 'should error in node');
      return t.end();
    }

    if (err) {
      t.error(err);
      return t.end(err);
    }

    t.ok(rt, 'runtime exists');
    t.ok(rt.accountName, 'runtime has accountName property');
    t.ok(typeof rt.accountName === 'string', 'rt.accountName is string');
    t.ok(rt.accountName.length > 0, 'rt.accountName has length > 0');
    t.end();
  });
});

test('Test vanadium.init({authenticate: true}) twice gives two runtimes',
    function(t) {

  if (!isBrowser) {
    return t.end();
  }

  var c = extend({authenticate: true}, config);

  function vanadiumInit(cb) {
    vanadium.init(c, cb);
  }

  parallel([vanadiumInit, vanadiumInit], function(err, runtimes) {
    if (err) {
      t.error(err);
      t.end();
      return;
    }

    runtimes.forEach(function(rt) {
      t.ok(rt, 'runtime exists');
      t.ok(rt.accountName, 'runtime has accountName property');
      t.ok(typeof rt.accountName === 'string', 'rt.accountName is string');
      t.ok(rt.accountName.length > 0, 'rt.accountName has length > 0');
    });

    t.end();
  });
});

test('Test config logLevel INFO sets the vlog logLevel', function(t) {
  var c = extend({logLevel: vanadium.vlog.levels.INFO }, config);

  vanadium.init(c, function(err, rt) {
    if (err) {
      t.error(err);
      return t.end(err);
    }

    t.equal(vanadium.vlog.logger.level, vanadium.vlog.levels.INFO);
    rt.close(t.end);
  });
});

test('Test config logLevel ERROR sets the vlog logLevel', function(t) {
  var c = extend({logLevel: vanadium.vlog.levels.ERROR }, config);

  vanadium.init(c, function(err, rt) {
    if (err) {
      t.error(err);
      return t.end(err);
    }

    t.equal(vanadium.vlog.logger.level, vanadium.vlog.levels.ERROR);
    rt.close(t.end);
  });
});

test('Test vanadium.init({authenticate: false}) gives runtime ' +
    'with unknown name', function(t) {

  var c = extend({authenticate: false}, config);

  vanadium.init(c, function(err, rt) {
    if (err) {
      t.error(err);
      return t.end(err);
    }

    t.ok(rt, 'runtime exists');
    t.equal(rt.accountName, 'unknown', 'rt.accountName is "unknown"');
    rt.close(t.end);
  });
});

test('Test passing namespaceRoots to vanadium.init() sets the namespaceRoots',
    function(t) {

  var roots = ['/some-root.tld:1234', '/other-root.tld:80'];

  var c = extend({namespaceRoots: roots}, config);

  vanadium.init(c, function(err, rt) {
    if (!isBrowser) {
      t.ok(err, 'should error in node');
      return t.end();
    }

    if (err) {
      t.error(err, 'should not error');
      return t.end();
    }

    rt.namespace().roots(function(err, gotRoots) {
      if (err) {
        t.error(err);
        return rt.close(t.end);
      }

      t.ok(gotRoots, 'runtime.namespace has roots');
      t.deepEqual(gotRoots.sort(), roots.sort(),
          'runtime.namespace has the correct roots');

      rt.close(t.end);
    });
  });
});

// Helper that remounts a server at 'from' to a name 'to'.
function remount(from, to, cb) {
  vanadium.init(config, function(err, rt) {
    if (err) {
      return cb(err);
    }
    var ns = rt.namespace();
    var ctx = rt.getContext().withTimeout(5000);

    ns.resolve(ctx, from, function(err, servers) {
      if (err) {
        return end(err);
      }

      ns.mount(ctx, to, servers[0], 0, false, end);
    });

    function end(err) {
      rt.close(function(){
        cb(err);
      });
    }
  });
}

test('Test passing proxy to vanadium.init() sets the proxy',
  function(t) {

  // Remount the proxy under a new name.
  var existingProxyName = 'test/proxy';
  var newProxyName = 'new/name/for/proxy';

  remount(existingProxyName, newProxyName, function(err) {
    if (err) {
      return t.end(err);
    }

    // Initialize a new runtime with the new proxy name.
    var c = extend({proxy: newProxyName}, config);

    vanadium.init(c, function(err, rt) {
      if (!isBrowser) {
        t.ok(err, 'should error in node');
        return t.end();
      }

      if (err) {
        t.error(err, 'should not error');
        return t.end();
      }

      // Create a new server, and verify that we can call it.
      var serverName = 'pingpong';
      var service = {
        ping: function(ctx){
          return 'pong';
        }
      };
      var server = rt.newServer();
      server.serve(serverName, service, function(err) {
        if (err) {
          return end(err);
        }

        var client = rt.newClient();
        var ctx = rt.getContext().withTimeout(5000);
        client.bindTo(ctx, serverName, function(err, pingpong) {
          if (err) {
            return end(err);
          }
          t.ok(pingpong, 'bindTo returns the correct service');
          end(null);
        });
      });

      function end(err) {
        t.error(err);
        rt.close(t.end);
      }
    });
  });
});
