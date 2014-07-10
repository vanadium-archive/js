/**
 * @fileoverview Tests for server apis like register and addIDL.
 */
'use strict';

var Server = require('../../../../src/ipc/server.js');

describe('Server validating', function() {
  var idl = {
    package: 'foo',
    Sample: {
      add: {
        numInArgs: 2,
        numOutArgs: 1,
        inputStreaming: false,
        outputStreaming: false
      }
    },
    Sample2: {
      subtract: {
        numInArgs: 2,
        numOutArgs: 1,
        inputStreaming: false,
        outputStreaming: false
      }
    }
  };
  it('Using IDL with no errors', function() {
    var server = new Server(null);
    server.addIDL(idl);
    var service = {
      add: function(a, b) {
        return a + b;
      }
    };
    var err = server._getAndValidateMetadata(service, 'foo.Sample');
    expect(err).to.be.null;
  });

  it('Using IDL with multiple services no errors', function() {
    var server = new Server(null);
    server.addIDL(idl);
    var service = {
      add: function(a, b) {
        return a + b;
      },
      subtract: function(a, b) {
        return a - b;
      }
    };

    var err = server._getAndValidateMetadata(service,
      ['foo.Sample', 'foo.Sample2']);
    expect(err).to.be.null;
  });


  it('Using IDL with no errors with injections', function() {
    var server = new Server(null);
    server.addIDL(idl);
    var service = {
      add: function(a, b, $context) {
        return a + b;
      }
    };
    var err = server._getAndValidateMetadata(service, 'foo.Sample');
    expect(err).to.be.null;
  });

  it('Using IDL with missing function', function() {
    var server = new Server(null);
    server.addIDL(idl);
    var service = {};

    var err = server._getAndValidateMetadata(service, 'foo.Sample');
    expect(err).not.to.be.null;
  });

  it('Using IDL with wrong number of args', function() {
    var server = new Server(null);
    server.addIDL(idl);
    var service = {
      add: function(a) {
        return a;
      }
    };

    var err = server._getAndValidateMetadata(service, 'foo.Sample');
    expect(err).not.to.be.null;
  });
});
