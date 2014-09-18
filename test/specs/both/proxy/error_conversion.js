/**
 * @fileoverview Tests ErrorConversion
 */
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
    expect(struct.iD).to.equal('MyError');
    expect(struct.msg).to.equal(errMessage);
  });

  it('Should use unknown type for default JS error type', function() {
    var jsErr = new Error(errMessage);
    var struct = ErrorConversion.toStandardErrorStruct(jsErr);
    expect(struct.iD).to.equal('');
    expect(struct.msg).to.equal(errMessage);
  });

  it('Should convert predefined errors to internal structure', function() {
    var jsErr = vError.NoAccessError(errMessage);
    var struct = ErrorConversion.toStandardErrorStruct(jsErr);
    expect(struct.iD).to.equal(vError.Ids.NoAccess);
    expect(struct.msg).to.equal(errMessage);
  });

  it('Should convert JS string to internal structure', function() {
    var struct = ErrorConversion.toStandardErrorStruct(errMessage);
    expect(struct.iD).to.equal('');
    expect(struct.msg).to.equal(errMessage);
  });

  it('Should convert undefined to internal structure', function() {
    var struct = ErrorConversion.toStandardErrorStruct();
    expect(struct.iD).to.equal('');
    expect(struct.msg).to.equal('');
  });
});

describe('toJSerror', function() {
  it('Should convert from internal structure to JS Error', function() {
    var struct = {
      iD: 'MyError',
      msg: errMessage
    };

    var jsErr = ErrorConversion.toJSerror(struct);
    assertError(jsErr, 'MyError');
  });

  it('Should create default error for unknown ID', function() {
    var struct = {
      iD: '',
      msg: errMessage
    };

    var jsErr = ErrorConversion.toJSerror(struct);
    assertError(jsErr, 'Error'); //Error is the default name of JS error
  });

  it('Should convert to JS AbortedError', function() {
    var struct = {
      iD: vError.Ids.Aborted,
      msg: errMessage
    };

    var jsErr = ErrorConversion.toJSerror(struct);
    assertError(jsErr, vError.Ids.Aborted, vError.AbortedError);
  });

  it('Should convert to JS BadArgError', function() {
    var struct = {
      iD: vError.Ids.BadArg,
      msg: errMessage
    };

    var jsErr = ErrorConversion.toJSerror(struct);
    assertError(jsErr, vError.Ids.BadArg, vError.BadArgError);
  });

  it('Should convert to JS BadProtocolError', function() {
    var struct = {
      iD: vError.Ids.BadProtocol,
      msg: errMessage
    };

    var jsErr = ErrorConversion.toJSerror(struct);
    assertError(jsErr, vError.Ids.BadProtocol, vError.BadProtocolError);
  });

  it('Should convert to JS ExistsError', function() {
    var struct = {
      iD: vError.Ids.Exists,
      msg: errMessage
    };

    var jsErr = ErrorConversion.toJSerror(struct);
    assertError(jsErr, vError.Ids.Exists, vError.ExistsError);
  });

  it('Should convert to JS InternalError', function() {
    var struct = {
      iD: vError.Ids.Internal,
      msg: errMessage
    };

    var jsErr = ErrorConversion.toJSerror(struct);
    assertError(jsErr, vError.Ids.Internal, vError.InternalError);
  });

  it('Should convert to JS NoAccessError', function() {
    var struct = {
      iD: vError.Ids.NoAccess,
      msg: errMessage
    };

    var jsErr = ErrorConversion.toJSerror(struct);
    console.log(jsErr);
    console.log(vError.Ids.NoAccess);
    console.log(vError.NoAccessError);
    assertError(jsErr, vError.Ids.NoAccess, vError.NoAccessError);
  });

  it('Should convert to NoExistError', function() {
    var struct = {
      iD: vError.Ids.NoExist,
      msg: errMessage
    };

    var jsErr = ErrorConversion.toJSerror(struct);
    assertError(jsErr, vError.Ids.NoExist, vError.NoExistError);
  });

  it('Should convert to NoExistOrNoAccessError', function() {
    var struct = {
      iD: vError.Ids.NoExistOrNoAccess,
      msg: errMessage
    };

    var jsErr = ErrorConversion.toJSerror(struct);
    assertError(jsErr, vError.Ids.NoExistOrNoAccess,
        vError.NoExistOrNoAccessError);
  });
});
