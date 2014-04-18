/**
 * @fileoverview Tests ErrorConversion
 */
'use strict';

var vError = require('../../../../src/lib/verror');
var ErrorConversion = require('../../../../src/proxy/error_conversion');
var errMessage = 'fail';

var assertError = function(err, name, typeConstructor) {
  expect(err).to.be.instanceof(Error);
  expect(err).to.be.instanceof(vError.VeyronError);
  if(typeConstructor) {
    expect(err).to.be.instanceof(typeConstructor);
  }
  expect(err.name).to.equal(name);
  expect(err.message).to.equal(errMessage);
  expect(err.toString()).to.equal(err.name + ': ' + err.message);
  expect(err.stack).to.be.empty;
};

describe('toStandardErrorStruct', function() {

  it('Should convert JS Error to internal structure', function() {
    var jsErr = new Error(errMessage);
    jsErr.name = 'MyError';
    var struct = ErrorConversion.toStandardErrorStruct(jsErr);
    expect(struct.ID).to.equal('MyError');
    expect(struct.Msg).to.equal(errMessage);
  });

  it('Should use unknown type for default JS error type', function() {
    var jsErr = new Error(errMessage);
    var struct = ErrorConversion.toStandardErrorStruct(jsErr);
    expect(struct.ID).to.equal('');
    expect(struct.Msg).to.equal(errMessage);
  });

  it('Should convert predefined errors to internal structure', function() {
    var jsErr = vError.NotAuthorizedError(errMessage);
    var struct = ErrorConversion.toStandardErrorStruct(jsErr);
    expect(struct.ID).to.equal(vError.Ids.NotAuthorized);
    expect(struct.Msg).to.equal(errMessage);
  });

  it('Should convert JS string to internal structure', function() {
    var struct = ErrorConversion.toStandardErrorStruct(errMessage);
    expect(struct.ID).to.equal('');
    expect(struct.Msg).to.equal(errMessage);
  });

  it('Should convert undefined to internal structure', function() {
    var struct = ErrorConversion.toStandardErrorStruct();
    expect(struct.ID).to.equal('');
    expect(struct.Msg).to.equal('');
  });
});

describe('toJSerror', function() {
  it('Should convert from internal structure to JS Error', function() {
    var struct = {
      ID: 'MyError',
      Msg: errMessage
    };

    var jsErr = ErrorConversion.toJSerror(struct);
    assertError(jsErr, 'MyError');
  });

  it('Should create default error for unknown ID', function() {
    var struct = {
      ID: '',
      Msg: errMessage
    };

    var jsErr = ErrorConversion.toJSerror(struct);
    assertError(jsErr, 'Error'); //Error is the default name of JS error
  });

  it('Should convert to JS AbortedError', function() {
    var struct = {
      ID: vError.Ids.Aborted,
      Msg: errMessage
    };

    var jsErr = ErrorConversion.toJSerror(struct);
    assertError(jsErr, vError.Ids.Aborted, vError.AbortedError);
  });

  it('Should convert to JS BadArgError', function() {
    var struct = {
      ID: vError.Ids.BadArg,
      Msg: errMessage
    };

    var jsErr = ErrorConversion.toJSerror(struct);
    assertError(jsErr, vError.Ids.BadArg, vError.BadArgError);
  });

  it('Should convert to JS BadProtocolError', function() {
    var struct = {
      ID: vError.Ids.BadProtocol,
      Msg: errMessage
    };

    var jsErr = ErrorConversion.toJSerror(struct);
    assertError(jsErr, vError.Ids.BadProtocol, vError.BadProtocolError);
  });

  it('Should convert to JS ExistsError', function() {
    var struct = {
      ID: vError.Ids.Exists,
      Msg: errMessage
    };

    var jsErr = ErrorConversion.toJSerror(struct);
    assertError(jsErr, vError.Ids.Exists, vError.ExistsError);
  });

  it('Should convert to JS InternalError', function() {
    var struct = {
      ID: vError.Ids.Internal,
      Msg: errMessage
    };

    var jsErr = ErrorConversion.toJSerror(struct);
    assertError(jsErr, vError.Ids.Internal, vError.InternalError);
  });

  it('Should convert to JS NotAuthorizedError', function() {
    var struct = {
      ID: vError.Ids.NotAuthorized,
      Msg: errMessage
    };

    var jsErr = ErrorConversion.toJSerror(struct);
    assertError(jsErr, vError.Ids.NotAuthorized, vError.NotAuthorizedError);
  });

  it('Should convert to NotFoundError', function() {
    var struct = {
      ID: vError.Ids.NotFound,
      Msg: errMessage
    };

    var jsErr = ErrorConversion.toJSerror(struct);
    assertError(jsErr, vError.Ids.NotFound, vError.NotFoundError);
  });

});