/**
 * @fileoverview Tests for server apis like register and addIDL.
 */
'use strict';

var Server = require('../../../../src/ipc/server.js');

describe('Server registering', function() {
  it('Using IDL with no errors', function() {
    var idl = 'package foo\n' +
      'type Sample interface {\n' +
      '  Add(a int, b int) (int, error)\n' +
      '}\n';
    var server = new Server(null);
    server.addIDL(idl);
    var service = {
      add: function(a, b) {
        return a + b;
      }
    };
    var promise = server.register('adder', service, 'Sample');
    return expect(promise).to.eventually.be.fulfilled;
  });

  it('Using IDL with no errors with injections', function() {
    var idl = 'package foo\n' +
      'type Sample interface {\n' +
      '  Add(a int, b int) (int, error)\n' +
      '}\n';
    var server = new Server(null);
    server.addIDL(idl);
    var service = {
      add: function(a, b, $context) {
        return a + b;
      }
    };
    var promise = server.register('adder', service, 'Sample');
    return expect(promise).to.eventually.be.fulfilled;
  });

  it('Using IDL with missing function', function() {
    var idl = 'package foo\n' +
      'type Sample interface {\n' +
      '  Add(a int, b int) (int, error)\n' +
      '}\n';
    var server = new Server(null);
    server.addIDL(idl);
    var service = {};
    var promise = server.register('adder', service, 'Sample');
    return expect(promise).to.eventually.be.rejected;
  });

  it('Using IDL with wrong number of args', function() {
    var idl = 'package foo\n' +
      'type Sample interface {\n' +
      '  Add(a int, b int) (int, error)\n' +
      '}\n';
    var server = new Server(null);
    server.addIDL(idl);
    var service = {
      add: function(a) {
        return a;
      }
    };
    var promise = server.register('adder', service, 'Sample');
    return expect(promise).to.eventually.be.rejected;
  });
});
