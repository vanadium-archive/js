/**
 * @fileoverview Tests for the MountTable client library.
 */
'use strict';

var MountTable = require('../../../../src/naming/mounttable');
var Promise = require('../../../../src/lib/promise');
var vError = require('../../../../src/lib/verror');

// Conveience method to build a proper resolveStep response.
function response(servers, suffix) {
  var entries = [];
  for (var i = 0; i < servers.length; i++) {
    entries.push({'server': servers[i]});
  }
  return [entries, suffix];
}

function MockMountTable(value) {
  this.value = value;
  this.resolveStep = function() {
    var isErr = this.value instanceof Error;
    if (isErr) {
      return Promise.reject(this.value);
    }
    return Promise.resolve(this.value);
  };
}

// Any name in the mountPoints dictionary supports resolve step and
// resolve step returns the associated value.  Any name
// not in this dictionary will bind to something without
// the resolveStep method, and will be considered a non-mounttable.
function MockClient(mountPoints) {
  this.mountPoints = mountPoints;
  this.bind = function(name) {
    var val = this.mountPoints[name];
    if (val) {
      return Promise.resolve(new MockMountTable(val));
    }
    return Promise.resolve({});
  };
}

var roots = ['/a', '/b/c'];

// Many behaviors are shared between different resolve methods.
function commonResolveTests(resolver) {
  it('Should resolve an intermediate point in a MountTable', function() {
    var mountTable = new MountTable(new MockClient({
      // There is a MountTable (/x,/y)  mounted at d on /a.
      '/a//d/e/f': response(['/x', '/y'], 'e/f'),
      // There isn't anything mounted yet at /x//e/f.
      '/x//e/f': MountTable.errNoSuchName()
    }), roots);
    var results = mountTable[resolver]('d/e/f');
    return expect(results).to.eventually.eql(['/x//e/f', '/y//e/f']);
  });
  it('Should resolve through mounttables to a non-mounttable', function() {
    var mountTable = new MountTable(new MockClient({
      '/a//d/f': response(['/x', '/y'], 'f'),
      // There is a server (/store) mounted at f on /x.
      '/x//f': response(['/store'], ''),
    }), roots);
    var results = mountTable[resolver]('d/f');
    return expect(results).to.eventually.eql(['/store']);
  });
  it('Should try alternates when one server fails', function() {
    var mountTable = new MountTable(new MockClient({
      // Force the resolve to try an alternate name when one is not working.
      '/a//d/g': new Error('Query of death'),
      '/b//c/d/g': response(['/fromb'], ''),
    }), roots);
    var results = mountTable[resolver]('d/g');
    return expect(results).to.eventually.eql(['/fromb']);
  });
  it('Should return the last error when all names fail', function() {
    var mountTable = new MountTable(new MockClient({
      // Set up a case where all the names fail.
      '/a//h/i': response(['/x', '/y'], 'i'),
      '/x//i': new vError.BadArgError('Bad Arg'),
      '/y//i': new vError.InternalError('Internal'),
    }), roots);
    var results = mountTable[resolver]('h/i');
    return expect(results).to.eventually.be.rejectedWith(vError.InternalError);
  });
  it('Should return an error when the max depth is reached', function() {
    var mountTable = new MountTable(new MockClient({
      // Set up a case where all the names fail.
      '/a//b': response(['/x'], 'b'),
      '/x//b': response(['/a'], 'b'),
    }), roots);
    var results = mountTable[resolver]('b');
    return expect(results).to.eventually.be.rejectedWith(vError.InternalError);
  });
}

describe('resolveMaximally', function() {
  it('Should resolve a mounted name', function() {
    var mountTable = new MountTable(new MockClient({
      // There is a server (/x,/y)  mounted at d on /a.
      '/a//d/e': response(['/x', '/y'], 'e'),
    }), roots);
    var results = mountTable.resolveMaximally('d/e');
    return expect(results).to.eventually.eql(['/x//e', '/y//e']);
  });
  commonResolveTests('resolveMaximally');
});


describe('resolveToMountTable', function() {
  it('Should resolve a mounted name to the parent MountTable', function() {
    var mountTable = new MountTable(new MockClient({
      // There is a server (/x,/y)  mounted at d on /a.
      '/a//d/e': response(['/x', '/y'], 'e'),
    }), roots);
    var results = mountTable.resolveToMountTable('d/e');
    return expect(results).to.eventually.eql(['/a//d/e', '/b//c/d/e']);
  });
  commonResolveTests('resolveToMountTable');
});
