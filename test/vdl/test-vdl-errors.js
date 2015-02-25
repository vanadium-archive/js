var test = require('prova');
var verror = require('../../src/v.io/v23/verror');
var ec = require('../../src/vdl/error-conversion');
var message = 'Something bad happened.';

var noAccessError = new verror.NoAccessError(null);
test('var err = ec.toJSerror(struct)', function(assert) {
  var err = ec.toJSerror({
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

test('var err = ec.toJSerror(verror)', function(assert) {
  var errors = Object.keys(verror);
  errors.forEach(function(name) {
    var E = verror[name];
    var newE = new E(null);
    var err = ec.toJSerror({
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
