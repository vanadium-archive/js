var test = require('prova');
var veyron = require('../../');
var Promise = require('../../src/lib/promise');
var port = require('../services/config-wsprd').flags.port;
var config = {
  wspr: 'http://localhost:' + port
};
var namespaceRootAddress = require('../services/config-mounttabled').flags[
  'veyron.tcp.address'
];
var PREFIX = 'namespace-testing/';

test('glob(' + PREFIX + '*)', function(assert) {
  var runtime;

  init(config).then(function glob(rt) {
    runtime = rt;
    var namespace = rt.newNamespace2();
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
    if(runtime) {
      runtime.close(assert.end);
    }
  }
});

test('glob(' + PREFIX + 'cottage/*/*/*) - nested', function(assert) {
  var runtime;

  init(config).then(function glob(rt) {
    runtime = rt;
    var namespace = rt.newNamespace2();
    var rpc = namespace.glob(PREFIX + 'cottage/*/*/*');
    rpc.catch(end);
    return readAllNames(rpc.stream);
  }).then(function validate(actual) {
    var expected = [
    PREFIX + 'cottage/lawn/back/sprinkler',
    PREFIX + 'cottage/lawn/front/sprinkler'];
    assert.deepEqual(actual.sort(), expected.sort());
    end();
  }).catch(end);

  function end(err) {
    assert.error(err);
    if(runtime) {
      runtime.close(assert.end);
    }
  }
});

test('glob(' + PREFIX + 'does/not/exist) - empty', function(assert) {
  var runtime;

  init(config).then(function glob(rt) {
    runtime = rt;
    var namespace = rt.newNamespace2();
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
    if(runtime) {
      runtime.close(assert.end);
    }
  }
});

test('setRoots() -> invalid', function(assert) {
  var runtime;

  init(config).then(function glob(rt) {
    runtime = rt;
    var namespace = rt.newNamespace2();
    // Set the roots to a invalid roots, then we don't expect any glob results.
    namespace.setRoots('/bad-root-address-1.tld', '/bad-root-address-2.tld');
    var rpc = namespace.glob(PREFIX + '*');
    rpc.catch(end);
    return readAllNames(rpc.stream);
  }).then(function validate(actual) {
    var expected = [];
    assert.deepEqual(actual.sort(), expected.sort());
    end();
  }).catch(end);

  function end(err) {
    assert.error(err);
    if(runtime) {
      runtime.close(assert.end);
    }
  }
});

test('setRoots() -> valid', function(assert) {
  var runtime;

  init(config).then(function glob(rt) {
    runtime = rt;
    var namespace = rt.newNamespace2();
    // Set the roots to a valid root, we expect normal glob results.
    namespace.setRoots('/' + namespaceRootAddress );
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
    if(runtime) {
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
  return new Promise( function(resolve, reject) {
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
  'namespace-testing/house/alarm',
  'namespace-testing/house/living-room/lights',
  'namespace-testing/house/living-room/smoke-detector',
  'namespace-testing/house/kitchen/lights',
  'namespace-testing/cottage/alarm',
  'namespace-testing/cottage/lawn/back/sprinkler',
  'namespace-testing/cottage/lawn/front/sprinkler',
];

function init(config) {
  var runtime;
  return veyron.init(config).then(function setupNamespaceSimulation(rt) {
    runtime = rt;
    var serveRequests = SAMPLE_NAMESPACE.map(function(name) {
      return rt.serve(name, {});
    });
    return Promise.all(serveRequests);
  }).then(function ready() {
    return runtime;
  });
}

