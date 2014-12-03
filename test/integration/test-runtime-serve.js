var test = require('prova');
var veyron = require('../../');
var config = require('./default-config');
var service = {
  changeChannel: function() {
    throw new Error('NotImplemented');
  }
};

test('runtime.serve(name, service, callback)', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    runtime.serve('livingroom/tv', service, function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});

test('runtime.serve(name, service, callback) - bad wspr', function(assert) {
  veyron.init({ wspr: 'http://bad-address.tld' }, function(err, runtime) {
    assert.error(err);

    runtime.serve('livingroom/tv', service, function(err) {
      assert.ok(err instanceof Error, 'should fail');
      runtime.close(assert.end);
    });
  });
});

test('var promise = runtime.serve(name, service)', function(assert) {
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

test('var promise = runtime.serve(name, service) - failure', function(assert) {
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

test('runtime.serve(name, service) - ' +
  'serving multiple times should fail - cb', function(assert) {
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

test('var promise = runtime.serve(name, service) - ' +
  'serving multiple times should fail', function(assert) {
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

test('runtime.addName(name) & runtime.removeName(name) - ' +
   'serving under multiple names', function(assert) {
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

test('runtime.addName(name,cb) - before serve() - fail', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    runtime.addName('bedroom/tv', function(err) {
      assert.ok(err instanceof Error, 'should fail');
      runtime.close(assert.end);
    });
  });
});

test('runtime.removeName(name,cb) - before serve() - fail', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    runtime.removeName('bedroom/tv', function(err) {
      assert.ok(err instanceof Error, 'should fail');
      runtime.close(assert.end);
    });
  });
});

test('runtime.removeName(name,cb) - non-existing - fail', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    runtime.removeName('does/not/exists', function(err) {
      assert.ok(err instanceof Error, 'should fail');
      runtime.close(assert.end);
    });
  });
});
