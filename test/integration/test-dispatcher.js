var test = require('prova');
var serve = require('./serve');
var ServiceWrapper = require('../../src/idl/idl').ServiceWrapper;
var Promise = require('../../src/lib/promise');
var context = require('../../src/runtime/context');

test('Test sync dispatcher the echos suffixes - ' +
  'dispatcher/echo/<suffix>', function(assert) {
  var ctx = context.Context();
  serve(ctx, {
    name: 'dispatcher',
    dispatcher: dispatcher,
    autoBind: false
  }, function(err, res) {
    if (err) {
      return assert.end(err);
    }

    res.runtime.bindTo(ctx, 'dispatcher/echo/bar', function(err, service) {
      if (err) {
        assert.error(err);
        res.end(assert);
        return;
      }

      service.echo(ctx, function(err, result) {
        assert.error(err);

        assert.equal(result, 'bar');
        res.end(assert);
      });
    });
  });
});

test('Test sync dispatcher that counts length of suffix - ' +
  'dispatcher/count/<suffix> - one suffix', function(assert) {
  var ctx = context.Context();
  serve(ctx, {
    name: 'dispatcher',
    dispatcher: dispatcher,
    autoBind: false
  }, function(err, res) {
    if (err) {
      return assert.end(err);
    }

    res.runtime.bindTo(ctx, 'dispatcher/count/bar', function(err, service) {
      if (err) {
        return assert.end(err);
      }

      service.count(ctx, function(err, result) {
        assert.error(err);

        assert.equal(result, 3);
        res.end(assert);
      });
    });
  });
});

test('Test sync dispatcher that counts length of suffix - ' +
  'dispatcher/count/<suffix> - two different suffixes', function(assert) {
  var ctx = context.Context();
  serve(ctx, {
    name: 'dispatcher',
    dispatcher: dispatcher,
    autoBind: false
  }, function(err, res) {
    if (err) {
      return assert.end(err);
    }

    var promises = [
      res.runtime.bindTo(ctx, 'dispatcher/count/bar').then(function(client) {
        return client.count(ctx);
      }),
      res.runtime.bindTo(ctx, 'dispatcher/count/longer').then(function(client) {
        return client.count(ctx);
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

test('Test unknown suffix should return error - ' +
  'dispatcher/unknown', function(assert) {
  var ctx = context.Context();
  serve(ctx, {
    name: 'dispatcher',
    dispatcher: dispatcher,
    autoBind: false
  }, function(err, res) {
    if (err) {
      return assert.end(err);
    }

    res.runtime.bindTo(ctx, 'dispatcher/unknown', function(err, service) {
      assert.ok(err, 'should fail');
      res.end(assert);
    });
  });
});

test('Test async dispatcher using promises - dispatcher/promise ' +
  '- success case', function(assert) {
  var ctx = context.Context();
  serve(ctx, {
    name: 'dispatcher',
    dispatcher: dispatcher,
    autoBind: false
  }, function(err, res) {
    if (err) {
      return assert.end(err);
    }

    var name = 'dispatcher/promise/whatever';
    res.runtime.bindTo(ctx, name, function(err, service) {
      if (err) {
        return assert.end(err);
      }

      service.echo(ctx, function(err, result) {
        assert.error(err);
        assert.equal(result, 'promise/whatever');
        res.end(assert);
      });
    });
  });
});

test('Test async dispatcher using promises - dispatcher/promise/fail ' +
  '- failure case', function(assert) {
  var ctx = context.Context();
  serve(ctx, {
    name: 'dispatcher',
    dispatcher: dispatcher,
    autoBind: false
  }, function(err, res) {
    if (err) {
      return assert.end(err);
    }

    res.runtime.bindTo(ctx, 'dispatcher/promise/fail', function(err, service) {
      assert.ok(err, 'should fail');
      res.end(assert);
    });
  });
});

test('Test async dispatcher using callbacks - dispatcher/callback ' +
  '- success case', function(assert) {
  var ctx = context.Context();
  serve(ctx, {
    name: 'dispatcher',
    dispatcher: dispatcher,
    autoBind: false
  }, function(err, res) {
    if (err) {
      return assert.end(err);
    }

    var name = 'dispatcher/callback/whatever';
    res.runtime.bindTo(ctx, name, function(err, service) {
      if (err) {
        return assert.end(err);
      }

      service.echo(ctx, function(err, result) {
        assert.error(err);
        assert.equal(result, 'callback/whatever');
        res.end(assert);
      });
    });
  });
});

test('Test async dispatcher using callbacks - dispatcher/callback/fail ' +
  '- failure case', function(assert) {
  var ctx = context.Context();
  serve(ctx, {
    name: 'dispatcher',
    dispatcher: dispatcher,
    autoBind: false
  }, function(err, res) {
    if (err) {
      return assert.end(err);
    }

    res.runtime.bindTo(ctx, 'dispatcher/callback/fail', function(err, service) {
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
