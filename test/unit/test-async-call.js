// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('tape');
var Promise = require('../../src/lib/promise');
var asyncCall = require('../../src/lib/async-call');
var InspectableFunction = require('../../src/lib/inspectable-function');

test('Test async validate call that returns a resolving promise',
  function(t) {
  function promiseResolver(a, b) {
    t.equal(a, 'A', 'expected A');
    t.equal(b, 'B', 'expected B');
    return Promise.resolve();
  }
  var inspectFn = new InspectableFunction(promiseResolver);
  asyncCall(null, null, inspectFn, [], ['A', 'B'], function(err, res) {
    t.notOk(err, 'err should be falsy');
    t.deepEqual(res, [], 'Expected empty list result');
    t.end();
  });
});

test('Test async call that returns a rejecting promise', function(t) {
  function promiseRejector() {
    return Promise.reject('BadLuck');
  }
  var inspectFn = new InspectableFunction(promiseRejector);
  asyncCall(null, null, inspectFn, [], [], function(err) {
    t.deepEqual(err, new Error('BadLuck'), 'Expected same rejection result');
    t.end();
  });
});

test('Test async call that uses success callback', function(t) {
  function succeedingCallback(a, b, cb) {
    t.equal(a, 'A', 'expected A');
    t.equal(b, 'B', 'expected B');
    cb(null, 'O');
  }
  var inspectFn = new InspectableFunction(succeedingCallback);
  asyncCall(null, null, inspectFn, ['a'], ['A', 'B'], function(err, res) {
    t.notOk(err, 'err should be falsy');
    t.deepEqual(res, ['O'], 'expected single item output');
    t.end();
  });
});

test('Test async call that uses failing callback', function(t) {
  function failingCallback(cb) {
    cb(new Error('failingMessage'));
  }
  var inspectFn = new InspectableFunction(failingCallback);
  asyncCall(null, null, inspectFn, ['a'], [], function(err) {
    t.deepEqual(err, new Error('failingMessage'),
    'Expected same rejection result');
    t.end();
  });
});

test('Test async call that throws', function(t) {
  function asyncThrow() {
    throw 'thrown val';
  }
  var inspectFn = new InspectableFunction(asyncThrow);
  asyncCall(null, null, inspectFn, [], [], function(err) {
    t.deepEqual(err, new Error('thrown val'),
      'expected to get thrown value as error arg in callback');
      t.end();
  });
});

test('Test no results with callback', function(t) {
  function noResCallback(cb) {
    cb(null);
  }
  var inspectFn = new InspectableFunction(noResCallback);
  asyncCall(null, null, inspectFn, [], [], function(err, res) {
    t.deepEqual(res, [], 'expected empty list when no results');
    t.end();
  });
});

test('Test single result with callback', function(t) {
  function singleResCallback(cb) {
    cb(null, 'A');
  }
  var inspectFn = new InspectableFunction(singleResCallback);
  asyncCall(null, null, inspectFn, ['a'], [], function(err, res) {
    t.deepEqual(res, ['A'], 'expected single item list');
    t.end();
  });
});

test('Test multiple results with callback', function(t) {
  function multiCallback(cb) {
    cb(null, 'A', 'B', 'C');
  }
  var inspectFn = new InspectableFunction(multiCallback);
  asyncCall(null, null, inspectFn, ['a', 'b', 'c'], [], function(err, res) {
    t.deepEqual(res, ['A', 'B', 'C'], 'expected all args in array');
    t.end();
  });
});

test('Test fewer than expected results with callback', function(t) {
  function fewerCallback(cb) {
    cb(null, 'A', 'B');
  }
  var inspectFn = new InspectableFunction(fewerCallback);
  asyncCall(null, null, inspectFn, ['a', 'b', 'c'], [], function(err, res) {
    t.ok(err,
      'expected error when providing too few results with callback');
    t.end();
  });
});

test('Test greater than expected results with callback', function(t) {
  function greaterCallback(cb) {
    cb(null, 'A', 'B', 'C', 'D');
  }
  var inspectFn = new InspectableFunction(greaterCallback);
  asyncCall(null, null, inspectFn, ['a', 'b', 'c'], [], function(err, res) {
    t.ok(err,
      'expected error when providing too many results with callback');
    t.end();
  });
});

test('Test no results with promise', function(t) {
  function noResPromise() {
    return Promise.resolve();
  }
  var inspectFn = new InspectableFunction(noResPromise);
  asyncCall(null, null, inspectFn, [], [], function(err, res) {
    t.deepEqual(res, [], 'expected empty list when no results');
    t.end();
  });
});

test('Test single result with promise', function(t) {
  function singleResPromise() {
    return Promise.resolve('A');
  }
  var inspectFn = new InspectableFunction(singleResPromise);
  asyncCall(null, null, inspectFn, ['a'], [], function(err, res) {
    t.deepEqual(res, ['A'], 'expected single item list');
    t.end();
  });
});

test('Test multiple results with promise', function(t) {
  function multiPromise() {
    return Promise.resolve(['A', 'B', 'C']);
  }
  var inspectFn = new InspectableFunction(multiPromise);
  asyncCall(null, null, inspectFn, ['a', 'b', 'c'], [], function(err, res) {
    t.deepEqual(res, ['A', 'B', 'C'], 'expected all args in array');
    t.end();
  });
});

test('Test fewer than expected results with promise', function(t) {
  function fewerPromise() {
    return Promise.resolve(['A', 'B']);
  }
  var inspectFn = new InspectableFunction(fewerPromise);
  asyncCall(null, null, inspectFn, ['a', 'b', 'c'], [], function(err) {
    t.ok(err,
      'expected error when providing too few results with promise');
    t.end();
  });
});

test('Test greater than expected results with promise', function(t) {
  function greaterPromise() {
    return Promise.resolve(['A', 'B', 'C', 'D']);
  }
  var inspectFn = new InspectableFunction(greaterPromise);
  asyncCall(null, null, inspectFn, ['a', 'b', 'c'], [], function(err, res) {
    t.ok(err,
      'expected error when providing too many results with promise');
    t.end();
  });
});


test('Test no results returning directly', function(t) {
  function noRes() {
  }
  var inspectFn = new InspectableFunction(noRes);
  asyncCall(null, null, inspectFn, [], [], function(err, res) {
    t.deepEqual(res, [], 'expected empty list when no results');
    t.end();
  });
});

test('Test single result returning directly', function(t) {
  function singleRes() {
    return 'A';
  }
  var inspectFn = new InspectableFunction(singleRes);
  asyncCall(null, null, inspectFn, ['a'], [], function(err, res) {
    t.deepEqual(res, ['A'], 'expected single item list');
    t.end();
  });
});

test('Test multiple results returning directly', function(t) {
  function multiRes() {
    return ['A', 'B', 'C'];
  }
  var inspectFn = new InspectableFunction(multiRes);
  asyncCall(null, null, inspectFn, ['a', 'b', 'c'], [], function(err, res) {
    t.deepEqual(res, ['A', 'B', 'C'], 'expected all args in array');
    t.end();
  });
});

test('Test fewer than expected results returning directly', function(t) {
  function fewerRes() {
    return ['A', 'B'];
  }
  var inspectFn = new InspectableFunction(fewerRes);
  asyncCall(null, null, inspectFn, ['a', 'b', 'c'], [], function(err) {
    t.ok(err,
      'expected error when providing too few results with promise');
    t.end();
  });
});

test('Test greater than expected results returning directly', function(t) {
  function greaterRes() {
    return ['A', 'B', 'C', 'D'];
  }
  var inspectFn = new InspectableFunction(greaterRes);
  asyncCall(null, null, inspectFn, ['a', 'b', 'c'], [], function(err, res) {
    t.ok(err,
      'expected error when providing too many results with promise');
    t.end();
  });
});

test('Test returning non-undefined to zero out arg function fails',
  function(t) {
  function returnNonUndefined() {
    return 5;
  }
  var inspectFn = new InspectableFunction(returnNonUndefined);
  asyncCall(null, null, inspectFn, [], [], function(err) {
    t.ok((''+err).indexOf(
      'Expected 0 results, but got 1') !== -1,
      'Expected error when non-undefined value returned');
    t.end();
  });
});

test('Test callback only called once',
  function(t) {
  function callbackOnce(cb) {
    cb(null, 'A');
    cb(null, 'B');
  }
  var inspectFn = new InspectableFunction(callbackOnce);
  asyncCall(null, null, inspectFn, ['a'], [], function(err, res) {
    t.deepEqual(res, ['A'], 'expected to get result of first callback');
    t.end();
  });
});

test('Test setting "this" for invocation', function(t) {
  var obj = {
    set: false,
    f: function() {
      this.set = true;
      return Promise.resolve();
    }
  };
  var inspectFn = new InspectableFunction(obj.f);
  asyncCall(null, obj, inspectFn, [], [], function(err) {
    t.notOk(err, 'did not expect error');
    t.equal(obj.set, true, 'should set to true');
    t.end();
  });
});
