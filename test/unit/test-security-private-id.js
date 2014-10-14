var PublicId = require('../../src/security/public.js');
var test = require('prova');

test('id.match(pattern)', function(assert) {
  // wildcard
  assert.ok(match({
    names: [ 'veyron/batman' ],
    pattern: '...'
  }));

  assert.ok(match({
    names: [ 'veyron/brucewayne' ],
    pattern: '...'
  }));

  assert.ok(match({
    names: [ 'veyron/batman' ],
    pattern: 'veyron/batman/...'
  }));

  assert.notOk(match({
    names: [ 'veyron/brucewayne' ],
    pattern: 'veyron/batman/...'
  }));

  assert.ok(match({
    names: [ 'veyron/batman/car' ],
    pattern: 'veyron/batman/...'
  }));

  assert.ok(match({
    names: [ 'veyron' ],
    pattern: 'veyron/batman/...'
  }));

  assert.ok(match({
    names: [ 'veyron' ],
    pattern: 'veyron/batman/car/...'
  }));

  assert.ok(match({
    names: [ 'veyron/batman/car', 'veyron/brucewayne/car' ],
    pattern: 'veyron/batman/...'
  }));

  assert.notOk(match({
    names: [ 'veyron/batman/car', 'veyron/brucewayne/car' ],
    pattern: 'veyron/superman/...'
  }));

  // exact match
  assert.ok(match({
    names: [ 'veyron/batman' ],
    pattern: 'veyron/batman'
  }));

  assert.ok(match({
    names: [ 'veyron/batman', 'veyron/brucewayne' ],
    pattern: 'veyron/batman'
  }));

  assert.notOk(match({
    names: [ 'veyron/batman', 'veyron/brucewayne' ],
    pattern: 'veyron/superman'
  }));

  // no match
  assert.notOk(match({
    names: [ 'veyron/batman' ],
    pattern: 'veyron/brucewayne'
  }));

  assert.notOk(match({
    names: [ 'veyron/batman/car' ],
    pattern: 'veyron/batman'
  }));

  // matches the blessor of the name
  assert.ok(match({
    names: [ 'veyron' ],
    pattern: 'veyron/batman'
  }));

  assert.ok(match({
    names: [ 'veyron' ],
    pattern: 'veyron/batman/car'
  }));

  assert.end();
});

function match(options) {
  var id = new PublicId(options.names);

  return id.match(options.pattern);
}
