var test = require('prova');
var Namespace = require('../../src/namespace/namespace');
var Deferred = require('../../src/lib/deferred');
var vError = require('../../src/lib/verror');
var roots = [ '/a', '/b/c' ];
var format = require('util').format;

test('namespace.resolveToMountTable(name, cb)', function(assert) {
  var client = new MockClient({
    // There is a server (/x,/y)  mounted at d on /a.
    '/a//d/e': response([ '/x', '/y'], 'e')
  });
  var namespace = new Namespace(client, roots);

  namespace.resolveToMountTable('d/e', function(err, results) {
    assert.error(err);
    assert.deepEqual(results, [ '/a//d/e', '/b//c/d/e' ]);
    assert.end();
  });
});

test('namespace.resolveMaximally(name, cb)', function(assert) {
  var client = new MockClient({
    '/a//d/e': response([ '/x', '/y'], 'e')
  });
  var namespace = new Namespace(client, roots);

  namespace.resolveMaximally('d/e', function(err, results) {
    assert.error(err);
    assert.deepEqual(results, [ '/x//e', '/y//e' ]);
    assert.end();
  });
});

var resolvers = [
  'resolveMaximally',
  'resolveToMountTable'
];

resolvers.forEach(function(resolver) {
  var prefix = format('namespace.%s(name, callback) - ', resolver);

  test(prefix + 'intermediate namespace resolution', function(assert) {
    var client = new MockClient({
      '/a//d/e/f': response(['/x', '/y'], 'e/f'),
      '/x//e/f': Namespace.errNoSuchName()
    });
    var namespace = new Namespace(client, roots);

    namespace[resolver]('d/e/f', function(err, results) {
      assert.error(err);
      assert.deepEqual(results, [ '/x//e/f', '/y//e/f' ]);
      assert.end();
    });
  });

  // Prevent the linter from complaining about line length
  var message = prefix + 'resolve through mounttables to a non-mounttable';
  test(message, function(assert) {
    var client = new MockClient({
      '/a//d/f': response(['/x', '/y'], 'f'),
      '/x//f': response(['/store'], ''),
    });
    var namespace = new Namespace(client, roots);

    namespace[resolver]('d/f', function(err, results) {
      assert.error(err);
      assert.deepEqual(results, [ '/store' ]);
      assert.end();
    });
  });

  test(prefix + 'try alternates when one server fails', function(assert) {
    var client = new MockClient({
      '/a//d/g': new Error('Query of death'),
      '/b//c/d/g': response(['/fromb'], ''),
    });
    var namespace = new Namespace(client, roots);

    namespace[resolver]('d/g', function(err, results) {
      assert.error(err);
      assert.deepEqual(results, [ '/fromb' ]);
      assert.end();
    });
  });

  test(prefix + 'errors on last resolution faliure', function(assert) {
    var client = new MockClient({
      '/a//h/i': response([ '/x', '/y' ], 'i'),
      '/x//i': new vError.BadArgError(),
      '/y//i': new vError.InternalError(),
    });
    var namespace = new Namespace(client, roots);

    namespace[resolver]('h/i', function(err) {
      var isInernalError = err instanceof vError.InternalError;

      assert.ok(isInernalError, 'should be instanceof vError.InternalError');
      assert.end();
    });
  });

  test(prefix + 'errors on max depth', function(assert) {
    // Set up a case where all the names fail.
    var client = new MockClient({
      '/a//b': response([ '/x' ], 'b'),
      '/x//b': response([ '/a' ], 'b'),
    });
    var namespace = new Namespace(client, roots);

    namespace[resolver]('b', function(err) {
      var isInernalError = err instanceof vError.InternalError;

      assert.ok(isInernalError, 'should be instanceof vError.InternalError');
      assert.end();
    });
  });
});


// Convenience method to build a proper resolveStep response.
function response(servers, suffix) {
  var entries = servers.map(function(key) {
    return { server: key };
  });

  return [ entries, suffix ];
}

// Any name in the mountPoints dictionary supports resolve step and
// resolve step returns the associated value.  Any name
// not in this dictionary will bind to something without
// the resolveStep method, and will be considered a non-mounttable.
function MockClient(mountPoints) {
  this.mountPoints = mountPoints;
}

MockClient.prototype.bindTo = function(name, cb) {
  var value = this.mountPoints[name];
  var deferred = new Deferred(cb);

  if (value) {
    var ns = new MockNamespace(value);
    deferred.resolve(ns);
  } else {
    deferred.resolve({});
  }

  return deferred.promise;
};

function MockNamespace(value) {
  this.value = value;
}

MockNamespace.prototype.resolveStep = function(cb) {
  var value = this.value;
  var deferred = new Deferred(cb);
  var isError = value instanceof Error;

  if (isError) {
    deferred.reject(value);
  } else {
    deferred.resolve(value);
  }

  return deferred.promise;
};
