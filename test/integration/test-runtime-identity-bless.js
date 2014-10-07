var test = require('prova');
var veyron = require('../../');
var caveat = require('../../src/security/caveat');
var MethodCaveat = caveat.MethodCaveat;
var PeerBlessingsCaveat = caveat.PeerBlessingsCaveat;

test('i.bless(..., callback)', function(assert) {
  identity('alice', function(err, id, runtime) {
    assert.error(err);

    var name = 'bob';
    var duration = 1000;
    var caveats = null;

    runtime
    .identity
    .bless(id, name, duration, caveats, function(err, blessing) {
      assert.error(err);
      assert.equal(blessing.names[0], 'test/bob');
      runtime.close(assert.end);
    });
  });
});

test('var promise = i.bless(...)', function(assert) {
  identity('alice', function(err, id, runtime) {
    assert.error(err);

    var name = 'bob';
    var duration = 1000;
    var caveats = null;

    runtime
    .identity
    .bless(id, name, duration, caveats)
    .then(function(blessing) {
      assert.equal(blessing.names[0], 'test/bob');
      runtime.close(assert.end);
    })
    .catch(function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});

test('i.bless(..., callback) - caveats', function(assert) {
  identity('alice', function(err, id, runtime) {
    assert.error(err);

    var name = 'bob';
    var duration = 1000;
    var caveats = [
      new MethodCaveat(['Foo', 'Bar']),
      new PeerBlessingsCaveat(['veyron/batman'])
    ];


    runtime
    .identity
    .bless(id, name, duration, caveats, function(err, blessing) {
      assert.error(err);
      assert.equal(blessing.names[0], 'test/bob');
      runtime.close(assert.end);
    });
  });
});

test('var promise = i.bless(...) - caveats', function(assert) {
  identity('alice', function(err, id, runtime) {
    assert.error(err);

    var name = 'bob';
    var duration = 1000;
    var caveats = [
      new MethodCaveat(['Foo', 'Bar']),
      new PeerBlessingsCaveat(['veyron/batman'])
    ];

    runtime
    .identity
    .bless(id, name, duration, caveats)
    .then(function(blessing) {
      assert.equal(blessing.names[0], 'test/bob');
      runtime.close(assert.end);
    })
    .catch(function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});

test('i.bless(..., callback) - bad caveats failure', function(assert) {
  identity('alice', function(err, id, runtime) {
    assert.error(err);

    var name = 'bob';
    var duration = 1000;
    var caveats = [ 3, 4, 5 ];


    runtime
    .identity
    .bless(id, name, duration, caveats, function(err, blessing) {
      assert.ok(err, 'should error');
      runtime.close(assert.end);
    });
  });
});

test('var promise = i.bless(...) - bad caveats failure', function(assert) {
  identity('alice', function(err, id, runtime) {
    assert.error(err);

    var name = 'bob';
    var duration = 1000;
    var caveats = [ 3, 4, 5 ];


    runtime
    .identity
    .bless(id, name, duration, caveats)
    .then(function() {
      assert.fail('should not succeed');
      runtime.close(assert.end);
    })
    .catch(function(err) {
      assert.ok(err, 'should error');
      runtime.close(assert.end);
    });
  });
});


function identity(name, callback) {
  var port = require('../services/config-wsprd').flags.port;
  var config = {
    wspr: 'http://localhost:' + port
  };

  veyron.init(config, function(err, runtime) {
    if (err) {
      return callback(err);
    }

    runtime.newIdentity(name, function(err, id) {
      callback(err, id, runtime);
    });
  });
}
