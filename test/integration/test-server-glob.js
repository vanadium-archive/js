// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var serve = require('./serve');
var Promise = require('../../src/lib/promise');
var naming = require('../../src/gen-vdl/v.io/v23/naming');
var namespaceUtil = require('../../src/naming/util');
var verror = require('../../src/gen-vdl/v.io/v23/verror');

var ALBUMS = [
  'public',
  'public/2014',
  'public/2014/california',
  'public/2014/california/los-angeles',
  'public/2014/california/san-francisco',
  'public/2014/california/san-francisco/golden-gate',
  'public/2014/newyork',
  'public/2014/newyork/nyc',
  'public/2014/newyork/nyc/empire-state',
  'public/2015',
  'private',
  'private/2013',
  'private/2013/california',
  'private/2013/california/wedding',
  'private/2013/california/wedding/reception'
];

function Directory() {
  this.children = {};
}

Directory.prototype._addChild = function(name, node) {
  this.children[name] = node;
};

Directory.prototype.__globChildren = function(ctx, $stream) {
  Object.keys(this.children).forEach(function(child) {
    $stream.write(child);
  });
};

function createNodes(files) {
  var root = new Directory();
  for (var i = 0; i < files.length; i++) {
    var path = files[i].split('/');
    var currentNode = root;
    for (var j = 0; j < path.length; j++) {
      var component = path[j];
      var node = currentNode.children[component];
      // Add this element if it doesn't exist.
      if (!node) {
        node = new Directory();
        currentNode._addChild(component, node);
      }
      currentNode = node;
    }
  }
  return root;
}

function createAuthorizer(disallowed) {
  return function(context) {
    for (var i = 0; i < disallowed.length; i++) {
      if (context.suffix === disallowed[i]) {
        return new Error('disallowed');
      }
    }
    return null;
  };
}

function createDispatcher(root, disallowed) {
  return function(suffix) {
    var auth;
    if (disallowed) {
      auth = createAuthorizer(disallowed);
    }
    if (suffix === '') {
      return {
        service: root,
        authorizer: auth
      };
    }
    var path = suffix.split('/');
    var current = root;
    for (var i = 0; i < path.length; i++) {
      current = current.children[path[i]];
      if (!current) {
        return Promise.reject(new Error('not found'));
      }
    }
    return Promise.resolve({
      service: current,
      authorizer: auth
    });
  };
}

function runChildrenGlobTest(pattern, expectedResults, disallowed, assert) {
  runGlobTest(pattern, expectedResults,
              createDispatcher(createNodes(ALBUMS), disallowed),
              disallowed,
              assert);
}

function runGlobTest(pattern, expectedResults, dispatcher, expectedErrors,
  assert) {
  serve({
    name: 'testGlob',
    autoBind: false,
    dispatcher: dispatcher
  }, function(err, res) {
    if (err) {
      return assert.end(err);
    }

    var namespace = res.runtime.namespace();
    var ctx = res.runtime.getContext();
    var globRPC = namespace.glob(ctx, pattern);
    var stream = globRPC.stream;
    var globResults = [];
    var globErrors = [];
    var hadErrors = false;
    stream.on('data', function(mountPoint) {
      globResults.push(mountPoint.name);
    });

    stream.on('error', function(errItem) {
      hadErrors = true;
      assert.ok(errItem.error instanceof Error);
      assert.ok(typeof errItem.name === 'string');

      // The tests are setup to error based on name, which is this glob error.
      assert.ok(errItem.error instanceof verror.NoServersAndAuthError);
      globErrors.push(errItem.name);
    });

    stream.on('end', function() {
      globResults.sort();
      expectedResults.sort();
      assert.deepEqual(globResults, expectedResults);
      if (expectedErrors) {
        globErrors.sort();
        expectedErrors.sort();
        assert.deepEqual(globErrors, expectedErrors);
        assert.ok(hadErrors, 'expected to have errors on the stream');
      } else {
        assert.notOk(hadErrors, 'expected not to have errors on the stream');
      }
      res.end(assert);
    });

  });
}

test('Test globbing all descendants of root - GlobChildren - ' +
  'glob(testGlob/...)', function(assert) {
  var expectedResults = ALBUMS.map(function(s) { return 'testGlob/' + s; });
  // We need to push testGlob twice because we get one entry from the
  // mountable and the next entry from the glob method.  This is expected
  // behavior.
  expectedResults.push('testGlob');
  expectedResults.push('testGlob');
  expectedResults.sort();
  runChildrenGlobTest('testGlob/...', expectedResults, null, assert);
});

test('Test globbing all descendants of a child - GlobChildren - ' +
  ' glob(testGlob/private/...)',
  function(assert) {
  var expectedResults = [
    'testGlob/private',
    'testGlob/private/2013',
    'testGlob/private/2013/california',
    'testGlob/private/2013/california/wedding',
    'testGlob/private/2013/california/wedding/reception',
  ];
  runChildrenGlobTest('testGlob/private/...', expectedResults, null, assert);
});

test('Test globbing children of root - GlobChildren - glob(testGlob/*)',
  function(assert) {
  var expectedResults = [
    'testGlob/private',
    'testGlob/public',
  ];
  runChildrenGlobTest('testGlob/*', expectedResults, null, assert);
});

test('Test globbing pattern testGlob/*/*/california - GlobChildren',
  function(assert) {
  var expectedResults = [
    'testGlob/private/2013/california',
    'testGlob/public/2014/california',
  ];
  runChildrenGlobTest('testGlob/*/*/california', expectedResults, null, assert);
});

test('Test globbing pattern testGlob/*/20*/california/... - GlobChildren',
  function(assert) {
  var expectedResults = [
    'testGlob/private/2013/california',
    'testGlob/private/2013/california/wedding',
    'testGlob/private/2013/california/wedding/reception',
    'testGlob/public/2014/california',
    'testGlob/public/2014/california/los-angeles',
    'testGlob/public/2014/california/san-francisco',
    'testGlob/public/2014/california/san-francisco/golden-gate',
  ];
  runChildrenGlobTest('testGlob/*/20*/california/...', expectedResults, null,
                      assert);
});

test('Test globbing a partially restricted namespace - GlobChildren -' +
  ' testGlob/private is restricted', function(assert) {
  var expectedResults = [
    'testGlob',
    'testGlob',
    'testGlob/public',
    'testGlob/public/2014',
    'testGlob/public/2014/california',
    'testGlob/public/2014/california/los-angeles',
    'testGlob/public/2014/california/san-francisco',
    'testGlob/public/2014/california/san-francisco/golden-gate',
    'testGlob/public/2014/newyork',
    'testGlob/public/2014/newyork/nyc',
    'testGlob/public/2014/newyork/nyc/empire-state',
    'testGlob/public/2015'
  ];

  var restrictedNames = ['private'];
  runChildrenGlobTest('testGlob/...', expectedResults, restrictedNames, assert);
});

test('Test globbing a fully restricted namespace - GlobChildren -' +
  ' all children of root are restricted', function(assert) {
  var expectedResults = [
    'testGlob',
    'testGlob'
  ];
  var restrictedNames = ['private', 'public'];
  runChildrenGlobTest('testGlob/...', expectedResults, restrictedNames, assert);
});

function FullGlobber() {
}

FullGlobber.prototype.__glob = function(ctx, glob, $stream) {
    var mountEntry = new naming.MountEntry({
      name: namespaceUtil.join(ctx.suffix, glob),
    });
    $stream.write(new naming.GlobReply({
      entry: mountEntry
    }));
};

test('Test globbing all descendants of root - FullGlobber - glob(testGlob/...)',
  function(assert) {
  var expectedResults = [
    'testGlob',
    'testGlob/...',
  ];
  function dispatcher(suffix) {
    return {
      service: new FullGlobber(),
    };
  }
  runGlobTest('testGlob/...', expectedResults, dispatcher, null, assert);
});

test('Test globbing all descendants of a child - FullGlobber - ' +
  'glob(testGlob/bar/...)', function(assert) {
  var expectedResults = [
    'testGlob/bar/...',
  ];
  function dispatcher(suffix) {
    return {
      service: new FullGlobber(),
    };
  }
  runGlobTest('testGlob/bar/...', expectedResults, dispatcher, null, assert);
});

function ChildGlobber(children) {
  this.children = children;
}

ChildGlobber.prototype.__globChildren = function(ctx, $stream) {
  for (var i = 0; i < this.children.length; i++) {
    $stream.write(this.children[i]);
  }
};

test('Test mixing GlobChildren and FullGlobber', function(assert) {
  var expectedResults = [
    'testGlob/foo/bar/baz',
  ];

  function dispatcher(suffix) {
    var service;
    if (suffix === '') {
     service = new ChildGlobber(['foo', 'bar']);
    } else if (suffix === 'foo') {
      service = new FullGlobber();
    } else {
      service = new ChildGlobber([]);
    }
    return {
      service: service,
    };
  }
  runGlobTest('testGlob/foo/bar/baz', expectedResults, dispatcher, null,
    assert);
});
