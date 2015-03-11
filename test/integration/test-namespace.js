var test = require('prova');
var Promise = require('../../src/lib/promise');

var access = require('../../src/gen-vdl/v.io/v23/services/security/access');
var reserved = require('../../src/gen-vdl/v.io/v23/ipc/reserved');
var config = require('./default-config');
var MINUTE = 60 * 1000; // a minute
var Promise = require('../../src/lib/promise');
var random = require('../../src/lib/random');
var timeouts = require('./timeouts');
var vanadium = require('../../');
var verror = vanadium.errors;

var namespaceRoot = process.env.NAMESPACE_ROOT;
var PREFIX = 'namespace-testing/';

test('Test globbing children - glob(' + PREFIX + '*)', function(assert) {
  var runtime;

  init(config).then(function glob(rt) {
    runtime = rt;
    var namespace = rt.namespace();
    var ctx = runtime.getContext();
    var rpc = namespace.glob(ctx, PREFIX + '*');
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
    var ctx = runtime.getContext();
    var rpc = namespace.glob(ctx, PREFIX + 'cottage/*/*/*');
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
    var ctx = runtime.getContext();
    var rpc = namespace.glob(ctx, PREFIX + 'does/not/exist');
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

test('Test glob\'s promise is resolved when glob finishes.' +
  '- var promise = glob(' + PREFIX + '*)', function(assert) {
  var runtime;

  init(config).then(function glob(rt) {
    runtime = rt;
    var namespace = rt.namespace();
    var ctx = runtime.getContext();
    return namespace.glob(ctx, PREFIX + '*');
  }).then(function(finalResult) {
    assert.notOk(finalResult, 'there is no final result for glob');
    assert.pass('Promise resolved when glob finished.');
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

test('Test glob\'s callback is called when glob finishes.' +
  '- glob(' + PREFIX + '*, cb)', function(assert) {
  var runtime;

  init(config).then(function glob(rt) {
    runtime = rt;
    var namespace = rt.namespace();
    var ctx = runtime.getContext();
    namespace.glob(ctx, PREFIX + '*', function(err, finalResult) {
      assert.error(err);

      assert.notOk(finalResult, 'there is no final result for glob');
      assert.pass('Promise resolved when glob finished.');
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

test('Test globbing non-existing rooted name - ' +
  'glob(/RootedBadName.Google.tld:1234/*)', function(assert) {

  // increase timeout for this test as it retries bad-url until timeout.
  assert.timeout(timeouts.long);

  var runtime;
  init(config).then(function glob(rt) {
    runtime = rt;
    var namespace = rt.namespace();
    var rpc = namespace.glob(rt.getContext().withTimeout(timeouts.long),
                             '/RootedBadName.Google.tld:1234/*');
    rpc.catch(function(err) {
      // Ignore the timeout error.
    });

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
      assert.ok(errItem.error instanceof verror.NoServersError,
                'error item should have error field of type NoServersError');
      assert.equal(errItem.name, '/RootedBadName.Google.tld:1234',
                'error item should have a name');
    });

    rpc.stream.on('end', function() {
      assert.equal(numErrorItems, 1,
        'must end with 1 GlobError, got: ' + numErrorItems);
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

test('Test mounting and unmounting - ' +
  'mount(' + PREFIX + 'new/name), unmount(' + PREFIX + 'new/name)',
  function(assert) {
  var runtime;
  var namespace;
  var expectedServerAddress;
  var initialName = PREFIX + 'first/name';
  var secondaryName = PREFIX + 'new/name';

  var ctx;
  var server;
  vanadium.init(config).then(function createServer(rt) {
    runtime = rt;
    namespace = rt.namespace();
    ctx = rt.getContext();
    server = rt.newServer();
    return server.serve(initialName, {});
  }).then(wait(1000))
  .then(function resolve() {
    return namespace.resolve(ctx, initialName);
  }).then(function mount(endpoints) {
    expectedServerAddress = endpoints[0];
    return namespace.mount(ctx, secondaryName, expectedServerAddress,
                           MINUTE);
  }).then(wait(1000))
  .then(function resolve() {
    return namespace.resolve(ctx, secondaryName);
  }).then(function validate(resolveResult) {
    assert.equals(resolveResult.length, 1);
    assert.equals(resolveResult[0], expectedServerAddress);
  }).then(function unmount() {
    return namespace.unmount(ctx, secondaryName);
  }).then(wait(1000))
  .then(function resolve() {
    namespace.resolve(ctx, secondaryName, function cb(err) {
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

  var ctx;
  init(config).then(function resolveToMountTable(rt) {
    runtime = rt;
    ctx = runtime.getContext();
    var namespace = rt.namespace();
    return namespace.resolveToMounttable(ctx, PREFIX + 'cottage');
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

  var ctx;
  init(config).then(function disableCache(rt) {
    runtime = rt;
    ctx = rt.getContext();
    namespace = rt.namespace();
    return namespace.disableCache(true);
  }).then(function resolveButItShouldNotGetCached(rt) {
    return namespace.resolve(ctx, name);
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
  var ctx;

  init(config).then(function setRoots(rt) {
    runtime = rt;
    namespace = rt.namespace();
    ctx = rt.getContext();
    // Set the roots to a valid root, we expect normal glob results.
    return namespace.setRoots(namespaceRoot);
  }).then(function glob() {
    var rpc = namespace.glob(ctx, PREFIX + '*');
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
  var ctx;
  init(config).then(function setRoots(rt) {
    runtime = rt;
    namespace = rt.namespace();
    ctx = rt.getContext();
    // Set the roots to a invalid roots, then we don't expect resolution.
    return namespace.setRoots(['/bad-root-1.tld:80', '/bad-root-2.tld:1234']);
  }).then(function bind() {
    // Since setRoots changes runtimes Namespace roots, binding to any name
    // should now fail
    var client = runtime.newClient();
    return client.bindTo(ctx, PREFIX + 'house/kitchen/lights')
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
    assert.ok(roots.indexOf(namespaceRoot === 0));
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

  vanadium.init(config, onInit);

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

test('Test getACL() on non-existant name', function(assert) {
  vanadium.init(config, function(err, rt) {
    if (err) {
      return assert.end(err);
    }

    var ctx = rt.getContext();
    var ns = rt.namespace();
    var name = 'non/existant/name';

    ns.getACL(ctx, name, function(err) {
      assert.ok(err, 'should error');
      rt.close(assert.end);
    });
  });
});

test('Test setting and getting ACLs - ' +
    'setACL(), getACL()', function(assert) {
  vanadium.init(config, function(err, rt) {
    if (err) {
      return assert.end(err);
    }

    var ctx = rt.getContext();
    var ns = rt.namespace();
    // Note: we use a random name here so we can run the test multiple times
    // with the same mounttable without getting locked out of a name.
    var name = 'path/to/some/name/' + random.hex();

    // TODO(nlacasse): This is the best way I found to build a tagged acl map.
    // Are there better ways?  Consider making a helper function.
    var tam = new access.TaggedACLMap(new Map([
      [access.Admin, new access.ACL({
        'in': ['...'],
        'notIn': ['foo']
      })],
      [access.Read, new access.ACL({
        'in': ['bar/baz']
      })],
      [access.Write, new access.ACL({
        'notIn': ['biz/qux']
      })]
    ]));

    ns.setACL(ctx, name, tam, function(err) {
      if (err) {
        return end(err);
      }

      ns.getACL(ctx, name, function(err, gotTam, gotEtag) {
        if (err) {
          return end(err);
        }

        assert.equal(typeof gotEtag, 'string', 'getACL returns a string etag');

        assert.ok(gotTam, 'getACL returns a tagged acl map');
        assert.deepEqual(gotTam, tam.val,
            'getACL returns the same tagged acl map that we set');

        ns.setACL(ctx, name, tam, 'badEtag', function(err) {
          assert.ok(err, 'setACL with a bad etag should error');

          ns.setACL(ctx, name, tam, gotEtag, function(err) {
            assert.error(err, 'setACL with the correct etag should not error');
            end();
          });
        });
      });
    });

    function end(err) {
      assert.error(err, 'should not error');
      rt.close(assert.end);
    }
  });
});

test('Test delete() on non-existant name', function(assert) {
  vanadium.init(config, function(err, rt) {
    if (err) {
      return assert.end(err);
    }

    var ctx = rt.getContext();
    var ns = rt.namespace();
    var name = 'non/existant/name';

    ns.delete(ctx, name, true, function(err) {
      assert.error(err, 'should not error');
      rt.close(assert.end);
    });
  });
});

test('Test delete() unmounts a name', function(assert) {

  vanadium.init(config, function(err, rt) {
    if (err) {
      return assert.end(err);
    }

    var ctx = rt.getContext();
    var ns = rt.namespace();
    var name = 'name/that/will/be/deleted';
    var ep = '/@3@ws@2.2.2.2:2222@e8972f90fe028674f78a164f001d07c5@5@7@s@@';

    ns.mount(ctx, name, ep, MINUTE)
    .then(function onMount(err) {
      if (err) {
        return end(err);
      }
    }).then(wait(1000))
    .then(function resolveOnce() {
      return ns.resolve(ctx, name);
    }).then(function validateResolvedEp(gotEps) {
      assert.equal(gotEps.length, 1, 'resolves to a single endpoint');
      assert.equal(ep, gotEps[0], 'resolves to the correct endpoint');
    }).then(function deleteName() {
      return ns.delete(ctx, name, false);
    }).then(function resolveTwice() {
      ns.resolve(ctx, name, function(err) {
        assert.ok(err, 'name should be unmounted');
        end();
      });
    }).catch(function(err) {
      assert.error(err);
      end(err);
    });

    function end(err) {
      assert.error(err, 'should not error');
      rt.close(assert.end);
    }
  });
});

test('Test delete() on name with no children', function(assert) {
  vanadium.init(config, function(err, rt) {
    if (err) {
      return assert.end(err);
    }

    var ctx = rt.getContext();
    var ns = rt.namespace();
    var name = 'path/to/name/with/no/children';

    var tam = new access.TaggedACLMap(new Map([
      [access.Admin, new access.ACL({
        'in': ['...'],
      })]
    ]));

    ns.setACL(ctx, name, tam, function(err) {
      if (err) {
        return end(err);
      }

      ns.delete(ctx, name, false, end);
    });

    function end(err) {
      assert.error(err, 'should not error');
      rt.close(assert.end);
    }
  });
});

test('Test delete() on name with children', function(assert) {
  var nsutil = vanadium.namespaceUtil;
  vanadium.init(config, function(err, rt) {
    if (err) {
      return assert.end(err);
    }

    var ctx = rt.getContext();
    var ns = rt.namespace();
    var name = 'path/to/name/with/children';
    var childName1 = nsutil.join(name, 'child1');
    var childName2 = nsutil.join(name, 'node/child2');

    var tam = new access.TaggedACLMap(new Map([
      [access.Admin, new access.ACL({
        'in': ['...'],
      })]
    ]));

    // Create all three names.
    ns.setACL(ctx, name, tam, function(err) {
      if (err) {
        return end(err);
      }
      ns.setACL(ctx, childName1, tam, function(err) {
        if (err) {
          return end(err);
        }
        ns.setACL(ctx, childName2, tam, function(err) {
          if (err) {
            return end(err);
          }

          ns.delete(ctx, name, false, function(err) {
            assert.ok(err, 'should error if we don\'t delete subchildren');

            ns.delete(ctx, name, true, function(err) {
              assert.error(err, 'should not error if we delete subchildren');
              end();
            });
          });
        });
      });
    });

    function end(err) {
      assert.error(err, 'should not error');
      rt.close(assert.end);
    }
  });
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

    stream.on('error', function(errItem) {
      // we don't expect any errors other than GlobNotImplementedError
      if (!(errItem.error instanceof reserved.GlobNotImplementedError)) {
        reject(errItem.error);
      }
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
  var server;
  return vanadium.init(config)
    .then(function serveEmptyService(rt) {
      runtime = rt;
      server = rt.newServer();
      return server.serve('', {});
    })
    .then(function publishUnderMultipleNames() {
      var addNamesRequests = SAMPLE_NAMESPACE.map(function(name) {
        return server.addName(PREFIX + name);
      });
      return Promise.all(addNamesRequests);
    })
    // Wait a second for the services to be published.
    // TODO(aghassemi): This wait is racey.  We should wait until the services
    // are actually mounted in the mounttable.  Similar to what serve.js does.
    .then(wait(2000))
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
