// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var vanadium = require('../../');
var config = require('./default-config');

// TODO(bprosnitz) Remove MethodCaveat after WSPR is updated to use the new
// format caveats.
function MethodCaveat(methods) {
  this._methods = methods;
}
MethodCaveat.prototype.toJSON = function() {
  return {
    _type: 'MethodCaveat',
    data: this._methods
 };
};


test('Test blessing bob without caveats - ' +
  'i.bless(..., callback)', function(assert) {
  newBlessings('alice', function(err, blessings, runtime) {
    assert.error(err);

    var extension = 'bob';
    var duration = 1000;
    var caveats = [];

    runtime
    .principal
    .bless(blessings, extension, duration, caveats, function(err, blessing) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});


test('Test blessing bob without caveats - ' +
  'var promise = i.bless(...)', function(assert) {
  newBlessings('alice', function(err, blessings, runtime) {
    assert.error(err);

    var extension = 'bob';
    var duration = 1000;
    var caveats = [];

    runtime
    .principal
    .bless(blessings, extension, duration, caveats)
    .then(function(blessing) {
      runtime.close(assert.end);
    })
    .catch(function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});

test('Test blessing bob with method caveats - ' +
  'i.bless(..., callback) - caveats', function(assert) {
  newBlessings('alice', function(err, blessings, runtime) {
    assert.error(err);

    var extension = 'bob';
    var duration = 1000;
    var caveats = [
      new MethodCaveat(['Foo', 'Bar']),
    ];


    runtime
    .principal
    .bless(blessings, extension, duration, caveats, function(err, blessing) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});

test('Test blessing bob with method caveats - ' +
  'var promise = i.bless(...) - caveats', function(assert) {
  newBlessings('alice', function(err, blessings, runtime) {
    assert.error(err);

    var extension = 'bob';
    var duration = 1000;
    var caveats = [
      new MethodCaveat(['Foo', 'Bar']),
    ];

    runtime
    .principal
    .bless(blessings, extension, duration, caveats)
    .then(function(blessing) {
      runtime.close(assert.end);
    })
    .catch(function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});

test('Test blessing bob with invalid caveats - ' +
  'i.bless(..., callback) - invalid caveats', function(assert) {
  newBlessings('alice', function(err, blessings, runtime) {
    assert.error(err);

    var extension = 'bob';
    var duration = 1000;
    var caveats = [ 3, 4, 5 ];


    runtime
    .principal
    .bless(blessings, extension, duration, caveats, function(err, blessing) {
      assert.ok(err, 'should error');
      runtime.close(assert.end);
    });
  });
});

test('Test blessing bob with invalid caveats - ' +
  'var promise = i.bless(...) - invalid caveats', function(assert) {
  newBlessings('alice', function(err, blessings, runtime) {
    assert.error(err);

    var extension = 'bob';
    var duration = 1000;
    var caveats = [ 3, 4, 5 ];


    runtime
    .principal
    .bless(blessings, extension, duration, caveats)
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


function newBlessings(extension, callback) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      return callback(err);
    }

    runtime._newBlessings(extension, function(err, blessings) {
      callback(err, blessings, runtime);
    });
  });
}
