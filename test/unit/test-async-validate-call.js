var test = require('prova');
var Promise = require('../../src/lib/promise');
var asyncCall = require('../../src/ipc/async-validate-call');

test('Test async validate call that returns a resolving promise', function(t) {
  function promiseResolver(a, b) {
    t.equal(a, 'A', 'expected A');
    t.equal(b, 'B', 'expected B');
    return Promise.resolve();
  }
  var res = asyncCall(promiseResolver, 'A', 'B');
  if (!res.then) {
    t.end('call result is then-able');
  }
  res.then(function(result) {
    t.equal(result, undefined, 'Expected undefined result');
    t.end();
  }).catch(function(e) {
    t.end(e || 'unexpected failure');
  });
});

test('Test async call that returns a rejecting promise', function(t) {
  function promiseRejector() {
    return Promise.reject('BadLuck');
  }
  var res = asyncCall(promiseRejector);
  if (!res.then) {
    t.end('call result is then-able');
  }
  res.then(function() {
    t.end('unexpected success');
  }).catch(function(e) {
    t.equal(e, 'BadLuck', 'Expected same rejection result');
    t.end();
  });
});

test('Test async call that uses success callback', function(t) {
  function succeedingCallback(a, b, cb) {
    t.equal(a, 'A', 'expected A');
    t.equal(b, 'B', 'expected B');
    cb(null);
  }
  var res = asyncCall(succeedingCallback, 'A', 'B');
  if (!res.then) {
    t.end('call result is then-able');
  }
  res.then(function(result) {
    t.deepEqual(result, undefined, 'Got undefined from callback');
    t.end();
  }).catch(function(e) {
    t.end(e || 'unexpected failure');
  });
});

test('Test async call that uses failing callback', function(t) {
  function failingCallback(cb) {
    cb('failingMessage');
  }
  var res = asyncCall(failingCallback);
  if (!res.then) {
    t.end('call result is then-able');
  }
  res.then(function() {
    t.end('unexpected success');
  }).catch(function(e) {
    t.equal(e, 'failingMessage', 'Expected same rejection result');
    t.end();
  });
});

test('Test async call that returns null',
  function(t) {
  function nullResult(cb) {
    return null;
  }
  var res = asyncCall(nullResult);
  if (!res.then) {
    t.end('call result is then-able');
  }
  res.then(function() {
    t.end();
  }).catch(function(e) {
    t.end(e || 'unexpected failure');
  });
});

test('Test async call that returns non-null or thenable object',
  function(t) {
  function nonThenableResult(cb) {
    return 'res';
  }
  var res = asyncCall(nonThenableResult);
  if (!res.then) {
    t.end('call result is then-able');
  }
  res.then(function(result) {
    t.end('unexpected success');
  }).catch(function() {
    t.end();
  });
});

test('Test async call that throws',
  function(t) {
  function nullResult(cb) {
    throw 'thrown val';
  }
  var res = asyncCall(nullResult);
  if (!res.then) {
    t.end('call result is then-able');
  }
  res.then(function() {
    t.end('expected to reject after thrown result');
  }).catch(function(e) {
    t.equal(e, 'thrown val', 'Expected same rejection result');
    t.end();
  });
});
