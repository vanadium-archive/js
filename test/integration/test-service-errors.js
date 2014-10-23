var test = require('prova');
var service = require('./get-service');
var verror = require('../../src/lib/verror');

test('errorThrower.method(callback) - AbortedError', function(assert) {
  service('test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);

    errorThrower.throwAborted(function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('Aborted!') !== -1);
      assert.ok(err instanceof verror.AbortedError, 'should be AbortedError');
      end(assert);
    });
  });
});

test('errorThrower.method(callback) - BadArgError', function(assert) {
  service('test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);

    errorThrower.throwBadArg(function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('BadArg!') !== -1);
      assert.ok(err instanceof verror.BadArgError, 'should be BadArgError');
      end(assert);
    });
  });
});

test('errorThrower.method(callback) - BadProtocolError', function(assert) {
  service('test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);

    errorThrower.throwBadProtocol(function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('BadProtocol!') !== -1);
      assert.ok(err instanceof verror.BadProtocolError,
        'should be BadProtocolError');
      end(assert);
    });
  });
});

test('errorThrower.method(callback) - InternalError', function(assert) {
  service('test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);

    errorThrower.throwInternal(function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('Internal!') !== -1);
      assert.ok(err instanceof verror.InternalError,
        'should be InternalError');
      end(assert);
    });
  });
});

test('errorThrower.method(callback) - NoAccess', function(assert) {
  service('test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);

    errorThrower.throwNoAccess(function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('NoAccess!') !== -1);
      assert.ok(err instanceof verror.NoAccessError,
        'should be NoAccessError');
      end(assert);
    });
  });
});

test('errorThrower.method(callback) - NoExist', function(assert) {
  service('test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);

    errorThrower.throwNoExist(function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('NoExist!') !== -1);
      assert.ok(err instanceof verror.NoExistError, 'should be NoExistError');
      end(assert);
    });
  });
});

test('errorThrower.method(callback) - NoExistOrNoAccess', function(assert) {
  service('test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);

    errorThrower.throwNoExistOrNoAccess(function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('NoExistOrNoAccess!') !== -1);
      assert.ok(err instanceof verror.NoExistOrNoAccessError,
        'should be NoExistOrNoAccess');
      end(assert);
    });
  });
});

test('errorThrower.method(callback) - Unknown Error', function(assert) {
  service('test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);

    errorThrower.throwUnknown(function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('Unknown!') !== -1);
      assert.ok(err instanceof verror.VeyronError, 'should be VeyronError');
      end(assert);
    });
  });
});

test('errorThrower.method(callback) - GoError Error', function(assert) {
  service('test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);

    errorThrower.throwGoError(function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('GoError!') !== -1);
      assert.ok(err instanceof verror.VeyronError, 'should be VeyronError');
      end(assert);
    });
  });
});

test('errorThrower.method(callback) - GoError Error', function(assert) {
  service('test_service/errorThrower', function(err, errorThrower, end) {
    assert.error(err);

    errorThrower.throwCustomStandardError(function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('CustomStandard!') !== -1);
      assert.ok(err instanceof verror.VeyronError, 'should be VeyronError');
      end(assert);
    });
  });
});
