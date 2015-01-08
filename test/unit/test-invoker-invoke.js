var test = require('prova');
var verror = require('../../').errors;
var Invoker = require('../../src/invocation/invoker.js');
var Context = require('../../src/runtime/context').Context;
var Promise = require('../../src/lib/promise');
var extend = require('xtend');

test('invoker.invoke(...) - cb', function(t) {
  var context = new Context();

  invoke({
    service: { callbackMethod: callbackMethod },
    name: 'CallbackMethod',
    args: [ 'a', 'b', 'c', 'd' ],
    injections: {
      context: context
    }
  }, function cb(err, results) {
    t.error(err, 'should not error');
    t.deepEqual(results, [ context, 'a', 'b', 'c', 'd', cb ]);
    t.end();
  });

  // Hoisted into the service object above.
  function callbackMethod(context, a, b, c, d, callback) {
    var args = slice(arguments);

    process.nextTick(function() {
      callback(null, args);
    });
  }
});

test('invoker.invoke(...) - return value', function(t) {
  var context = new Context();

  invoke({
    service: { returnMethod: returnMethod },
    name: 'ReturnMethod',
    args: [ 'a', 'b', 'c', 'd' ],
    injections: {
      context: context
    }
  }, function cb(err, results) {
    t.error(err, 'should not error');
    t.deepEqual(results, [ context, 'a', 'b', 'c', 'd', cb ]);
    t.end();
  });

  // Hoisted into the service object above.
  function returnMethod(context, a, b, c, d) {
    return slice(arguments);
  }
});

test('invoker.invoke(...) - promise', function(t) {
  var context = new Context();

  invoke({
    service: { promiseMethod: promiseMethod },
    name: 'PromiseMethod',
    args: [ 'a', 'b', 'c', 'd' ],
    injections: {
      context: context
    }
  }, function cb(err, results) {
    t.error(err, 'should not error');
    t.deepEqual(results, [ context, 'a', 'b', 'c', 'd', cb ]);
    t.end();
  });

  // Hoisted into the service object above.
  function promiseMethod(context, a, b, c, d) {
    var args = slice(arguments);

    var promise = new Promise(function(resolve, reject) {
      process.nextTick(function() {
        resolve(args);
      });
    });

    return promise;
  }
});

test('invoker.invoke(...) - cb - shortnames (ctx/cb)', function(t) {
  var context = new Context();

  invoke({
    service: { callbackShortNames: callbackShortNames },
    name: 'CallbackShortNames',
    args: [],
    injections: { context: context }
  }, function cb(err, results) {
    t.error(err);
    t.deepEqual(results, [ context, cb]);
    t.end();
  });

  function callbackShortNames(ctx, cb) {
    cb(null, slice(arguments));
  }
});

test('invoker.invoke(...) - promise - shortnames', function(t) {
  var context = new Context();

  invoke({
    service: { promiseShortNames: promiseShortNames },
    name: 'PromiseShortNames',
    args: [],
    injections: { context: context }
  }, function cb(err, results) {
    t.error(err);
    t.deepEqual(results, [ context, cb]);
    t.end();
  });

  function promiseShortNames(ctx, cb) {
    var args = slice(arguments);

    var promise = new Promise(function(resolve, reject) {
      resolve(args);
    });

    return promise;
  }
});

test('invoker.invoke(...) - cb - $stream injection', function(t) {
  var context = new Context();
  var stream = 'fake stream injection';

  invoke({
    service: { callbackStreamMethod: callbackStreamMethod },
    name: 'CallbackStreamMethod',
    args: [ 'a', 'b', 'c', 'd' ],
    injections: {
      context: context,
      stream: stream
    }
  }, function cb(err, results) {
    t.error(err, 'should not error');
    t.deepEqual(results, [ context, 'a', 'b', stream, 'c', 'd', cb ]);
    t.end();
  });

  // Hoisted into the service object above.
  function callbackStreamMethod(context, a, b, $stream, c, d, callback) {
    var args = slice(arguments);

    process.nextTick(function() {
      callback(null, args);
    });
  }
});

test('invoker.invoke(...) - return value - $stream injection', function(t) {
  var context = new Context();
  var stream = 'fake stream injection';

  invoke({
    service: { returnStreamMethod: returnStreamMethod },
    name: 'ReturnStreamMethod',
    args: [ 'a', 'b', 'c', 'd' ],
    injections: {
      context: context,
      stream: stream
    }
  }, function cb(err, results) {
    t.error(err, 'should not error');
    t.deepEqual(results, [ context, 'a', 'b', stream, 'c', 'd', cb ]);
    t.end();
  });

  // Hoisted into the service object above.
  function returnStreamMethod(context, a, b, $stream, c, d) {
    return slice(arguments);
  }
});

test('invoker.invoke(...) - promise - $stream injection', function(t) {
  var context = new Context();
  var stream = 'fake stream injection';

  invoke({
    service: { promiseStreamMethod: promiseStreamMethod },
    name: 'PromiseStreamMethod',
    args: [ 'a', 'b', 'c', 'd' ],
    injections: {
      context: context,
      stream: stream
    }
  }, function cb(err, results) {
    t.error(err, 'should not error');
    t.deepEqual(results, [ context, 'a', 'b', stream, 'c', 'd', cb ]);
    t.end();
  });

  // Hoisted into the service object above.
  function promiseStreamMethod(context, a, b, $stream, c, d) {
    var args = slice(arguments);

    var promise = new Promise(function(resolve, reject) {
      process.nextTick(function() {
        resolve(args);
      });
    });

    return promise;
  }
});

test('invoker.invoke(...) - where service is constructed', function(t) {
  function KVStore() {
    this.store = {
      foo: 'bar'
    };
  }

  KVStore.prototype.get = function(context, key, callback) {
    callback(null, this.store[key]);
  };

  var service = new KVStore();

  invoke({
    service: service,
    name: 'Get',
    args: [ 'foo' ]
  }, function(err, result) {
    t.error(err, 'should not error');
    t.equal(result, 'bar');
    t.end();
  });
});

test('invoker.invoke(...) - cb - no arg method', function(t) {
  var context = new Context();

  invoke({
    service: { callbackNoArgMethod: callbackNoArgMethod },
    name: 'CallbackNoArgMethod',
    args: [],
    injections: {
      context: context
    }
  }, function cb(err, results) {
    t.error(err, 'should not error');
    t.deepEqual(results, [ context, cb ]);
    t.end();
  });

  function callbackNoArgMethod(context, callback) {
    var args = slice(arguments);

    process.nextTick(function() {
      callback(null, args);
    });
  }
});

test('invoker.invoke(...) - return value - no arg method', function(t) {
  var context = new Context();

  invoke({
    service: { returnNoArgMethod: returnNoArgMethod },
    name: 'ReturnNoArgMethod',
    args: [],
    injections: {
      context: context
    }
  }, function cb(err, results) {
    t.error(err, 'should not error');
    t.deepEqual(results, [ context, cb ]);
    t.end();
  });

  function returnNoArgMethod(context, callback) {
    return slice(arguments);
  }
});

test('invoker.invoke(...) - promise - no arg method', function(t) {
  var context = new Context();

  invoke({
    service: { promiseNoArgMethod: promiseNoArgMethod },
    name: 'PromiseNoArgMethod',
    args: [],
    injections: {
      context: context
    }
  }, function cb(err, results) {
    t.error(err, 'should not error');
    t.deepEqual(results, [ context, cb ]);
    t.end();
  });

  function promiseNoArgMethod(context, callback) {
    var args = slice(arguments);

    var promise = new Promise(function(resolve, reject) {
      process.nextTick(function() {
        resolve(args);
      });
    });

    return promise;
  }
});

test('invoker.invoke(...) - cb - Error: empty arguments', function(t) {
  var context = new Context();

  t.throws(function() {
    invoke({
      service: { callbackEmptyArgs: callbackEmptyArgs },
      name: 'CallbackEmptyArgs',
      args: [],
      injections: {
        context: context
      }
    }, noop);
  });

  t.end();

  function callbackEmptyArgs() {
    var args = slice(arguments);
    var callback = arguments[arguments.length - 1];

    process.nextTick(function() {
      callback(null, args);
    });
  }
});

test('invoker.invoke(...) - return value - Error: empty args', function(t) {
  var context = new Context();

  t.throws(function() {
    invoke({
      service: { returnEmptyArgs: returnEmptyArgs },
      name: 'ReturnEmptyArgs',
      args: [],
      injections: {
        context: context
      }
    }, noop);
  });

  t.end();

  function returnEmptyArgs() {
    return slice(arguments);
  }
});

test('invoker.invoke(...) - promise - Error: empty args', function(t) {
  var context = new Context();

  t.throws(function() {
    invoke({
      service: { promiseEmptyArgs: promiseEmptyArgs },
      name: 'PromiseEmptyArgs',
      args: [],
      injections: {
        context: context
      }
    }, noop);
  });

  t.end();

  function promiseEmptyArgs() {
    var args = slice(arguments);

    var promise = new Promise(function(resolve, reject) {
      process.nextTick(function() {
        resolve(args);
      });
    });

    return promise;
  }
});

test('invoker.invoke(...) - Error: Private method', function(t) {
  var service = {
    _privateMethod: noop
  };

  invoke({
    service: service,
    name: '_privateMethod',
  }, function(err, results) {
    t.ok(err instanceof verror.NoExistError, 'should error');
    t.equal(err.message, 'Method "_privateMethod" does not exist.');
    t.end();
  });
});

test('invoker.invoke(...) - Error: Bad arguments', function(t) {
  var service = {
    myTestMethod: function(context, a, b, callback) {
      return slice(arguments);
    }
  };

  invoke({
    service: service,
    name: 'MyTestMethod',
    args: [ 'a', 'b', 'c' ]
  }, function(err, results) {
    t.ok(err instanceof verror.BadArgError, 'should error');
    t.equal(err.message, 'Expected 2 arguments but got "a, b, c"');
    t.end();
  });
});

test('invoker.invoke(...) - Error: Undefined method', function(t) {
  invoke({
    service: {},
    name: 'UndefinedMethod',
    args: [ 'a', 'b', 'c' ]
  }, function(err, res) {
    t.ok(err instanceof verror.NoExistError, 'should error');
    t.equal(err.message, 'Method "UndefinedMethod" does not exist.');
    t.end();
  });
});

test('invoker.invoke(...) - Error: Internal error', function(t) {
  var service = {
    foo: function(ctx) {}
  };

  invoke({
    service: service,
    name: 'Foo',
    args: [],
    injections: {
      // This triggers the error case being tested.
      context: undefined
    }
  }, function(err, res) {
    t.ok(err instanceof verror.InternalError, 'should error');
    t.equal(err.message,
      'Can not call invoker.invoke(...) without a context injection');
    t.end();
  });
});

test('invoker.invoke(...) - Error: Empty args expected', function(t) {
  invoke({
    service: { emptyArgs: emptyArgs },
    name: 'EmptyArgs',
    args: [ 'a', 'b', 'c' ]
  }, function(err, res) {
    t.ok(err instanceof verror.BadArgError, 'should error');
    t.equal(err.message, 'Expected 0 arguments but got "a, b, c"');
    t.end();
  });

  function emptyArgs(ctx) {
    var args = slice(arguments);
    var callback = arguments[arguments.length - 1];

    process.nextTick(function() {
      callback(null, args);
    });
  }
});

// Helper for boilerplate around `invoker.invoke(...)` test setup:
function invoke(options, cb) {
  var service = options.service;
  var name = options.name;
  var args = options.args;
  var injections = extend({
    context: new Context()
  }, options.injections);

  var invoker = new Invoker(service);

  invoker.invoke(name, args, injections, cb);
}

function noop() {}

function slice(args) {
  return Array.prototype.slice.call(args, 0);
}
