var test = require('prova');
var serve = require('./serve');
var context = require('../../src/runtime/context');
var Invoker = require('../../src/invocation/invoker');
var Promise = require('../../src/lib/promise');
var naming = require('../../src/v.io/core/veyron2/naming/naming');
var namespaceUtil = require('../../src/namespace/util');

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
        invoker: new Invoker(root),
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
      invoker: new Invoker(current),
      authorizer: auth
    });
  };
}


function runChildrenGlobTest(pattern, expectedResults, disallowed, assert) {
  runGlobTest(pattern, expectedResults,
              createDispatcher(createNodes(ALBUMS), disallowed),
              assert);
}

function runGlobTest(pattern, expectedResults, dispatcher, assert) {
  var ctx = context.Context();
  serve(ctx, {
    name: 'testGlob',
    autoBind: false,
    dispatcher: dispatcher
  }, function(err, res) {
    if (err) {
      return assert.end(err);
    }

    var namespace = res.runtime.namespace();
    var globRPC = namespace.glob(pattern);
    var stream = globRPC.stream;
    var globResults = [];
    stream.on('data', function(mountPoint) {
      globResults.push(mountPoint.name);
    });

    stream.on('end', function() {
      globResults.sort();
      expectedResults.sort();
      assert.deepEqual(globResults, expectedResults);
      res.end(assert);
    });

    stream.on('error', function(e) {
      assert.error(e);
      res.end(assert);
    });
  });
}

test('... glob', function(assert) {
  var expectedResults = ALBUMS.map(function(s) { return 'testGlob/' + s; });
  // We need to push testGlob twice because we get one entry from the
  // mountable and the next entry from the glob method.  This is expected
  // behavior.
  expectedResults.push('testGlob');
  expectedResults.push('testGlob');
  expectedResults.sort();
  runChildrenGlobTest('testGlob/...', expectedResults, null, assert);
});

test('private/... glob', function(assert) {
  var expectedResults = [
    'testGlob/private',
    'testGlob/private/2013',
    'testGlob/private/2013/california',
    'testGlob/private/2013/california/wedding',
    'testGlob/private/2013/california/wedding/reception',
  ];
  runChildrenGlobTest('testGlob/private/...', expectedResults, null, assert);
});

test('* glob', function(assert) {
  var expectedResults = [
    'testGlob/private',
    'testGlob/public',
  ];
  runChildrenGlobTest('testGlob/*', expectedResults, null, assert);
});

test('testGlob/*/*/california glob', function(assert) {
  var expectedResults = [
    'testGlob/private/2013/california',
    'testGlob/public/2014/california',
  ];
  runChildrenGlobTest('testGlob/*/*/california', expectedResults, null, assert);
});

test('testGlob/*/20*/california/... glob', function(assert) {
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

test('... glob with public disallowed', function(assert) {
  var expectedResults = [
    'testGlob',
    'testGlob',
    'testGlob/private',
    'testGlob/private/2013',
    'testGlob/private/2013/california',
    'testGlob/private/2013/california/wedding',
    'testGlob/private/2013/california/wedding/reception',
  ];
  runChildrenGlobTest('testGlob/...', expectedResults, ['public'], assert);
});

function FullGlobber() {
}

FullGlobber.prototype.__glob = function(ctx, glob, $stream) {
    $stream.write(new naming.VDLMountEntry({
      name: namespaceUtil.join(ctx.suffix, glob),
    }));
};

test('... glob full globber', function(assert) {
  var expectedResults = [
    'testGlob',
    'testGlob/...',
  ];
  function dispatcher(suffix) {
    return {
      invoker: new Invoker(new FullGlobber()),
    };
  }
  runGlobTest('testGlob/...', expectedResults, dispatcher, assert);
});

test('bar/... glob full globber', function(assert) {
  var expectedResults = [
    'testGlob/bar/...',
  ];
  function dispatcher(suffix) {
    return {
      invoker: new Invoker(new FullGlobber()),
    };
  }
  runGlobTest('testGlob/bar/...', expectedResults, dispatcher, assert);
});

function ChildGlobber(children) {
  this.children = children;
}

ChildGlobber.prototype.__globChildren = function(ctx, $stream) {
  for (var i = 0; i < this.children.length; i++) {
    $stream.write(this.children[i]);
  }
};

test('foo/bar/baz glob children globber + full globber', function(assert) {
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
      invoker: new Invoker(service),
    };
  }
  runGlobTest('testGlob/foo/bar/baz', expectedResults, dispatcher, assert);
});


