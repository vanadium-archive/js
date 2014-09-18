/**
 * @fileoverview Tests vError
 */
var vError = require('../../../../src/lib/verror.js');
var errMessage = 'fail';

var assertError = function(err, name) {
  expect(err).to.be.instanceof(Error);
  expect(err).to.be.instanceof(vError.VeyronError);
  expect(err.name).to.equal(name);
  expect(err.message).to.equal(errMessage);
  expect(err.toString()).to.equal(err.name + ': ' + err.message);
  expect(err.stack).to.not.be.empty;
};

describe('vError', function() {
  describe('AbortedError', function() {
    it('Should return an Error with Name set to Ids.Aborted', function() {
      var err = new vError.AbortedError(errMessage);
      expect(err).to.be.instanceof(vError.AbortedError);
      assertError(err, vError.Ids.Aborted);
    });

    it('Should work as a function without New keyword', function() {
      var err = vError.AbortedError(errMessage);
      expect(err).to.be.instanceof(vError.AbortedError);
      assertError(err, vError.Ids.Aborted);
    });
  });

  describe('BadArgError', function() {
    it('Should return an Error with Name set to Ids.BadArg', function() {
      var err = new vError.BadArgError(errMessage);
      expect(err).to.be.instanceof(vError.BadArgError);
      assertError(err, vError.Ids.BadArg);
    });

    it('Should work as a function without New keyword', function() {
      var err = vError.BadArgError(errMessage);
      expect(err).to.be.instanceof(vError.BadArgError);
      assertError(err, vError.Ids.BadArg);
    });
  });

  describe('BadProtocolError', function() {
    it('Should return an Error with Name set to Ids.BadProtocol', function() {
      var err = new vError.BadProtocolError(errMessage);
      expect(err).to.be.instanceof(vError.BadProtocolError);
      assertError(err, vError.Ids.BadProtocol);
    });

    it('Should work as a function without New keyword', function() {
      var err = vError.BadProtocolError(errMessage);
      expect(err).to.be.instanceof(vError.BadProtocolError);
      assertError(err, vError.Ids.BadProtocol);
    });
  });

  describe('ExistsError', function() {
    it('Should return an Error with Name set to Ids.Exists', function() {
      var err = new vError.ExistsError(errMessage);
      expect(err).to.be.instanceof(vError.ExistsError);
      assertError(err, vError.Ids.Exists);
    });

    it('Should work as a function without New keyword', function() {
      var err = vError.ExistsError(errMessage);
      expect(err).to.be.instanceof(vError.ExistsError);
      assertError(err, vError.Ids.Exists);
    });
  });

  describe('InternalError', function() {
    it('Should return an Error with Name set to Ids.Internal', function() {
      var err = new vError.InternalError(errMessage);
      expect(err).to.be.instanceof(vError.InternalError);
      assertError(err, vError.Ids.Internal);
    });

    it('Should work as a function without New keyword', function() {
      var err = vError.InternalError(errMessage);
      expect(err).to.be.instanceof(vError.InternalError);
      assertError(err, vError.Ids.Internal);
    });
  });

  describe('NoAccessError', function() {
    it('Should return an Error with Name set to Ids.NoAccess', function() {
      var err = new vError.NoAccessError(errMessage);
      expect(err).to.be.instanceof(vError.NoAccessError);
      assertError(err, vError.Ids.NoAccess);
    });

    it('Should work as a function without New keyword', function() {
      var err = vError.NoAccessError(errMessage);
      expect(err).to.be.instanceof(vError.NoAccessError);
      assertError(err, vError.Ids.NoAccess);
    });
  });

  describe('NoExistError', function() {
    it('Should return an Error with Name set to Ids.NoExist', function() {
      var err = new vError.NoExistError(errMessage);
      expect(err).to.be.instanceof(vError.NoExistError);
      assertError(err, vError.Ids.NoExist);
    });

    it('Should work as a function without New keyword', function() {
      var err = vError.NoExistError(errMessage);
      expect(err).to.be.instanceof(vError.NoExistError);
      assertError(err, vError.Ids.NoExist);
    });
  });

  describe('NoExistOrNoAccessError', function() {
    it('Should return an Error with Name set to Ids.NoExistOrNoAccess',
        function() {
      var err = new vError.NoExistOrNoAccessError(errMessage);
      expect(err).to.be.instanceof(vError.NoExistOrNoAccessError);
      assertError(err, vError.Ids.NoExistOrNoAccess);
    });

    it('Should work as a function without New keyword', function() {
      var err = vError.NoExistOrNoAccessError(errMessage);
      expect(err).to.be.instanceof(vError.NoExistOrNoAccessError);
      assertError(err, vError.Ids.NoExistOrNoAccess);
    });
  });
});
