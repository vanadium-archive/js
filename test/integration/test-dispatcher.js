var test = require('prova');
var serve = require('./serve');
var ServiceWrapper = require('../../src/idl/idl').ServiceWrapper;
var Promise = require('../../src/lib/promise');

test('echoer.echo(callback)', function(assert) {
  serve({
    name: 'dispatcher',
    dispatcher: dispatcher,
    autoBind: false
  }, function(err, res) {
    assert.error(err);

    res.runtime.bindTo('dispatcher/echo/bar', function(err, service) {
      assert.error(err);

      service.echo(function(err, result) {
        assert.error(err);

        assert.equal(result, 'bar');
        res.end(assert);
      });
    });
  });
});

test('counter.count()', function(assert) {
  serve({
    name: 'dispatcher',
    dispatcher: dispatcher,
    autoBind: false
  }, function(err, res) {
    assert.error(err);

    res.runtime.bindTo('dispatcher/count/bar', function(err, service) {
      assert.error(err);

      service.count(function(err, result) {
        assert.error(err);

        assert.equal(result, 3);
        res.end(assert);
      });
    });
  });
});

test('counter.count() - two different suffixes', function(assert) {
  serve({
    name: 'dispatcher',
    dispatcher: dispatcher,
    autoBind: false
  }, function(err, res) {
    assert.error(err);

    var promises = [
      res.runtime.bindTo('dispatcher/count/bar').then(function(client) {
        return client.count();
      }),
      res.runtime.bindTo('dispatcher/count/longer').then(function(client) {
        return client.count();
      })
    ];

    Promise.all(promises).then(function(results) {
      assert.equal(results[0], 3);
      assert.equal(results[1], 6);
      res.end(assert);
    })
    .catch(function(err) {
      assert.error(err);
      res.end(assert);
    });
  });
});

test('runtime.bindTo("dispatcher/unknown") - failure', function(assert) {
  serve({
    name: 'dispatcher',
    dispatcher: dispatcher,
    autoBind: false
  }, function(err, res) {
    assert.error(err);

    res.runtime.bindTo('dispatcher/unknown', function(err, service) {
      assert.ok(err, 'should fail');
      res.end(assert);
    });
  });
});

test('runtime.bindTo("dispatcher/promise")', function(assert) {
  serve({
    name: 'dispatcher',
    dispatcher: dispatcher,
    autoBind: false
  }, function(err, res) {
    assert.error(err);

    res.runtime.bindTo('dispatcher/promise/whatever', function(err, service) {
      assert.error(err);

      service.echo(function(err, result) {
        assert.error(err);
        assert.equal(result, 'promise/whatever');
        res.end(assert);
      });
    });
  });
});

test('runtime.bindTo("dispatcher/promise/fail") - failure', function(assert) {
  serve({
    name: 'dispatcher',
    dispatcher: dispatcher,
    autoBind: false
  }, function(err, res) {
    assert.error(err);

    res.runtime.bindTo('dispatcher/promise/fail', function(err, service) {
      assert.ok(err, 'should fail');
      res.end(assert);
    });
  });
});

test('runtime.bindTo("dispatcher/callback")', function(assert) {
  serve({
    name: 'dispatcher',
    dispatcher: dispatcher,
    autoBind: false
  }, function(err, res) {
    assert.error(err);

    res.runtime.bindTo('dispatcher/callback/whatever', function(err, service) {
      assert.error(err);

      service.echo(function(err, result) {
        assert.error(err);
        assert.equal(result, 'callback/whatever');
        res.end(assert);
      });
    });
  });
});

test('runtime.bindTo("dispatcher/callback/fail") - failure', function(assert) {
  serve({
    name: 'dispatcher',
    dispatcher: dispatcher,
    autoBind: false
  }, function(err, res) {
    assert.error(err);

    res.runtime.bindTo('dispatcher/callback/fail', function(err, service) {
      assert.ok(err, 'should fail');
      res.end(assert);
    });
  });
});

function Counter(string) {
  this.string = string;
}

Counter.prototype.count = function() {
  return this.string.length;
};

function Echoer(string) {
  this.string = string;
}

Echoer.prototype.echo = function() {
  return this.string;
};

function dispatcher(suffix, cb) {
  // dispatcher/echo/:string
  if (suffix.indexOf('echo/') === 0) {
    return {
      service: new ServiceWrapper(new Echoer(suffix.substr(5)))
    };
  // dispatcher/count/:string
  } else if (suffix.indexOf('count/') === 0) {
    return {
      service: new ServiceWrapper(new Counter(suffix.substr(6)))
    };
  // dispatcher/promise/fail
  } else if (suffix.indexOf('promise/fail') === 0) {
    return Promise.reject(new Error('bad'));
  // dispatcher/promise/:string
  } else if (suffix.indexOf('promise') === 0) {
    return Promise.resolve({
      service: new ServiceWrapper(new Echoer(suffix))
    });
  // dispatcher/callback/fail
  } else if (suffix.indexOf('callback/fail') === 0) {
    cb(new Error('errorback'));
  // dispatcher/callback/:string
  } else if (suffix.indexOf('callback') === 0) {
    cb(null, { service: new ServiceWrapper(new Echoer(suffix))});
  }

  throw new Error('unknown suffix');
}
