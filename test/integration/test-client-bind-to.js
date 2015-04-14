// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var isBrowser = require('is-browser');
var test = require('prova');
var vanadium = require('../../');
var config = require('./default-config');

test('Test binding to a Go service named test_service/cache - ' +
  'client.bindTo(name, callback)', function(assert) {
  var rt;

  vanadium.init(config, oninit);

  function oninit(err, runtime) {
    assert.error(err);

    rt = runtime;
    var client = rt.newClient();
    var ctx = rt.getContext();
    client.bindTo(ctx, 'test_service/cache', onbind);
  }

  function onbind(err, service) {
    assert.error(err);
    assert.ok(service);

    rt.close(assert.end);
  }
});

test('Test binding to a Go service named test_service/cache - ' +
  'var promise = client.bindTo(name)', function(assert) {
  vanadium
  .init(config)
  .then(bindTo)
  .catch(assert.end);

  function bindTo(runtime) {
    var ctx = runtime.getContext();
    return runtime.newClient()
    .bindTo(ctx, 'test_service/cache')
    .then(function(service) {
      assert.ok(service);
      runtime.close(assert.end);
    });
  }
});

test('Test binding to a non-existing name - ' +
  'client.bindTo(badName, callback)', function(assert) {
  vanadium.init(config, function(err, runtime) {
    assert.error(err);

    var client = runtime.newClient();
    var ctx = runtime.getContext().withTimeout(100);
    client.bindTo(ctx, 'does-not/exist', function(err, service) {
      assert.ok(err instanceof Error);

      runtime.close(assert.end);
    });
  });
});

test('Test binding to a non-existing name - ' +
  'var promise = client.bindTo(badName) ', function(assert) {
  var rt;

  vanadium
  .init(config)
  .then(function(runtime) {
    rt = runtime;
    var client = rt.newClient();
    var ctx = runtime.getContext().withTimeout(100);
    return client.bindTo(ctx, 'does-not/exist');
  })
  .then(function(service) {
    assert.fail('should not succeed');
    rt.close(assert.end);
  }, function(err) {
    assert.ok(err instanceof Error);
    rt.close(assert.end);
  })
  .catch(function(err) {
    assert.error(err);
    rt.close(assert.end);
  });
});

test('Test binding when proxy Url is invalid - ' +
  'client.bindTo(name, callback)', function(assert) {
  if (isBrowser) {
    return assert.end();
  }

  vanadium.init({ wspr: 'http://bad-address.tld' }, onruntime);

  function onruntime(err, runtime) {
    assert.ok(err instanceof Error);
    assert.end();
  }
});

test('Test binding when wspr Url is invalid - ' +
  'var promise = client.bindTo(name) ', function(assert) {
  if (isBrowser) {
    return assert.end();
  }

  vanadium
  .init({ wspr: 'http://bad-address.tld' }).
  then(function() {
    assert.error('should not have succeeded');
    assert.end();
  }, function(err) {
    assert.ok(err instanceof Error);
    assert.end();
  });
});
