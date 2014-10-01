var test = require('prova');
var verror = require('../../src/lib/verror.js');
var VeyronError = verror.VeyronError;
var message = 'test error message';
var errors = Object.keys(verror.Ids).map(idToErrorName);

errors.forEach(function(key) {
  test('verror.' + key, function(assert) {
    var Ctor = verror[key];
    var err = new Ctor(message);
    var id = verror.Ids[key.replace('Error', '')];

    assert.ok(Ctor() instanceof Ctor, 'should not require "new"'); // jshint ignore:line
    assert.ok(err instanceof Ctor, 'should be instanceof ' + key);
    assert.ok(err instanceof VeyronError, 'should be instanceof VeyronError');
    assert.ok(err instanceof Error, 'should be instanceof Error');
    assert.ok(err.stack, 'should have err.stack');
    assert.equal(err.name, id);
    assert.equal(err.message, message);
    assert.equal(err.toString(), err.name + ': ' + err.message);
    assert.end();
  });
});

function idToErrorName(id) {
  var prefix = 'veyron.io/veyron/veyron2/verror.';
  var name = id.replace(prefix, '');

  name += 'Error';

  return name;
}
