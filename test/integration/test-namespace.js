var test = require('prova');
var veyron = require('../../');
var Promise = require('../../src/lib/promise');
var verror = veyron.errors;
var config = require('./default-config');
var timeouts = require('./timeouts');
var namespaceRoot = process.env.NAMESPACE_ROOT;
var PREFIX = 'namespace-testing/';

test('Test globbing children - glob(' + PREFIX + '*)', function(assert) {
  var runtime;

  init(config).then(function glob(rt) {
    runtime = rt;
    var namespace = rt.namespace();
    var rpc = namespace.glob(PREFIX + '*');
    rpc.catch(end);
    return readAllNames(rpc.stream);
  }).then(function validate(actual) {
    var expected = [PREFIX + 'cottage', PREFIX + 'house'];
    assert.deepEqual(actual.sort(), expected.sort());
    end();
  }).catch(end);

  function end(err) {
    assert.error(err);
    if (runtime) {
      runtime.close(assert.end);
    } else {
      assert.end();
    }
  }
});

test('Test globbing nested levels - glob(' + PREFIX + 'cottage/*/*/*)',
  function(assert) {
  var runtime;

  init(config).then(function glob(rt) {
    runtime = rt;
    var namespace = rt.namespace();
    var rpc = namespace.glob(PREFIX + 'cottage/*/*/*');
    rpc.catch(end);
    return readAllNames(rpc.stream);
  }).then(function validate(actual) {
    var expected = [
      PREFIX + 'cottage/lawn/back/sprinkler',
      PREFIX + 'cottage/lawn/front/sprinkler'
    ];
    assert.deepEqual(actual.sort(), expected.sort());
    end();
  }).catch(end);

  function end(err) {
    assert.error(err);
    if (runtime) {
      runtime.close(assert.end);
    } else {
      assert.end();
    }
  }
});

test('Test globbing non-existing name - glob(' + PREFIX + 'does/not/exist)',
  function(assert) {
  var runtime;

  init(config).then(function glob(rt) {
    runtime = rt;
    var namespace = rt.namespace();
    var rpc = namespace.glob(PREFIX + 'does/not/exist');
    rpc.catch(end);
    return readAllNames(rpc.stream);
  }).then(function validate(actual) {
    var expected = [];
    assert.deepEqual(actual.sort(), expected.sort());
    end();
  }).catch(end);

  function end(err) {
    assert.error(err);
    if (runtime) {
      runtime.close(assert.end);
    } else {
      assert.end();
    }
  }
});

// TODO(aghassemi) This test take arbitrarily long since it needs to timeout
// on invalid name. Find a better way to do this.
// Maybe namespace take context and timeout as well?
test.skip('Test globbing non-existing rooted name - ' +
  'glob(/RootedBadName.Google.tld:1234/*)', function(assert) {

  // increase timeout for this test as it retries bad-url until timeout.
  assert.timeout(timeouts.long);

  var runtime;
  init(config).then(function glob(rt) {
    runtime = rt;
    var namespace = rt.namespace();
    var rpc = namespace.glob('/RootedBadName.Google.tld:1234/*');

    // We expect no actual result items but one stream error result item
    rpc.stream.on('data', function(item) {
      assert.notOk(item, 'Should not get any actual results');
    });

    var numErrorItems = 0;
    rpc.stream.on('error', function(errItem) {
      if (numErrorItems > 0) {
        end('expected only one error item');
      }
      numErrorItems++;
      assert.ok(errItem, 'Should get one error result item');
      assert.ok(errItem instanceof verror.NoServersError,
        'error result item should be NoServersError');
    });

    rpc.stream.on('end', end);
  }).catch(end);

  function end(err) {
    assert.error(err);
    if (runtime) {
      runtime.close(assert.end);
    } else {
      assert.end();
    }
  }
});

test('Test mounting and unmounting - ' +
  'mount(' + PREFIX + 'new/name), unmount(' + PREFIX + 'new/name)',
  function(assert) {
  var runtime;
  var namespace;
  var MINUTE = 60 * 1000; // a minute
  var expectedServerAddress;
  var initialName = PREFIX + 'first/name';
  var secondaryName = PREFIX + 'new/name';

  veyron.init(config).then(function createServer(rt) {
    runtime = rt;
    namespace = rt.namespace();
    return rt.serve(initialName, {});
  }).then(wait(1000))
  .then(function resolve() {
    return namespace.resolve(initialName);
  }).then(function mount(endpoints) {
    expectedServerAddress = endpoints[0];
    return namespace.mount(secondaryName, expectedServerAddress, MINUTE);
  }).then(wait(1000))
  .then(function resolve() {
    return namespace.resolve(secondaryName);
  }).then(function validate(resolveResult) {
    assert.equals(resolveResult.length, 1);
    assert.equals(resolveResult[0], expectedServerAddress);
  }).then(function unmount() {
    return namespace.unmount(secondaryName);
  }).then(wait(1000))
  .then(function resolve() {
    namespace.resolve(secondaryName, function cb(err) {
      assert.ok(err, 'no resolving after unmount()');
      end();
    });
  }).catch(end);

  function end(err) {
    assert.error(err);
    if (runtime) {
      runtime.close(assert.end);
    } else {
      assert.end();
    }
  }
});

test('Test resolving to mounttable - ' +
  'resolveToMountTable(' + PREFIX + 'cottage)', function(assert) {
  var runtime;

  init(config).then(function resolveToMountTable(rt) {
    runtime = rt;
    var namespace = rt.namespace();
    return namespace.resolveToMounttable(PREFIX + 'cottage');
  }).then(function validate(mounttableNames) {
    assert.equals(mounttableNames.length, 1);
    var mounttableName = mounttableNames[0];
    assert.ok(mounttableName.indexOf(namespaceRoot) === 0);
    end();
  }).catch(end);

  function end(err) {
    assert.error(err);
    if (runtime) {
      runtime.close(assert.end);
    } else {
      assert.end();
    }
  }
});

test('Test flushing cache entry - ' +
  'flushCacheEntry(' + PREFIX + 'house/alarm)', function(assert) {
  var runtime;
  var namespace;
  var name = PREFIX + 'house/alarm';

  init(config).then(function flushCacheEntry(rt) {
    runtime = rt;
    namespace = rt.namespace();
    return namespace.flushCacheEntry(name);
  }).then(function validate() {
    // We don't check the return result of flushCachEntry since there is no
    // guarantee that it was in the cache to be flushed in the first place.
    // Even if we do a resolve() before this step to cache it, it may still get
    // evicted by the time we call flushCacheEntry for different reasons such as
    // cache being full, service remounting itself, parent mount-point expiring.
    assert.pass('cache flushed');
    end();
  }).catch(end);

  function end(err) {
    assert.error(err);
    if (runtime) {
      runtime.close(assert.end);
    } else {
      assert.end();
    }
  }
});

test('Test disabling cache - disableCache(true)', function(assert) {
  var runtime;
  var namespace;
  var name = PREFIX + 'house/alarm';

  init(config).then(function disableCache(rt) {
    runtime = rt;
    namespace = rt.namespace();
    return namespace.disableCache(true);
  }).then(function resolveButItShouldNotGetCached(rt) {
    return namespace.resolve(name);
  }).then(function tryFlushCacheEntry() {
    return namespace.flushCacheEntry(name);
  }).then(function validate(flushed) {
    assert.notOk(flushed, 'no cache to be flushed');
    end();
  }).catch(end);

  function end(err) {
    assert.error(err);
    if (runtime) {
      runtime.close(assert.end);
    } else {
      assert.end();
    }
  }
});

test('Test setting roots to valid endpoints - ' +
  'setRoots(valid)', function(assert) {
  var runtime;
  var namespace;

  init(config).then(function setRoots(rt) {
    runtime = rt;
    namespace = rt.namespace();
    // Set the roots to a valid root, we expect normal glob results.
    return namespace.setRoots(namespaceRoot);
  }).then(function glob() {
    var rpc = namespace.glob(PREFIX + '*');
    rpc.catch(end);
    return readAllNames(rpc.stream);
  }).then(function validate(actual) {
    var expected = [PREFIX + 'cottage', PREFIX + 'house'];
    assert.deepEqual(actual.sort(), expected.sort());
    end();
  }).catch(end);

  function end(err) {
    assert.error(err);
    if (runtime) {
      runtime.close(assert.end);
    } else {
      assert.end();
    }
  }
});

test('Test setting roots to invalid endpoint - ' +
  'setRoots(invalid)', function(assert) {

  // increase timeout for this test as it retries bad-url until timeout.
  assert.timeout(timeouts.long);

  var runtime;
  var namespace;

  init(config).then(function setRoots(rt) {
    runtime = rt;
    namespace = rt.namespace();
    // Set the roots to a invalid roots, then we don't expect resolution.
    return namespace.setRoots(['/bad-root-1.tld:80', '/bad-root-2.tld:1234']);
  }).then(function bind() {
    // Since setRoots changes runtimes Namespace roots, binding to any name
    // should now fail
    return runtime.bindTo(PREFIX + 'house/kitchen/lights')
      .then(function() {
        assert.fail('Should not have been able to bind with invalid roots');
      }, function(err) {
        assert.ok(err);
        assert.ok(err instanceof Error);
        end();
      });
  }).catch(end);

  function end(err) {
    assert.error(err);
    if (runtime) {
      runtime.close(assert.end);
    } else {
      assert.end();
    }
  }
});

test('Test getting roots - roots()', function(assert) {
  var runtime;

  init(config).then(function roots(rt) {
    runtime = rt;
    var namespace = rt.namespace();
    return namespace.roots();
  }).then(function validate(roots) {
    assert.equals(roots.length, 1);
    // The mounttable name we get from NaCl wspr has network set to "ws" instead
    // of "tcp", so we must change it back to tcp.
    var wsRoot = roots[0].replace('@ws@', '@tcp@');
    assert.ok(wsRoot.indexOf(namespaceRoot === 0));
    end();
  }).catch(end);

  function end(err) {
    assert.error(err);
    if (runtime) {
      runtime.close(assert.end);
    } else {
      assert.end();
    }
  }
});

test('Test setting and getting roots - ' +
  'setRoots(), roots(cb)', function(assert) {
  var runtime;
  var namespace;

  veyron.init(config, onInit);

  function onInit(err, rt) {
    assert.error(err);
    runtime = rt;
    namespace = rt.namespace();
    namespace.setRoots('/root1:80', '/root2:1234', onSetRoots);
  }

  function onSetRoots(err) {
    assert.error(err);
    namespace.roots(onRoots);
  }

  function onRoots(err, roots) {
    assert.error(err);
    assert.ok(roots[0].indexOf('root1:80' >= 0));
    assert.ok(roots[1].indexOf('root2:1234' >= 0));
    if (runtime) {
      runtime.close(assert.end);
    }
  }
});

/*
 * Given a glob stream, returns a promise that will resolve to an array
 * of glob results after all the results have been collected from the stream.
 */
function readAllNames(stream) {
  var names = [];
  return new Promise(function(resolve, reject) {
    stream.on('data', function(mountPoint) {
      names.push(mountPoint.name);
    });

    stream.on('end', function(name) {
      resolve(names);
    });

    stream.on('error', function(err) {
      reject(err);
    });
  });
}

var SAMPLE_NAMESPACE = [
  'house/alarm',
  'house/living-room/lights',
  'house/living-room/smoke-detector',
  'house/kitchen/lights',
  'cottage/alarm',
  'cottage/lawn/back/sprinkler',
  'cottage/lawn/front/sprinkler',
];

function init(config) {
  var runtime;
  return veyron.init(config)
    .then(function serveEmptyService(rt) {
      runtime = rt;
      return runtime.serve('', {});
    })
    .then(function publishUnderMultipleNames() {
      var addNamesRequests = SAMPLE_NAMESPACE.map(function(name) {
        return runtime.addName(PREFIX + name);
      });
      return Promise.all(addNamesRequests);
    })
    // Wait a second for the services to be published.
    .then(wait(1000))
    .then(function ready() {
      return runtime;
    });
}

// Helper function that waits the specified time in milliseconds and resolves.
function wait(ms) {
  return function(){
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  };
}
