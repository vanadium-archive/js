var test = require('prova');
var serve = require('./serve');
var leafDispatcher = require('../../src/ipc/leaf_dispatcher');
var context = require('../../src/runtime/context');
var cacheSignature = {
  get: {
    inArgs: ['key'],
    numOutArgs: 2,
    isStreaming: false
  },
  set: {
    inArgs: ['key', 'value'],
    numOutArgs: 2,
    isStreaming: false
  },
  multiGet: {
    inArgs: [],
    numOutArgs: 2,
    isStreaming: true
  }
};
var dispatcher = leafDispatcher({
  set: function(key, value) {},
  get: function(key) {},
  multiGet: function($stream) {}
});

test('service.signature([callback]) - js server', function(assert) {
  var ctx = context.Context();
  serve(ctx, 'testing/my-cache', dispatcher, function(err, res) {
    if (err) {
      return assert.error(err);
    }

    res.service.signature(function(err, signature) {
      if (err) {
        return assert.error(err);
      }

      Object.keys(cacheSignature).forEach(function(key) {
        var actual = signature.get(key);
        var expected = cacheSignature[key];

        assert.deepEqual(actual.inArgs, expected.inArgs);
        assert.deepEqual(actual.numOutArgs, expected.numOutArgs);
        assert.deepEqual(actual.isStreaming, expected.isStreaming);
      });

      res.end(assert);
    });
  });
});

test('var promise = service.signature() - js server', function(assert) {
  var ctx = context.Context();
  serve(ctx, 'testing/my-cache', dispatcher, function(err, res) {
    if (err) {
      return assert.error(err);
    }

    res.service.signature()
    .then(function(signature) {
      Object.keys(cacheSignature).forEach(function(key) {
        var actual = signature.get(key);
        var expected = cacheSignature[key];

        assert.deepEqual(actual.inArgs, expected.inArgs);
        assert.deepEqual(actual.numOutArgs, expected.numOutArgs);
        assert.deepEqual(actual.isStreaming, expected.isStreaming);
      });

      res.end(assert);
    })
    .catch(function(err) {
      assert.error(err);
      res.end(assert);
    });

  });
});
