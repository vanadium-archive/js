// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var verror = require('../../').verror;
var Invoker = require('../../src/invocation/invoker.js');
var Context = require('../../src/context').Context;
var Promise = require('../../src/lib/promise');
var vdl = require('../../src/vdl');
var extend = require('xtend');

var _fiveOutArgSig = [
  {
    methods: [
      {
        'name': 'FiveOutArgMethod',
        'outArgs': [
          {
            name: 'A',
            type: vdl.types.ANY
          },
          {
            name: 'B',
            type: vdl.types.ANY
          },
          {
            name: 'C',
            type: vdl.types.ANY
          },
          {
            name: 'D',
            type: vdl.types.ANY
          },
          {
            name: 'E',
            type: vdl.types.ANY
          }
        ]
      }
    ]
  }
];

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
    t.deepEqual(results, [ 'result' ],
      'callback args match');
    t.end();
  });

  // Hoisted into the service object above.
  function callbackMethod(context, serverCall, a, b, c, d, callback) {
    process.nextTick(function() {
      callback(null, 'result');
    });
  }
});

test('invoker.invoke(...) - cb single value', function(t) {
  var context = new Context();

  invoke({
    service: { callbackMethod: callbackMethod },
    name: 'CallbackMethod',
    args: [ ],
    injections: {
      context: context
    }
  }, function cb(err, results) {
    t.error(err, 'should not error');
    t.deepEqual(results, [ 'ret' ],
      'callback args match');
    t.end();
  });

  // Hoisted into the service object above.
  function callbackMethod(context, serverCall, callback) {
    process.nextTick(function() {
      callback(null, 'ret');
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
    t.deepEqual(results,
      [ [ context, 'a', 'b', 'c', 'd' ] ]);
    t.end();
  });

  // Hoisted into the service object above.
  function returnMethod(context, serverCall, a, b, c, d) {
    return [ context, a, b, c, d ];
  }
});

test('invoker.invoke(...) - return value w/ 5 out args', function(t) {
  var context = new Context();

  invoke({
    service: {
      fiveOutArgMethod: returnMethod,
      _serviceDescription: _fiveOutArgSig
    },
    name: 'FiveOutArgMethod',
    args: [ 'a', 'b', 'c', 'd' ],
    injections: {
      context: context
    }
  }, function cb(err, results) {
    t.error(err, 'should not error');
    t.deepEqual(results, [ context, 'a', 'b', 'c', 'd' ]);
    t.end();
  });

  // Hoisted into the service object above.
  function returnMethod(context, serverCall, a, b, c, d) {
    return [ context, a, b, c, d ];
  }
});

test('invoker.invoke(...) - return single value', function(t) {
  var context = new Context();

  invoke({
    service: { returnMethod: returnMethod },
    name: 'ReturnMethod',
    args: [ ],
    injections: {
      context: context
    }
  }, function cb(err, results) {
    t.error(err, 'should not error');
    t.deepEqual(results, [ 'ret' ]);
    t.end();
  });

  // Hoisted into the service object above.
  function returnMethod(context, serverCall) {
    return 'ret';
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
    t.deepEqual(results, [ [ context, 'a', 'b', 'c', 'd' ] ]);
    t.end();
  });

  // Hoisted into the service object above.
  function promiseMethod(context, serverCall, a, b, c, d) {
    var args = [ context, a, b, c, d ];

    var promise = new Promise(function(resolve, reject) {
      process.nextTick(function() {
        resolve(args);
      });
    });

    return promise;
  }
});

test('invoker.invoke(...) - promise w/ 5 out args', function(t) {
  var context = new Context();

invoke({
    service: {
      fiveOutArgMethod: promiseMethod,
      _serviceDescription: _fiveOutArgSig
    },
    name: 'FiveOutArgMethod',
    args: [ 'a', 'b', 'c', 'd' ],
    injections: {
      context: context
    }
  }, function cb(err, results) {
    t.error(err, 'should not error');
    t.deepEqual(results, [ context, 'a', 'b', 'c', 'd' ]);
    t.end();
  });

  // Hoisted into the service object above.
  function promiseMethod(context, serverCall, a, b, c, d) {
    var args = [ context, a, b, c, d ];

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
    t.deepEqual(results, [ 'shortNameResult' ]);
    t.end();
  });

  function callbackShortNames(ctx, serverCall, cb) {
    cb(null, 'shortNameResult');
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
    t.deepEqual(results, [ 'shortNameResult' ]);
    t.end();
  });

  function promiseShortNames(ctx, serverCall) {
    var promise = new Promise(function(resolve, reject) {
      resolve('shortNameResult');
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
      stream: stream,
      call: {},
    }
  }, function cb(err, results) {
    t.error(err, 'should not error');
    t.deepEqual(results, [ [ context, {}, 'a', 'b', stream, 'c', 'd' ] ]);
    t.end();
  });

  // Hoisted into the service object above.
  function callbackStreamMethod(context, serverCall,
                                a, b, $stream, c, d, callback) {
    var args = slice(arguments, 0, 7);

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
      stream: stream,
      call: {},
    }
  }, function cb(err, results) {
    t.error(err, 'should not error');
    t.deepEqual(results, [ [ context, {},'a', 'b', stream, 'c', 'd' ] ]);
    t.end();
  });

  // Hoisted into the service object above.
  function returnStreamMethod(context, serverCall, a, b, $stream, c, d) {
    return slice(arguments, 0, 7);
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
      stream: stream,
      call: {},
    }
  }, function cb(err, results) {
    t.error(err, 'should not error');
    t.deepEqual(results, [ [ context, {}, 'a', 'b', stream, 'c', 'd' ] ]);
    t.end();
  });

  // Hoisted into the service object above.
  function promiseStreamMethod(context, serverCall, a, b, $stream, c, d) {
    var args = slice(arguments, 0, 7);

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

  KVStore.prototype.get = function(context, serverCall, key, callback) {
    callback(null, this.store[key]);
  };

  var service = new KVStore();

  invoke({
    service: service,
    name: 'Get',
    args: [ 'foo' ]
  }, function(err, result) {
    t.error(err, 'should not error');
    t.deepEqual(result, [ 'bar' ]);
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
    t.deepEqual(results, [ context ]);
    t.end();
  });

  function callbackNoArgMethod(context, serverCall, callback) {
    process.nextTick(function() {
      callback(null, context);
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
    t.deepEqual(results, [ context ]);
    t.end();
  });

  function returnNoArgMethod(context, serverCall) {
    return context;
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
    t.deepEqual(results, [ context ]);
    t.end();
  });

  function promiseNoArgMethod(context, serverCall) {
    var promise = new Promise(function(resolve, reject) {
      process.nextTick(function() {
        resolve(context);
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
    t.ok(err, 'should error');
    t.ok(err instanceof verror.NoExistError, 'should error');
    t.equal(err.message, 'app:op: Does not exist: Method "_privateMethod"');
    t.end();
  });
});

test('invoker.invoke(...) - Error: Bad arguments', function(t) {
  var service = {
    myTestMethod: function(context, serverCall, a, b, callback) {
      return slice(arguments);
    }
  };

  invoke({
    service: service,
    name: 'MyTestMethod',
    args: [ 'a', 'b', 'c' ]
  }, function(err, results) {
    t.ok(err instanceof verror.BadArgError, 'should error');
    t.equal(err.message,
            'app:op: Bad argument: Expected 2 arguments but got "a, b, c"');
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
    t.equal(err.message, 'app:op: Does not exist: Method "UndefinedMethod"');
    t.end();
  });
});

test('invoker.invoke(...) - Error: Internal error', function(t) {
  var service = {
    foo: function(ctx, serverCall) {}
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
      'app:op: Internal error: ' +
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
    t.equal(err.message,
            'app:op: Bad argument: Expected 0 arguments but got "a, b, c"');
    t.end();
  });

  function emptyArgs(ctx, serverCall) {
    var args = slice(arguments);
    var callback = arguments[arguments.length - 1];

    process.nextTick(function() {
      callback(null, args);
    });
  }
});

test('invoker.invoke(...) - Error: More outArgs expected [promise]',
  function(t) {

  var context = new Context();

  invoke({
    service: {
      fiveOutArgMethod: notEnoughOutArgs,
      _serviceDescription: _fiveOutArgSig
    },
    name: 'FiveOutArgMethod',
    args: [ 'a', 'b', 'c', 'd' ],
    injections: {
      context: context
    }
  }, function cb(err, results) {
    t.ok(err instanceof verror.VanadiumError, 'should error');
    t.equal(err.message,
      'app:op: IncorrectResultCount: Expected 5 results, but got 4');
    t.end();
  });

  // Hoisted into the service object above.
  function notEnoughOutArgs(ctx, serverCall, a, b, c, d) {
    return [ a, b, c, d ]; // needs 5, not 4
  }
});

test('invoker.invoke(...) - Error: More outArgs expected [callback]',
  function(t) {

  var context = new Context();

  invoke({
    service: {
      fiveOutArgMethod: notEnoughOutArgs,
      _serviceDescription: _fiveOutArgSig
    },
    name: 'FiveOutArgMethod',
    args: [ 'a', 'b', 'c', 'd' ],
    injections: {
      context: context
    }
  }, function cb(err, results) {
    t.ok(err instanceof verror.VanadiumError, 'should error');
    t.equal(err.message,
      'app:op: IncorrectResultCount: Expected 5 results, but got 4');
    t.end();
  });

  // Hoisted into the service object above.
  function notEnoughOutArgs(ctx, serverCall, a, b, c, d, cb) {
    cb(null, a, b, c, d); // needs 5, not 4
  }
});

test('invoker.invoke(...) - Error: Fewer outArgs expected [promise]',
  function(t) {

  var context = new Context();

  invoke({
    service: {
      fiveOutArgMethod: tooManyOutArgs,
      _serviceDescription: _fiveOutArgSig
    },
    name: 'FiveOutArgMethod',
    args: [ 'a', 'b', 'c', 'd' ],
    injections: {
      context: context
    }
  }, function cb(err, results) {
    t.ok(err instanceof verror.VanadiumError, 'should error');
    t.equal(err.message,
      'app:op: IncorrectResultCount: Expected 5 results, but got 6');
    t.end();
  });

  // Hoisted into the service object above.
  function tooManyOutArgs(ctx, serverCall, a, b, c, d) {
    return [ a, b, c, d, d, d ]; // needs 5, not 6
  }
});

test('invoker.invoke(...) - Error: Fewer outArgs expected [callback]',
  function(t) {

  var context = new Context();

  invoke({
    service: {
      fiveOutArgMethod: tooManyOutArgs,
      _serviceDescription: _fiveOutArgSig
    },
    name: 'FiveOutArgMethod',
    args: [ 'a', 'b', 'c', 'd' ],
    injections: {
      context: context
    }
  }, function cb(err, results) {
    t.ok(err instanceof verror.VanadiumError, 'should error');
    t.equal(err.message,
      'app:op: IncorrectResultCount: Expected 5 results, but got 6');
    t.end();
  });

  // Hoisted into the service object above.
  function tooManyOutArgs(ctx, serverCall, a, b, c, d, cb) {
    return cb(null, a, b, c, d, d, d); // needs 5, not 6
  }
});

test('new Invoker(...) - Error: Cannot inspect', function(t) {
  t.throws(function() {
    return new Invoker({
      boundFn: function(){}.bind()
    });
  },
  null,
  'Expected to throw when constructed with bound function.');
  t.end();
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

function slice(args, index1, index2) {
  return Array.prototype.slice.call(args, index1, index2);
}
