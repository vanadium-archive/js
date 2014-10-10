var test = require('prova');
var verror = require('../../src/lib/verror');
var ec = require('../../src/proxy/error_conversion');
var message = 'Something bad happened.';

test('var struct = ec.toStandardErrorStruct(err)', function(assert) {
  var err = new Error(message);
  var struct = ec.toStandardErrorStruct(err);

  assert.deepEqual(struct, {
    msg: message,
    idAction: verror.IdActions.Unknown
  });
  assert.end();
});

// TODO: this should loop.
test('var struct = ec.toStandardErrorStruct(verr)', function(assert) {
  var err = verror.NoAccessError(message);
  var struct = ec.toStandardErrorStruct(err);

  assert.deepEqual(struct, {
    msg: message,
    idAction: verror.IdActions.NoAccess
  });
  assert.end();
});

test('var struct = ec.toStandardErrorStruct(string)', function(assert) {
  var struct = ec.toStandardErrorStruct(message);

  assert.deepEqual(struct, {
    msg: message,
    idAction: verror.IdActions.Unknown
  });
  assert.end();
});

test('var struct = ec.toStandardErrorStruct()', function(assert) {
  var struct = ec.toStandardErrorStruct();

  assert.deepEqual(struct, {
    msg: '',
    idAction: verror.IdActions.Unknown
  });
  assert.end();
});

test('var struct = ec.toStandardErrorStruct(null)', function(assert) {
  var struct = ec.toStandardErrorStruct(null);

  assert.deepEqual(struct, {
    msg: '',
    idAction: verror.IdActions.Unknown
  });
  assert.end();
});

test('var err = ec.toJSerror(struct)', function(assert) {
  var struct = {
    msg: message,
    iDAction: verror.IdActions.NoAccess
  };
  var err = ec.toJSerror(struct);

  assert.equal(err.message, message);
  assert.deepEqual(err.idAction, verror.IdActions.NoAccess);
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
  assert.deepEqual(err.idAction, verror.IdActions.Unknown);
  assert.end();
});

test('var err = ec.toJSerror(verror)', function(assert) {
  var errors = [
    'AbortedError',
    'BadArgError',
    'BadProtocolError',
    'ExistsError',
    'InternalError',
    'NoAccessError',
    'NoExistError',
    'NoExistOrNoAccessError'
  ];

  errors.forEach(function(key) {
    var ctor = verror[key];
    var idAction = verror.IdActions[key.replace('Error', '')];
    var err = ec.toJSerror({
      iDAction: idAction,
      msg: message
    });

    assert.ok(err instanceof ctor, 'should be instanceof ' + key);
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
  assert.deepEqual(struct.idAction, verror.IdActions.Unknown);
  assert.equal(converted.message, original.message);

  assert.end();
});
