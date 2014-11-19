var test = require('prova');
var service = require('./get-service');
var verror = require('../../src/lib/verror');
var context = require('../../src/runtime/context');

test('errorThrower.method(callback) - AbortedError', function(assert) {
  var ctx = context.Context();
  service(ctx, 'test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);

    errorThrower.throwAborted(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('Aborted!') !== -1);
      assert.ok(err instanceof verror.AbortedError, 'should be AbortedError');
      end(assert);
    });
  });
});

test('errorThrower.method(callback) - BadArgError', function(assert) {
  var ctx = context.Context();
  service(ctx, 'test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);

    errorThrower.throwBadArg(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('BadArg!') !== -1);
      assert.ok(err instanceof verror.BadArgError, 'should be BadArgError');
      end(assert);
    });
  });
});

test('errorThrower.method(callback) - BadProtocolError', function(assert) {
  var ctx = context.Context();
  service(ctx, 'test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);

    errorThrower.throwBadProtocol(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('BadProtocol!') !== -1);
      assert.ok(err instanceof verror.BadProtocolError,
        'should be BadProtocolError');
      end(assert);
    });
  });
});

test('errorThrower.method(callback) - InternalError', function(assert) {
  var ctx = context.Context();
  service(ctx, 'test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);

    errorThrower.throwInternal(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('Internal!') !== -1);
      assert.ok(err instanceof verror.InternalError,
        'should be InternalError');
      end(assert);
    });
  });
});

test('errorThrower.method(callback) - NoAccess', function(assert) {
  var ctx = context.Context();
  service(ctx, 'test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);

    errorThrower.throwNoAccess(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('NoAccess!') !== -1);
      assert.ok(err instanceof verror.NoAccessError,
        'should be NoAccessError');
      end(assert);
    });
  });
});

test('errorThrower.method(callback) - NoExist', function(assert) {
  var ctx = context.Context();
  service(ctx, 'test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);

    errorThrower.throwNoExist(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('NoExist!') !== -1);
      assert.ok(err instanceof verror.NoExistError, 'should be NoExistError');
      end(assert);
    });
  });
});

test('errorThrower.method(callback) - NoExistOrNoAccess', function(assert) {
  var ctx = context.Context();
  service(ctx, 'test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);
    
    errorThrower.throwNoExistOrNoAccess(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('NoExistOrNoAccess!') !== -1);
      assert.ok(err instanceof verror.NoExistOrNoAccessError,
        'should be NoExistOrNoAccess');
      end(assert);
    });
  });
});

test('errorThrower.method(callback) - Unknown Error', function(assert) {
  var ctx = context.Context();
  service(ctx, 'test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);

    errorThrower.throwUnknown(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('Unknown!') !== -1);
      assert.ok(err instanceof verror.VeyronError, 'should be VeyronError');
      end(assert);
    });
  });
});

test('errorThrower.method(callback) - GoError Error', function(assert) {
  var ctx = context.Context();
  service(ctx, 'test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);

    errorThrower.throwGoError(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('GoError!') !== -1);
      assert.ok(err instanceof verror.VeyronError, 'should be VeyronError');
      end(assert);
    });
  });
});

test('errorThrower.method(callback) - GoError Error', function(assert) {
  var ctx = context.Context();
  service(ctx, 'test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);

    errorThrower.throwCustomStandardError(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('CustomStandard!') !== -1);
      assert.ok(err instanceof verror.VeyronError, 'should be VeyronError');
      end(assert);
    });
  });
});
