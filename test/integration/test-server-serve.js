// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var isBrowser = require('is-browser');
var test = require('prova');
var vanadium = require('../../');
var config = require('./default-config');
var service = {
  changeChannel: function(ctx) {
    throw new Error('NotImplemented');
  }
};

test('Test serving a JS service named livingroom/tv - ' +
  'server.serve(name, service, callback)', function(assert) {
  vanadium.init(config, function(err, runtime) {
    assert.error(err);

    var server = runtime.newServer();
    server.serve('livingroom/tv', service, function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});

test('Test serving a JS service named livingroom/tv - ' +
  'var promise = server.serve(name, service)', function(assert) {
  vanadium.init(config, function(err, runtime) {
    assert.error(err);

    var server = runtime.newServer();
    server
    .serve('livingroom/tv', service)
    .then(function() {
      runtime.close(assert.end);
    })
    .catch(function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});

test('Test serving a JS service when proxy Url is invalid - '+
  'server.serve(name, service, callback)', function(assert) {
  if (isBrowser) {
    return assert.end();
  }

  vanadium.init({ wspr: 'http://bad-address.tld' }, function(err, runtime) {
    assert.ok(err);
    assert.end();
  });
});

test('Test serving a JS service when proxy Url is invalid - '+
  'var promise = server.serve(name, service)', function(assert) {
  if (isBrowser) {
    return assert.end();
  }

  vanadium.init({ wspr: 'http://bad-address.tld' }, function(err, runtime) {
    assert.ok(err);
    assert.end();
  });
});

test('Test serving a JS service multiple times should fail - ' +
  'server.serve(name, service)', function(assert) {
  vanadium.init(config, function(err, runtime) {
    assert.error(err);

    if(err) {
      assert.end();
      return;
    }

    var server = runtime.newServer();
    server.serve('livingroom/tv', service, function(err, firstEndpoint) {
      assert.error(err);

      server.serve('bedroom/tv', service, function(err) {
        assert.ok(err instanceof Error, 'should not be able to serve twice');
        runtime.close(assert.end);
      });
    });
  });
});

test('Test serving a JS service multiple times should fail - ' +
  'var promise = server.serve(name, service)', function(assert) {
  vanadium.init(config, function(err, runtime) {
    assert.error(err);

    var server = runtime.newServer();
    server
    .serve('livingroom/tv', service)
    .then(function() {
      return server.serve('bedroom/tv', service).then(function() {
        assert.fail('should not be able to serve twice');
        runtime.close(assert.end);
      }, function(err) {
        assert.ok(err instanceof Error, 'should not be able to serve twice');
        runtime.close(assert.end);
      });
    })
    .catch(function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});

test('Test serving a JS service under multiple names - ' +
  'runtime.addName(name), runtime.removeName(name)', function(assert) {
  var ctx;

  vanadium.init(config, function(err, runtime) {
    assert.error(err);

    var server = runtime.newServer();
    var client = runtime.newClient();
    ctx = runtime.getContext();
    server
    .serve('livingroom/tv', service)
    .then(function addSecondName() {
      return server.addName('bedroom/tv');
    })
    .then(function bindToSecondName() {
      return client.bindTo(ctx, 'bedroom/tv');
    })
    .then(function verifySecondName(newObject){
      assert.ok(newObject && newObject.changeChannel, 'new name works');
    })
    .then(function removeSecondName() {
      return server.removeName('bedroom/tv');
    })
    .then(function bindToRemovedSecondName() {
      var shortCtx = runtime.getContext().withTimeout(100);
      return client.bindTo(shortCtx, 'bedroom/tv')
      .then(function verifyRemovedSecondName(a) {
        assert.fail('should not be able to bind to a removed name');
        runtime.close(assert.end);
      }, function verifyRemovedSecondName(err) {
        assert.ok(err instanceof Error, 'should fail');
        runtime.close(assert.end);
      });
    })
    .catch(function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});

test('Test adding additional names before serving a JS service should fail - ' +
  'runtime.addName(name, cb) - before server.serve()', function(assert) {
  vanadium.init(config, function(err, runtime) {
    assert.error(err);

    var server = runtime.newServer();
    server.addName('bedroom/tv', function(err) {
      assert.ok(err instanceof Error, 'should fail');
      runtime.close(assert.end);
    });
  });
});

