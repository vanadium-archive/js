var test = require('prova');
var veyron = require('../../');
var Promise = require('../../src/lib/promise');
var config = {
  wspr: 'http://' + process.env.WSPR_ADDR
};
var namespaceRoot = process.env.NAMESPACE_ROOT;
var PREFIX = 'namespace-testing/';

test('glob(' + PREFIX + '*)', function(assert) {
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

test('glob(' + PREFIX + 'cottage/*/*/*) - nested', function(assert) {
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

test('glob(' + PREFIX + 'does/not/exist) - empty', function(assert) {
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

test('glob(/RootedInvalidName.Google.tld:1234/*) - empty', function(assert) {
  var runtime;

  init(config).then(function glob(rt) {
    runtime = rt;
    var namespace = rt.namespace();
    var rpc = namespace.glob('/RootedInvalidName.Google.tld:1234/*');
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

test('mount -> resolve -> unmount -> resolve(cb)', function(assert) {
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
  }).then(function resolve() {
    return namespace.resolve(initialName);
  }).then(function mount(endpoints) {
    expectedServerAddress = endpoints[0];
    return namespace.mount(secondaryName, expectedServerAddress, MINUTE);
  }).then(function resolve() {
    return namespace.resolve(secondaryName);
  }).then(function validate(resolveResult) {
    assert.equals(resolveResult.length, 1);
    assert.equals(resolveResult[0], expectedServerAddress);
  }).then(function unmount() {
    return namespace.unmount(secondaryName);
  }).then(function resolve() {
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

test('resolveToMountTable(' + PREFIX + 'cottage)', function(assert) {
  var runtime;

  init(config).then(function resolveToMountTable(rt) {
    runtime = rt;
    var namespace = rt.namespace();
    return namespace.resolveToMounttable(PREFIX + 'cottage');
  }).then(function validate(mounttableNames) {
    assert.equals(mounttableNames.length, 1);
    assert.ok(mounttableNames[0].indexOf(namespaceRoot) === 0);
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

test('flushCacheEntry(' + PREFIX + 'house/alarm)', function(assert) {
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

test('disableCache(true)', function(assert) {
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

test('setRoots() -> valid', function(assert) {
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

test('setRoots() -> invalid -> runtime bind failure', function(assert) {
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

test('roots()', function(assert) {
  var runtime;

  init(config).then(function roots(rt) {
    runtime = rt;
    var namespace = rt.namespace();
    return namespace.roots();
  }).then(function validate(roots) {
    assert.equals(roots.length, 1);
    assert.ok(roots[0].indexOf(namespaceRoot) === 0);
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

test('setRoots() -> roots() (cb)', function(assert) {
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
  .then(function publishUnderMultipleNames(){
    var addNamesRequests = SAMPLE_NAMESPACE.map(function(name) {
      return runtime.addName(PREFIX + name);
    });
    return Promise.all(addNamesRequests);
  })
  .then(function ready() {
    return runtime;
  });
}
