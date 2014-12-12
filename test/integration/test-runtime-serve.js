var test = require('prova');
var veyron = require('../../');
var config = require('./default-config');
var service = {
  changeChannel: function() {
    throw new Error('NotImplemented');
  }
};

test('Test serving a JS service named livingroom/tv - ' +
  'runtime.serve(name, service, callback)', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    runtime.serve('livingroom/tv', service, function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});

test('Test serving a JS service named livingroom/tv - ' +
  'var promise = runtime.serve(name, service)', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    runtime
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
  'runtime.serve(name, service, callback)', function(assert) {
  veyron.init({ wspr: 'http://bad-address.tld' }, function(err, runtime) {
    assert.error(err);

    runtime.serve('livingroom/tv', service, function(err) {
      assert.ok(err instanceof Error, 'should fail');
      runtime.close(assert.end);
    });
  });
});

test('Test serving a JS service when proxy Url is invalid - '+
  'var promise = runtime.serve(name, service)', function(assert) {
  veyron.init({ wspr: 'http://bad-address.tld' }, function(err, runtime) {
    assert.error(err);

    runtime
    .serve('livingroom/tv', service)
    .then(function() {
      assert.fail('should have errored');
    },function(err) {
      assert.ok(err instanceof Error, 'should fail');
      runtime.close(assert.end);
    })
    .catch(function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});

test('Test serving a JS service multiple times should fail - ' +
  'runtime.serve(name, service)', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    if(err) {
      assert.end();
      return;
    }

    runtime.serve('livingroom/tv', service, function(err, firstEndpoint) {
      assert.error(err);

      runtime.serve('bedroom/tv', service, function(err) {
        assert.ok(err instanceof Error, 'should not be able to serve twice');
        runtime.close(assert.end);
      });
    });
  });
});

test('Test serving a JS service multiple times should fail - ' +
  'var promise = runtime.serve(name, service)', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    runtime
    .serve('livingroom/tv', service)
    .then(function() {
      return runtime.serve('bedroom/tv', service).then(function() {
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
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    runtime
    .serve('livingroom/tv', service)
    .then(function addSecondName() {
      return runtime.addName('bedroom/tv');
    })
    .then(function bindToSecondName() {
      return runtime.bindTo('bedroom/tv');
    })
    .then(function verifySecondName(newObject){
      assert.ok(newObject && newObject.changeChannel, 'new name works');
    })
    .then(function removeSecondName() {
      return runtime.removeName('bedroom/tv');
    })
    .then(function bindToRemovedSecondName() {
      return runtime.bindTo('bedroom/tv')
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
  'runtime.addName(name, cb) - before runtime.serve()', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    runtime.addName('bedroom/tv', function(err) {
      assert.ok(err instanceof Error, 'should fail');
      runtime.close(assert.end);
    });
  });
});

test('Test removing names before serving a JS service should fail - ' +
  'runtime.removeName(name, cb) - before runtime.serve()', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    runtime.removeName('bedroom/tv', function(err) {
      assert.ok(err instanceof Error, 'should fail');
      runtime.close(assert.end);
    });
  });
});

test('Test removing a non-existing name should fail - ' +
  'runtime.removeName(name, cb)', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    runtime.removeName('does/not/exists', function(err) {
      assert.ok(err instanceof Error, 'should fail');
      runtime.close(assert.end);
    });
  });
});
