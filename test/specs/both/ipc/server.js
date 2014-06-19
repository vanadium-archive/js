/**
 * @fileoverview Tests for server apis like register and addIDL.
 */
'use strict';

var Server = require('../../../../src/ipc/server.js');

describe('Server registering', function() {
  var idl = {
      package: 'foo',
      Sample: {
        add: {
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
    var promise = server.register('adder', service, 'foo.Sample');
    return expect(promise).to.eventually.be.fulfilled;
  });

  it('Using IDL with no errors with injections', function() {
    var server = new Server(null);
    server.addIDL(idl);
    var service = {
      add: function(a, b, $context) {
        return a + b;
      }
    };
    var promise = server.register('adder', service, 'foo.Sample');
    return expect(promise).to.eventually.be.fulfilled;
  });

  it('Using IDL with missing function', function() {
    var server = new Server(null);
    server.addIDL(idl);
    var service = {};
    var promise = server.register('adder', service, 'foo.Sample');
    return expect(promise).to.eventually.be.rejected;
  });

  it('Using IDL with wrong number of args', function() {
    var server = new Server(null);
    server.addIDL(idl);
    var service = {
      add: function(a) {
        return a;
      }
    };
    var promise = server.register('adder', service, 'foo.Sample');
    return expect(promise).to.eventually.be.rejected;
  });
});
