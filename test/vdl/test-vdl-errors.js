var test = require('prova');
var verror = require('../../src/v.io/core/veyron2/verror');
var ec = require('../../src/vdl/error-conversion');
var message = 'Something bad happened.';

var noAccessIdAction = (new verror.NoAccessError(null)).iDAction;
test('var err = ec.toJSerror(struct)', function(assert) {
  var err = ec.toJSerror({
    msg: message,
    iDAction: noAccessIdAction,
    paramList: ['app', 'call'],
  });

  assert.equal(err.message, message);
  assert.deepEqual(err.paramList, ['app', 'call']);
  assert.deepEqual(err.iDAction, noAccessIdAction);
  assert.end();
});

test('var err = ec.toJSerror(verror)', function(assert) {
  var errors = Object.keys(verror);
  errors.forEach(function(name) {
    var E = verror[name];
    var idAction = (new E(null)).iDAction;
    var err = ec.toJSerror({
      iDAction: idAction,
      msg: message
    });

    assert.ok(err instanceof E, 'should be instanceof ' + name);
    assert.ok(err instanceof Error, 'should be instanceof Error');
    assert.ok(err.stack, 'should have err.stack');
    assert.deepEqual(err.iDAction, idAction);
    assert.equal(err.message, message);
    assert.equal(err.toString(), err.name + ': ' + err.message);
  });

  assert.end();
});
