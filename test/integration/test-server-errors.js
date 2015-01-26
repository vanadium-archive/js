var test = require('prova');
var veyron = require('../../');
var Deferred = require('../../src/lib/deferred');
var serve = require('./serve');
var leafDispatcher = require('../../src/ipc/leaf-dispatcher');
var message = 'failure';
var context = require('../../src/runtime/context');

testStandardErrors();
testNonStandardErrors();

function testStandardErrors() {
  var error = new Error(message);
  var errorThrower = {
    throwError: function(ctx) {
      throw error;
    },
    returnErrorInCallback: function(ctx, cb) {
      cb(error, null);
    },
    returnStringErrorInCallback: function(ctx, cb) {
      cb(message, null);
    },
    rejectPromise: function(ctx) {
      var def = new Deferred();
      def.reject(error);
      return def.promise;
    },
    throwCustomError: function(ctx) {
      function CustomError(message) {
        Error.call(this);
        this.name = 'CustomError';
        this.message = message;
        this.stack = (new Error()).stack;
      }
      CustomError.prototype = new Error();
      CustomError.prototype.constructor = CustomError;

      throw new CustomError(message);
    }
  };
  var dispatcher = leafDispatcher(errorThrower);
  var methods = Object.keys(errorThrower);

  methods.forEach(function(method) {
    test('Test returning errors of type error() - ' +
      method + '(callback)', function(assert) {

      var ctx = context.Context();
      serve(ctx, 'js/errorThrower/' + method, dispatcher, function(err, res) {
        if (err) {
          return assert.end(err);
        }

        res.service[method](ctx, function(err) {
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
          // SEE: v.io/core/veyron2/verror
          // assert.equal(err.message, message);
          assert.notEqual(err.stack, error.stack,
            'the original stack should not be sent over the wire');
          res.end(assert);
        });
      });
    });
  });
}

function testNonStandardErrors() {
  var nonStandardErrorThrower = {
    throwString: function(ctx) {
      throw message;
    },
    rejectPromiseWithString: function(ctx) {
      var def = new Deferred();
      def.reject(message);
      return def.promise;
    },
    throwNull: function(ctx) {
      throw null;
    },
    throwEmpty: function(ctx) {
      throw '';
    },
    rejectNothing: function(ctx) {
      var def = new Deferred();
      def.reject();
      return def.promise;
    },
    rejectNull: function(ctx) {
      var def = new Deferred();
      def.reject(null);
      return def.promise;
    },
    rejectEmpty: function(ctx) {
      var def = new Deferred();
      def.reject('');
      return def.promise;
    }
  };
  var dispatcher = leafDispatcher(nonStandardErrorThrower);

  Object.keys(nonStandardErrorThrower).forEach(function(method) {
    test('Test returning errors that are not of standard type error() - ' +
      method + '()', function(assert) {

      var ctx = context.Context();
      serve(ctx, 'js/thrower/' + method, dispatcher, function(err, res) {
        if (err) {
          return assert.end(err);
        }

        res.service[method](ctx, function(err) {
          assert.ok(err, 'should error');
          assert.ok(err instanceof Error, 'should be Error');
          // TODO(jasoncampbell): Update once context and param support is
          // available in JS.
          //
          // SEE: test/integration/test-server-error.js:62
          // assert.equal(err.message, 'Unknown exception.');
          // TODO(bprosnitz) Change back to
          // assert.deepEquals(err.idAction, veyron.errors.IdActions);
          assert.ok(err instanceof veyron.errors.UnknownError,
            'error ids match');
          assert.ok(err.stack, 'error has a stack');
          res.end(assert);
        });
      });
    });
  });
}
