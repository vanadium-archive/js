// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var vanadium = require('../../');
var service = require('./get-service');
var verror = vanadium.verror;
var VanadiumError = verror.VanadiumError;

test('Test Go service returning Aborted error - ' +
  'errorThrower.method(callback)', function(assert) {
  service('test_service/errorThrower', function(err, ctx, errorThrower, end) {
    assert.error(err);

    errorThrower.throwAborted(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('Aborted') !== -1);
      assert.ok(err instanceof verror.AbortedError, 'should be AbortedError');
      end(assert);
    });
  });
});

test('Test Go service returning BadArg error - ' +
  'errorThrower.method(callback)', function(assert) {
  service('test_service/errorThrower', function(err, ctx, errorThrower, end) {
    assert.error(err);

    errorThrower.throwBadArg(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('Bad argument') !== -1);
      assert.ok(err instanceof verror.BadArgError, 'should be BadArgError');
      end(assert);
    });
  });
});

test('Test Go service returning BadProtocol error - ' +
  'errorThrower.method(callback)', function(assert) {
  service('test_service/errorThrower', function(err, ctx, errorThrower, end) {
    assert.error(err);

    errorThrower.throwBadProtocol(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('Bad protocol') !== -1);
      assert.ok(err instanceof verror.BadProtocolError,
        'should be BadProtocolError');
      end(assert);
    });
  });
});

test('Test Go service returning Internal error - ' +
  'errorThrower.method(callback)', function(assert) {
  service('test_service/errorThrower', function(err, ctx, errorThrower, end) {
    assert.error(err);

    errorThrower.throwInternal(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('Internal error') !== -1);
      assert.ok(err instanceof verror.InternalError,
        'should be InternalError');
      end(assert);
    });
  });
});

test('Test Go service returning NoAccess error - ' +
  'errorThrower.method(callback)', function(assert) {
  service('test_service/errorThrower', function(err, ctx, errorThrower, end) {
    assert.error(err);

    errorThrower.throwNoAccess(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('Access denied') !== -1);
      assert.ok(err instanceof verror.NoAccessError,
        'should be NoAccessError');
      end(assert);
    });
  });
});

test('Test Go service returning NoExist error - ' +
  'errorThrower.method(callback)', function(assert) {
  service('test_service/errorThrower', function(err, ctx, errorThrower, end) {
    assert.error(err);

    errorThrower.throwNoExist(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('Does not exist') !== -1);
      assert.ok(err instanceof verror.NoExistError, 'should be NoExistError');
      end(assert);
    });
  });
});

test('Test Go service returning NoExistOrNoAccess error - ' +
  'errorThrower.method(callback)', function(assert) {
  service('test_service/errorThrower', function(err, ctx, errorThrower, end) {
    assert.error(err);

    errorThrower.throwNoExistOrNoAccess(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('Does not exist or access denied') !== -1);
      assert.ok(err instanceof verror.NoExistOrNoAccessError,
        'should be NoExistOrNoAccess');
      end(assert);
    });
  });
});

test('Test Go service returning Unknown error - ' +
  'errorThrower.method(callback)', function(assert) {
  service('test_service/errorThrower', function(err, ctx, errorThrower, end) {
    assert.error(err);

    errorThrower.throwUnknown(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('Error') !== -1);
      assert.ok(err instanceof VanadiumError, 'should be VanadiumError');
      end(assert);
    });
  });
});

test('Test Go service returning GoError error - ' +
  'errorThrower.method(callback)', function(assert) {
  service('test_service/errorThrower', function(err, ctx, errorThrower, end) {
    assert.error(err);

    errorThrower.throwGoError(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('GoError!') !== -1);
      assert.ok(err instanceof VanadiumError, 'should be VanadiumError');
      end(assert);
    });
  });
});

test('Test Go service returning CustomStandard error - ' +
  'errorThrower.method(callback)', function(assert) {
  service('test_service/errorThrower', function(err, ctx, errorThrower, end) {
    assert.error(err);

    errorThrower.throwCustomStandardError(ctx, function(err) {
      assert.ok(err, 'should error');
      assert.ok(err.message.indexOf('CustomStandard!') !== -1);
      assert.ok(err instanceof VanadiumError, 'should be VanadiumError');
      end(assert);
    });
  });
});
