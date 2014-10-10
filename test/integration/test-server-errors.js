var test = require('prova');
var veyron = require('../../');
var Deferred = require('../../src/lib/deferred');
var serve = require('./serve');
var leafDispatcher = require('../../src/ipc/leaf_dispatcher');
var message = 'failure';
var error = new Error(message);
var builtInError = new veyron.errors.NoExistError(message);
var errorThrower = {
  throwError: function() {
    throw error;
  },
  returnError: function() {
    return error;
  },
  returnErrorInCallback: function($cb) {
    $cb(error, null);
  },
  returnStringErrorInCallback: function($cb) {
    $cb(message, null);
  },
  rejectPromise: function() {
    var def = new Deferred();
    def.reject(error);
    return def.promise;
  },
  returnCustomError: function() {
    function CustomError(message) {
      Error.call(this);
      this.name = 'CustomError';
      this.message = message;
      this.stack = (new Error()).stack;
    }
    CustomError.prototype = new Error();
    CustomError.prototype.constructor = CustomError;

    return new CustomError(message);
  },
  returnBuiltInError: function() {
    return builtInError;
  },
  returnErrorOnVoid: function() {
    return error;
  }
};
var metadata = {
  returnErrorOnVoid: {
    numReturnArgs: 0
  }
};
var dispatcher = leafDispatcher(errorThrower, metadata);
var methods = Object.keys(errorThrower);

methods.forEach(function(method) {
  test('jsErrorThrower.' + method + '(callback)', function(assert) {
    serve('js/errorThrower', dispatcher, function(err, res) {
      assert.error(err);

      res.service[method](function(err) {
        assert.ok(err, 'should error');
        assert.ok(err instanceof Error, 'should be Error');
        // TODO(jasoncampbell): The JS is missing support for server context
        // that would allow the error.message to be translated properly as it
        // travels through the supporting veyron services. Currently the
        // message will be converted to "wsprd Root Error " after it goes out
        // over the wire and gets to the client. To resolve this we need to
        // make sure that the context (contains server name and operation)
        // and the params are sent along in error cases. So that the msg
        // string can be convert the template "{1} {2} Error {_}" into
        // something like "my-server my-method Error Error: my-error-message"
        //
        // SEE: veyron.io/veyron/veyron2/verror
        // assert.equal(err.message, message);
        assert.notEqual(err.stack, error.stack,
          'the original stack should not be sent over the wire');
        res.end(assert);
      });
    });
  });
});

test('jsErrorThrower.returnBuiltInError(callback)', function(assert) {
  serve('js/errorThrower', dispatcher, function(err, res) {
    assert.error(err);

    res.service.returnBuiltInError(function(err) {
      assert.ok(err, 'should error');
      // TODO(jasoncampbell): Update once context and param support is
      // available in JS.
      //
      // SEE: test/integration/test-server-error.js:62
      // assert.equal(err.message, message);
      assert.deepEqual(err.idAction, veyron.errors.IdActions.NoExist);
      res.end(assert);
    });
  });
});

test('throw/reject of non-errors', function(t) {
  var weirdErrors = {
    throwString: function() {
      throw message;
    },
    rejectPromiseWithString: function() {
      var def = new Deferred();
      def.reject(message);
      return def.promise;
    },
    throwNull: function() {
      throw null;
    },
    throwEmpty: function() {
      throw '';
    },
    rejectNothing: function() {
      var def = new Deferred();
      def.reject();
      return def.promise;
    },
    rejectNull: function() {
      var def = new Deferred();
      def.reject(null);
      return def.promise;
    },
    rejectEmpty: function() {
      var def = new Deferred();
      def.reject('');
      return def.promise;
    }
  };
  var dispatcher = leafDispatcher(weirdErrors);

  Object.keys(weirdErrors).forEach(function(method) {
    t.test('service.' + method + '()', function(assert) {
      serve('js/thrower', dispatcher, function(err, res) {
        assert.error(err);

        res.service[method](function(err) {
          assert.ok(err, 'should error');
          assert.ok(err instanceof Error, 'should be Error');
          // TODO(jasoncampbell): Update once context and param support is
          // available in JS.
          //
          // SEE: test/integration/test-server-error.js:62
          // assert.equal(err.message, 'Unknown exception.');
          assert.deepEqual(err.idAction, veyron.errors.IdActions.Unknown);
          assert.ok(err.stack);
          res.end(assert);
        });
      });
    });
  });
});
