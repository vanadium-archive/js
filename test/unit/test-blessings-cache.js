// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var BlessingsCache = require('../../src/security/blessings-cache');
var principal =
  require('../../src/gen-vdl/v.io/x/ref/services/wspr/internal/principal');
var security = require('../../src/gen-vdl/v.io/v23/security');
var nativeTypeRegistry =
  require('../../src/vdl/native-type-registry');

test('Blessing cache - add before use', function(t) {
  var blessingsA = {
    certificateChains: [
      [
        new security.Certificate({
          extension: 'A'
        })
      ]
    ]
  };
  var messages = [
    {
      type: 'add',
      value: {
        cacheId: 1,
        blessings: blessingsA
      }
    },
    {
      type: 'blessingsFromId',
      cacheId: 1,
      expected: blessingsA
    }
  ];

  testCache(t, messages);
});

test('Blessing cache - add after use', function(t) {
  var blessingsA = {
    certificateChains: [
      [
        new security.Certificate({
          extension: 'A'
        })
      ]
    ]
  };
  var messages = [
    {
      type: 'blessingsFromId',
      cacheId: 1,
      expected: blessingsA
    },
    {
      type: 'add',
      value: {
        cacheId: 1,
        blessings: blessingsA
      },
      dontWaitPrevious: true
    }
  ];

  testCache(t, messages);
});

test('Blessing cache - delete after add', function(t) {
  var blessingsA = {
    certificateChains: [
      [
        new security.Certificate({
          extension: 'A'
        })
      ]
    ]
  };
  var messages = [
    {
      type: 'add',
      value: {
        cacheId: 1,
        blessings: blessingsA
      }
    },
    {
      type: 'delete',
      value: {
        cacheId: 1,
        deleteAfter: 0
      },
    },
    {
      type: 'confirmDelete',
      cacheId: 1
    }
  ];

  testCache(t, messages);
});

test('Blessing cache - reference counting delete', function(t) {
  var blessingsA = {
    certificateChains: [
      [
        new security.Certificate({
          extension: 'A'
        })
      ]
    ]
  };
  var messages = [
    {
      type: 'add',
      value: {
        cacheId: 1,
        blessings: blessingsA
      }
    },
    {
      type: 'delete',
      value: {
        cacheId: 1,
        deleteAfter: 2
      },
    },
    {
      type: 'blessingsFromId',
      cacheId: 1,
      expected: blessingsA
    },
    {
      type: 'blessingsFromId',
      cacheId: 1,
      expected: blessingsA
    },
    {
      type: 'confirmDelete',
      cacheId: 1
    }
  ];

  testCache(t, messages);
});

test('Blessing cache - add after delete', function(t) {
  var blessingsA = {
    certificateChains: [
      [
        new security.Certificate({
          extension: 'A'
        })
      ]
    ]
  };
  var messages = [
    {
      type: 'delete',
      value: {
        cacheId: 1,
        deleteAfter: 1
      },
    },
    {
      type: 'add',
      value: {
        cacheId: 1,
        blessings: blessingsA
      }
    },
    {
      type: 'blessingsFromId',
      cacheId: 1,
      expected: blessingsA
    },
    {
      type: 'confirmDelete',
      cacheId: 1
    }
  ];

  testCache(t, messages);
});

test('Blessing cache - multiple entries', function(t) {
  var blessingsA = {
    certificateChains: [
      [
        new security.Certificate({
          extension: 'A'
        })
      ]
    ]
  };
  var blessingsB = {
    certificateChains: [
      [
        new security.Certificate({
          extension: 'B'
        })
      ]
    ]
  };
  var blessingsC = {
    certificateChains: [
      [
        new security.Certificate({
          extension: 'C'
        })
      ]
    ]
  };
  var messages = [
    {
      type: 'add',
      value: {
        cacheId: 1,
        blessings: blessingsA
      }
    },
    {
      type: 'add',
      value: {
        cacheId: 2,
        blessings: blessingsB
      }
    },
    {
      type: 'blessingsFromId',
      cacheId: 2,
      expected: blessingsB
    },
    {
      type: 'blessingsFromId',
      cacheId: 1,
      expected: blessingsA
    },
    {
      type: 'delete',
      value: {
        cacheId: 1,
        deleteAfter: 1
      },
    },
    {
      type: 'confirmDelete',
      cacheId: 1
    },
    {
      type: 'add',
      value: {
        cacheId: 3,
        blessings: blessingsC
      }
    },
    {
      type: 'delete',
      value: {
        cacheId: 2,
        deleteAfter: 3
      },
    },
    {
      type: 'blessingsFromId',
      cacheId: 2,
      expected: blessingsB
    },
    {
      type: 'blessingsFromId',
      cacheId: 3,
      expected: blessingsC
    },
    {
      type: 'delete',
      value: {
        cacheId: 3,
        deleteAfter: 1
      },
    },
    {
      type: 'confirmDelete',
      cacheId: 3
    },
    {
      type: 'blessingsFromId',
      cacheId: 2,
      expected: blessingsB
    },
    {
      type: 'confirmDelete',
      cacheId: 2
    }
  ];

  testCache(t, messages);
});

test('Blessing cache handles typed BlessingsId objects', function(t) {
  var blessingsA = {
    certificateChains: [
      [
        new security.Certificate({
          extension: 'A'
        })
      ]
    ]
  };
  var messages = [
    {
      type: 'add',
      value: {
        cacheId: 1,
        blessings: blessingsA
      }
    },
    {
      type: 'blessingsFromId',
      cacheId: new principal.BlessingsId(1),
      expected: blessingsA
    }
  ];

  testCache(t, messages);
});

test('Blessing cache handles zero blessing id', function(t) {
  var messages = [
    {
      type: 'blessingsFromId',
      cacheId: new principal.BlessingsId(0),
      expected: null
    }
  ];

  testCache(t, messages);
});

/**
 * Tests the cache by handling a sequence of messages.
 * @private
 */
function testCache(t, messages) {
  var cache = new BlessingsCache();
  var promises = [];
  messages.forEach(function(message, index) {
    // Wait for the previous messages to finish unless dontWaitPrevious is
    // specified.
    var preCondPromise = Promise.all(promises);
    if (message.dontWaitPrevious) {
      preCondPromise = Promise.resolve();
    }

    var result = preCondPromise.then(function() {
      return handleCacheTestMessage(t, cache, message, index);
    }).catch(function(err) {
      t.fail('Error in message ' + index + ': ' + err);
    });
    promises.push(result);
  });

  // Wait for all promises to complete.
  Promise.all(promises).then(function() {
    t.end();
  }).catch(function(err) {
    t.end(err);
  });
}

function handleCacheTestMessage(t, cache, message, index) {
  if (message.type === 'add') {
    var addMsg = new principal.BlessingsCacheAddMessage(message.value);
    return cache.addBlessings(addMsg);
  } else if (message.type === 'delete') {
    var delMsg = new principal.BlessingsCacheDeleteMessage(message.value);
    return cache.deleteBlessings(delMsg);
  } else if (message.type === 'confirmDelete') {
    t.ok(cache._entries, 'Entries table should exist');
    t.notOk(message.cacheId in cache._entries,
      'Cache entry not deleted correctly on message ' + index);
  } else if (message.type === 'blessingsFromId') {
    return cache.blessingsFromId(message.cacheId).then(function(blessings) {
      var expected = null;
      if (message.expected) {
        expected = nativeTypeRegistry.fromWireValue(
          security.WireBlessings.prototype._type,
          message.expected);
      }
      t.deepEqual(blessings, expected,
        'Should get expected blessings on message ' + index);
    });
  } else {
    throw new Error('unknown message type');
  }
}
