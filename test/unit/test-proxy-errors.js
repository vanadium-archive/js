var test = require('prova');
var verror = require('../../src/lib/verror');
var ec = require('../../src/proxy/error_conversion');
var message = 'Something bad happened.';
var name = 'TestError';

test('var struct = ec.toStandardErrorStruct(err)', function(assert) {
  /*
  var err = new Error(message);

  err.name = name;

  var struct = ec.toStandardErrorStruct(err);

  assert.equal(struct.idAction.id, name);
  assert.equal(struct.msg, message);
*/
  var err = new Error(message);
  var struct = ec.toStandardErrorStruct(err);

  assert.equal(struct.idAction.id, 'unknown');
  assert.equal(struct.msg, message);

  err = verror.NoAccessError(message);
  struct = ec.toStandardErrorStruct(err);

  assert.equal(struct.idAction.id, verror.IdActions.NoAccess.id);
  assert.equal(struct.msg, message);

  struct = ec.toStandardErrorStruct(message);

  assert.equal(struct.idAction.id, 'unknown');
  assert.equal(struct.msg, message);

  struct = ec.toStandardErrorStruct();

  assert.equal(struct.idAction.id, 'unknown');
  assert.equal(struct.msg, '');

  assert.end();
});

test('var err = ec.toJSerror(struct)', function(assert) {
  var err = ec.toJSerror({
    iDAction: {
      iD: name,
      action: 0,
    },
    msg: message
  });

  assert.equal(err.name, name);
  assert.equal(err.message, message);

  err = ec.toJSerror({
    iDAction: {
      iD: '',
      action: 0,
    },
    msg: message
  });

  assert.equal(err.name, 'Error');
  assert.equal(err.message, message);

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
    assert.equal(err.name, idAction.id);
    assert.equal(err.message, message);
    assert.equal(err.toString(), err.name + ': ' + err.message);
  });

  assert.end();
});
