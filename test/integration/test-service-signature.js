var test = require('prova');
var veyron = require('../../');
var port = require('../services/config-wsprd').flags.port;
var knownSignature = {
  get: {
    inArgs: ['key'],
    numOutArgs: 2,
    isStreaming: false
  },
  set: {
    inArgs: ['key', 'value'],
    numOutArgs: 1,
    isStreaming: false
  },
  multiGet: {
    inArgs: [],
    numOutArgs: 1,
    isStreaming: true
  }
};

test('service.signature([callback])', function(assert) {
  var config = {
    wspr: 'http://localhost:' + port
  };
  var rt;

  veyron.init(config, onruntime);

  function onruntime(err, runtime) {
    assert.error(err);

    rt = runtime;
    runtime.bindTo('cache', onbind);
  }

  function onbind(err, service) {
    assert.error(err);

    service.signature(onsignature);
  }

  function onsignature(err, signature) {
    assert.error(err);

    Object.keys(knownSignature).forEach(function(key) {
      assert.ok(signature.hasOwnProperty(key));

      var actual = signature[key];
      var expected = knownSignature[key];

      assert.deepEqual(actual.inArgs, expected.inArgs);
      assert.deepEqual(actual.numOutArgs, expected.numOutArgs);
      assert.deepEqual(actual.isStreaming, expected.isStreaming);
    });

    rt.close(assert.end);
  }
});

test('service.signature() - promise', function(assert) {
  var config = {
    wspr: 'http://localhost:' + port
  };

  var rt;

  veyron
  .init(config)
  .then(bindTo)
  .then(getSignature)
  .then(function(signature) {
    Object.keys(knownSignature).forEach(function(key) {
      assert.ok(signature.hasOwnProperty(key));

      var actual = signature[key];
      var expected = knownSignature[key];

      assert.deepEqual(actual.inArgs, expected.inArgs);
      assert.deepEqual(actual.numOutArgs, expected.numOutArgs);
      assert.deepEqual(actual.isStreaming, expected.isStreaming);
    });

    rt.close(assert.end);
  })
  .catch(assert.end);

  function bindTo(runtime) {
    rt = runtime;
    return runtime.bindTo('cache');
  }

  function getSignature(service) {
    return service.signature();
  }
});
