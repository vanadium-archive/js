// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var vanadium = require('../../');
var Blessings = require('../../src/security/blessings');
var config = require('./default-config');

function validateBlessings(t, blessings) {
  t.ok(blessings instanceof Blessings, 'Blessings have correct type');
  t.ok(blessings.chains.length > 0, 'Non-empty chains');
  t.ok(blessings.publicKey, 'Public key is set');
}

test('Test blessing store set (promise case)', function(t) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }
    var blessSelfResult;
    runtime.principal.blessSelf(runtime.getContext(), 'ext')
    .then(function(blessings) {
      validateBlessings(t, blessings);
      blessSelfResult = blessings;

      return runtime.principal.blessingStore.set(runtime.getContext(),
        blessings, 'fake/remote/pattern');
    }).then(function() {
      return runtime.principal.blessingStore.set(runtime.getContext(),
        blessSelfResult, 'fake/remote/pattern');
    }).then(function(firstBlessing) {
      t.deepEqual(firstBlessing, blessSelfResult,
        'Should get first blessings back');
      validateBlessings(t, firstBlessing);
      runtime.close(t.end);
    }).catch(function(err) {
      t.error(err, 'either blessSelf or blessingStore.set errored');
      runtime.close(t.end);
    });
  });
});

test('Test blessing store set (callback case)', function(t) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }
    var blessSelfResult;
    runtime.principal.blessSelf(runtime.getContext(), 'ext',
      function(err, blessings) {
      if (err) {
        t.error(err);
        runtime.close(t.end);
        return;
      }
      validateBlessings(t, blessings);
      blessSelfResult = blessings;

      runtime.principal.blessingStore.set(runtime.getContext(),
        blessings, 'fake/remote/pattern',
        function(err) {
        if (err) {
          t.error(err);
          runtime.close(t.end);
          return;
        }
        runtime.principal.blessingStore.set(runtime.getContext(),
          blessSelfResult, 'fake/remote/pattern',
          function(err, firstBlessing) {
          if (err) {
            t.error(err);
            runtime.close(t.end);
            return;
          }
          t.deepEqual(firstBlessing, blessSelfResult,
            'Should get first blessings back');
          validateBlessings(t, firstBlessing);
          runtime.close(t.end);
        });
      });
    });
  });
});

test('Test blessing store for peer (promise case)', function(t) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    runtime.principal.blessSelf(runtime.getContext(), 'ext')
    .then(function(blessings) {
      validateBlessings(t, blessings);

      return runtime.principal.blessingStore.set(runtime.getContext(),
        blessings, 'fake/remote/pattern');
    }).then(function() {
      return runtime.principal.blessingStore.forPeer(runtime.getContext(),
        'fake/remote/pattern');
    }).then(function(firstBlessing) {
      validateBlessings(t, firstBlessing);
      runtime.close(t.end);
    }).catch(function(err) {
      t.error(err, 'error in one of the async calls');
      runtime.close(t.end);
    });
  });
});

test('Test blessing store for peer (callback case)', function(t) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    runtime.principal.blessSelf(runtime.getContext(), 'ext',
      function(err, blessings) {
      if (err) {
        t.error(err);
        runtime.close(t.end);
        return;
      }
      validateBlessings(t, blessings);

      runtime.principal.blessingStore.set(runtime.getContext(),
        blessings, 'fake/remote/pattern',
        function(err) {
          if (err) {
            t.error(err);
            runtime.close(t.end);
            return;
          }
          return runtime.principal.blessingStore.forPeer(runtime.getContext(),
            'fake/remote/pattern',
            function(err, firstBlessing) {
              validateBlessings(t, firstBlessing);
              runtime.close(t.end);
          });
      });
    });
  });
});

test('Test blessing store set/get default (promise case)', function(t) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    var blessSelfResult;
    var oldDefaultBlessings;
    runtime.principal.blessSelf(runtime.getContext(), 'ext')
    .then(function(blessings) {
      validateBlessings(t, blessings);
      blessSelfResult = blessings;

      return runtime.principal.blessingStore.getDefault(runtime.getContext());
    }).then(function(blessings) {
      oldDefaultBlessings = blessings;
      validateBlessings(t, oldDefaultBlessings);
      return runtime.principal.blessingStore.setDefault(
        runtime.getContext(), blessSelfResult);
    }).then(function() {
      return runtime.principal.blessingStore.getDefault(runtime.getContext());
    }).then(function(defaultBlessings) {
      validateBlessings(t, defaultBlessings);
      t.deepEqual(defaultBlessings, blessSelfResult,
        'Should get default blessings back');

      // Restore original default blessings
      return runtime.principal.blessingStore.setDefault(
        runtime.getContext(), oldDefaultBlessings);
    }).then(function() {
      runtime.close(t.end);
    }).catch(function(err) {
      t.error(err, 'error in one of the async calls');
      runtime.close(t.end);
    });
  });
});

test('Test blessing store set/get default (callback case)', function(t) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    var blessSelfResult;
    var oldDefaultBlessings;
    runtime.principal.blessSelf(runtime.getContext(), 'ext',
      function(err, blessings) {
      if (err) {
        t.error(err);
        runtime.close(t.end);
        return;
      }
      validateBlessings(t, blessings);
      blessSelfResult = blessings;

      runtime.principal.blessingStore.getDefault(runtime.getContext(),
        function(err, blessings) {
        if (err) {
          t.error(err);
          runtime.close(t.end);
          return;
        }
        oldDefaultBlessings = blessings;
        validateBlessings(t, oldDefaultBlessings);

        runtime.principal.blessingStore.setDefault(runtime.getContext(),
          blessSelfResult, function(err) {
          runtime.principal.blessingStore.getDefault(runtime.getContext(),
            function(err, defaultBlessings) {
            if (err) {
              t.error(err);
              runtime.close(t.end);
              return;
            }
            validateBlessings(t, defaultBlessings);
            t.deepEqual(defaultBlessings, blessSelfResult,
              'Should get default blessings back');

            // Restore original default blessings
            runtime.principal.blessingStore.setDefault(runtime.getContext(),
              oldDefaultBlessings, function(err) {
              t.error(err, 'error setting default');
              runtime.close(t.end);
            });
          });
        });
      });
    });
  });
});

test('Test blessing store get public key (promise case)', function(t) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    runtime.principal.blessingStore.getPublicKey(runtime.getContext())
    .then(function(publicKey) {
      t.ok(publicKey instanceof Uint8Array && publicKey.length > 0,
        'got public key');
      runtime.close(t.end);
    }).catch(function(err) {
      t.error(err, 'error in getPublicKey()');
      runtime.close(t.end);
    });
  });
});

test('Test blessing store get public key (callback case)', function(t) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    runtime.principal.blessingStore.getPublicKey(runtime.getContext(),
      function(err, publicKey) {
      if (err) {
        t.error(err);
        runtime.close(t.end);
        return;
      }
      t.ok(publicKey instanceof Uint8Array && publicKey.length > 0,
        'got public key');
      runtime.close(t.end);
    });
  });
});

test('Test peer blessings (promise case)', function(t) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }
    runtime.principal.blessSelf(runtime.getContext(), 'ext')
    .then(function(blessings) {
      validateBlessings(t, blessings);

      return runtime.principal.blessingStore.set(runtime.getContext(),
        blessings, 'fake/remote/pattern');
    }).then(function() {
      return runtime.principal.blessingStore.getPeerBlessings(
        runtime.getContext());
    }).then(function(peerBlessings) {
      t.ok(peerBlessings instanceof Map, 'Peer blessings is a map');
      t.ok(peerBlessings.size > 0, 'Non-empty peer blessings');
      peerBlessings.forEach(function(blessings, pattern) {
        t.ok(typeof pattern === 'string' && pattern !== '',
          'got string pattern');
        validateBlessings(t, blessings);
      });
      runtime.close(t.end);
    }).catch(function(err) {
      t.error(err, 'error in getPublicKey()');
      runtime.close(t.end);
    });
  });
});

test('Test peer blessings (callback case)', function(t) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }
    runtime.principal.blessSelf(runtime.getContext(), 'ext',
      function(err, blessings) {
      if (err) {
        t.error(err);
        runtime.close(t.end);
        return;
      }
      validateBlessings(t, blessings);

      runtime.principal.blessingStore.set(runtime.getContext(),
        blessings, 'fake/remote/pattern', function(err){
        if (err) {
          t.error(err);
          runtime.close(t.end);
          return;
        }
        runtime.principal.blessingStore.getPeerBlessings(runtime.getContext(),
          function(err, peerBlessings) {
          if (err) {
            t.error(err);
            runtime.close(t.end);
            return;
          }
          t.ok(peerBlessings instanceof Map, 'Peer blessings is a map');
          t.ok(peerBlessings.size > 0, 'Non-empty peer blessings');
          peerBlessings.forEach(function(blessings, pattern) {
            t.ok(typeof pattern === 'string' && pattern !== '',
              'got string pattern');
            validateBlessings(t, blessings);
          });
          runtime.close(t.end);
        });
      });
    });
  });
});

test('Test blessing store get debug string (promise case)', function(t) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    runtime.principal.blessingStore.getDebugString(runtime.getContext())
    .then(function(debugString) {
      t.ok(typeof debugString === 'string' && debugString !== '',
        'got blessing store debug string');
      runtime.close(t.end);
    }).catch(function(err) {
      t.error(err, 'error in getDebugString()');
      runtime.close(t.end);
    });
  });
});

test('Test blessing store get debug string (callback case)', function(t) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    runtime.principal.blessingStore.getDebugString(runtime.getContext(),
      function(err, debugString) {
      if (err) {
        t.error(err);
        runtime.close(t.end);
        return;
      }
      t.ok(typeof debugString === 'string' && debugString !== '',
        'got blessing store debug string');
      runtime.close(t.end);
    });
  });
});
