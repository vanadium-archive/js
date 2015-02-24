var test = require('prova');
var verror = require('../../src/v.io/v23/verror');
var ec = require('../../src/proxy/error-conversion');
var vdlec = require('../../src/vdl/error-conversion');
var Context = require('../../src/runtime/context').Context;
var message = 'Something bad happened.';

var unknownIdAction = (new verror.UnknownError(new Context())).iDAction;
test('var struct = ec.toStandardErrorStruct(err)', function(assert) {
  var err = new Error(message);
  var struct = ec.toStandardErrorStruct(err, 'app', 'call');
  var expectedError = new verror.UnknownError(null);
  expectedError.message = message;
  expectedError.msg = message;
  expectedError.paramList = ['app', 'call'];
  assert.deepEqual(struct, expectedError);
  assert.end();
});

// TODO: this should loop.
test('var struct = ec.toStandardErrorStruct(verr)', function(assert) {
  var err = verror.NoAccessError(new Context(), 'app', 'call');
  var struct = ec.toStandardErrorStruct(err);

  assert.deepEqual(struct, err);
  assert.end();
});

test('var struct = ec.toStandardErrorStruct(string)', function(assert) {
  var struct = ec.toStandardErrorStruct(message, 'appName', 'call');

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
  var struct = ec.toStandardErrorStruct(original);
  var converted = vdlec.toJSerror(struct);

  assert.equal(struct.msg, original.message);
  assert.deepEqual(struct.iDAction, unknownIdAction);
  assert.equal(converted.message, original.message);

  assert.end();
});
