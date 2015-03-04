var test = require('prova');
var verror = require('../../src/v.io/v23/verror');
var ec = require('../../src/vdl/error-conversion');
var Types = require('../../src/vdl/types');
var Kind = require('../../src/vdl/kind');
var reduce = require('../../src/vdl/canonicalize').reduce;
var unwrap = require('../../src/vdl/type-util').unwrap;
var message = 'Something bad happened.';

var noAccessError = new verror.NoAccessError(null);
test('var err = ec.fromWireValue(struct)', function(assert) {
  var err = ec.fromWireValue({
    msg: message,
    id: noAccessError.id,
    retryCode: noAccessError.retryCode,
    paramList: ['app', 'call'],
  });

  assert.equal(err.message, message);
  assert.equal(err.id, noAccessError.id);
  assert.equal(err.retryCode, noAccessError.retryCode);
  assert.deepEqual(err.paramList, ['app', 'call']);
  assert.end();
});

test('var err = ec.fromWireValue(verror)', function(assert) {
  var errors = Object.keys(verror);
  errors.forEach(function(name) {
    var E = verror[name];
    var newE = new E(null);
    var err = ec.fromWireValue({
      id: newE.id,
      retryCode: newE.retryCode,
      msg: message
    });

    assert.ok(err instanceof E, 'should be instanceof ' + name);
    assert.ok(err instanceof Error, 'should be instanceof Error');
    assert.ok(err.stack, 'should have err.stack');
    assert.equal(err.message, message);
    assert.equal(err.id, newE.id);
    assert.equal(err.retryCode, newE.retryCode);
    assert.equal(err.toString(), err.name + ': ' + err.message);
  });

  assert.end();
});

var anyList = {
  kind: Kind.LIST,
  elem: Types.ANY,
};

function deepUnwrapParamList(paramList) {
  return reduce(paramList, anyList).val.map(function(v) {
   return unwrap(v);
  });
}

var unknownError = (new verror.UnknownError(null));
test('var struct = ec.fromNativeValue(err)', function(assert) {
  var err = new Error(message);
  var struct = ec.fromNativeValue(err, 'app', 'call');
  struct.paramList = deepUnwrapParamList(struct.paramList);
  var expectedError = new verror.UnknownError(null);
  expectedError.message = message;
  expectedError.msg = message;
  expectedError.paramList = ['app', 'call'];
  assert.deepEqual(struct, expectedError);
  assert.end();
});

// TODO: this should loop.
test('var struct = ec.fromNativeValue(verr)', function(assert) {
  var err = verror.NoAccessError(null, 'app', 'call');
  var struct = ec.fromNativeValue(err);
  struct.paramList = deepUnwrapParamList(struct.paramList);

  assert.deepEqual(struct, err);
  assert.end();
});

test('var struct = ec.fromNativeValue(string)', function(assert) {
  var struct = ec.fromNativeValue(message, 'appName', 'call');
  struct.paramList = deepUnwrapParamList(struct.paramList);

  var expectedError = new verror.UnknownError(null);
  var msg = 'appName:call: Error: ' + message;
  expectedError.message = msg;
  expectedError.msg = msg;
  expectedError.paramList = ['appName', 'call', message];

  assert.deepEqual(struct, expectedError);
  assert.end();
});

test('Error => Struct => Error', function(assert) {
  var message = 'testing JS error conversion';
  var original = new Error(message);
  var struct = ec.fromNativeValue(original);
  var converted = ec.fromWireValue(struct);

  assert.equal(struct.msg, original.message);
  assert.deepEqual(struct.id, unknownError.id);
  assert.deepEqual(struct.retryCode, unknownError.retryCode);
  assert.equal(converted.message, original.message);

  assert.end();
});
