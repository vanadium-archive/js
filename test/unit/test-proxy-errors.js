var test = require('prova');
var verror = require('../../src/lib/verror');
var ec = require('../../src/proxy/error_conversion');
var message = 'Something bad happened.';
var name = 'TestError';

test('var struct = ec.toStandardErrorStruct(err)', function(assert) {
  var err = new Error(message);

  err.name = name;

  var struct = ec.toStandardErrorStruct(err);

  assert.equal(struct.iD, name);
  assert.equal(struct.msg, message);

  err = new Error(message);
  struct = ec.toStandardErrorStruct(err);

  assert.equal(struct.iD, '');
  assert.equal(struct.msg, message);

  err = verror.NoAccessError(message);
  struct = ec.toStandardErrorStruct(err);

  assert.equal(struct.iD, verror.Ids.NoAccess);
  assert.equal(struct.msg, message);

  struct = ec.toStandardErrorStruct(message);

  assert.equal(struct.iD, '');
  assert.equal(struct.msg, message);

  struct = ec.toStandardErrorStruct();

  assert.equal(struct.iD, '');
  assert.equal(struct.msg, '');

  assert.end();
});

test('var err = ec.toJSerror(struct)', function(assert) {
  var err = ec.toJSerror({
    iD: name,
    msg: message
  });

  assert.equal(err.name, name);
  assert.equal(err.message, message);

  err = ec.toJSerror({
    iD: '',
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
    var id = verror.Ids[key.replace('Error', '')];
    var err = ec.toJSerror({
      iD: id,
      msg: message
    });

    assert.ok(err instanceof ctor, 'should be instanceof ' + key);
    assert.ok(err instanceof Error, 'should be instanceof Error');
    assert.ok(err.stack, 'should have err.stack');
    assert.equal(err.name, id);
    assert.equal(err.message, message);
    assert.equal(err.toString(), err.name + ': ' + err.message);
  });

  assert.end();
});
