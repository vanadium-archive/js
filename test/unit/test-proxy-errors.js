var test = require('prova');
var verror = require('../../src/errors/verror');
var ec = require('../../src/proxy/error-conversion');
var Context = require('../../src/runtime/context').Context;
var message = 'Something bad happened.';

var unknownIdAction = (new verror.UnknownError(new Context())).idAction;
var noAccessIdAction = (new verror.NoAccessError(new Context())).idAction;
test('var struct = ec.toStandardErrorStruct(err)', function(assert) {
  var err = new Error(message);
  var struct = ec.toStandardErrorStruct(err, 'app', 'call');

  assert.deepEqual(struct, {
    msg: message,
    idAction: unknownIdAction,
    paramList: ['app', 'call'],
  });
  assert.end();
});

// TODO: this should loop.
test('var struct = ec.toStandardErrorStruct(verr)', function(assert) {
  var err = verror.NoAccessError(new Context(), 'app', 'call');
  var struct = ec.toStandardErrorStruct(err);

  assert.deepEqual(struct, {
    msg: 'app:op: Access denied: app call',
    idAction: err.idAction,
    paramList: ['app', 'op', 'app', 'call'],
  });
  assert.end();
});

test('var struct = ec.toStandardErrorStruct(string)', function(assert) {
  var struct = ec.toStandardErrorStruct(message, 'appName', 'call');

  assert.deepEqual(struct, {
    msg: 'appName:call: Error: ' + message,
    idAction: unknownIdAction,
    paramList: ['appName', 'call', message],
  });
  assert.end();
});

test('var struct = ec.toStandardErrorStruct()', function(assert) {
  var struct = ec.toStandardErrorStruct();

  assert.deepEqual(struct, {
    msg: '',
    idAction: unknownIdAction,
    paramList: [],
  });
  assert.end();
});

test('var struct = ec.toStandardErrorStruct(null)', function(assert) {
  var struct = ec.toStandardErrorStruct(null);

  assert.deepEqual(struct, {
    msg: '',
    idAction: unknownIdAction,
    paramList: [],
  });
  assert.end();
});

test('var err = ec.toJSerror(struct)', function(assert) {
  var err = ec.toJSerror({
    msg: message,
    iDAction: noAccessIdAction,
    paramList: ['app', 'call'],
  });

  assert.equal(err.message, message);
  assert.deepEqual(err.paramList, ['app', 'call']);
  assert.deepEqual(err.idAction, noAccessIdAction);
  assert.end();
});

test('var err = ec.toJSerror(struct) - missing id', function(assert) {
  var struct = {
    msg: message,
    iDAction: {
      id: '',
      action: 0
    }
  };
  var err = ec.toJSerror(struct);

  assert.equal(err.message, message);
  assert.deepEqual(err.idAction, unknownIdAction);
  assert.end();
});

test('var err = ec.toJSerror(verror)', function(assert) {
  var errors = Object.keys(verror);
  errors.forEach(function(name) {
    var E = verror[name];
    var idAction = (new E(new Context())).idAction;
    var err = ec.toJSerror({
      iDAction: idAction,
      msg: message
    });

    assert.ok(err instanceof E, 'should be instanceof ' + name);
    assert.ok(err instanceof Error, 'should be instanceof Error');
    assert.ok(err.stack, 'should have err.stack');
    assert.deepEqual(err.idAction, idAction);
    assert.equal(err.message, message);
    assert.equal(err.toString(), err.name + ': ' + err.message);
  });

  assert.end();
});

test('Error => Struct => Error', function(assert) {
  var message = 'testing JS error conversion';
  var original = new Error(message);
  var struct = ec.toStandardErrorStruct(original);
  var converted = ec.toJSerror(struct);

  assert.equal(struct.msg, original.message);
  assert.deepEqual(struct.idAction, unknownIdAction);
  assert.equal(converted.message, original.message);

  assert.end();
});
