// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var vanadium = require('../../');
var serve = require('./serve');

function dispatcher(suffix) {
  return {
    service: function(ctx, serverCall) {
      throw new Error('NotImplemented');
    },
    authorizer: function(ctx, call) {
      return null;
    }
  };
}

test('Test IsLeaf=True Server Option', function(t) {
  var serverOption = vanadium.rpc.serverOption({
    isLeaf: true
  });
  var name = 'testing/serverOption/isLeafTrue';

  var servObj = {
    name: name,
    dispatcher: dispatcher,
    serverOption: serverOption
  };

  serve(servObj, function(err, res) {
    t.error(err);

    var rt = res.runtime;
    var ns = rt.namespace();
    var stream = ns.glob(rt.getContext(), name).stream;
    stream.on('data', function(mp) {
      t.error(err);

      t.equal(mp.isLeaf, true, 'Glob must indicate server is a leaf');
      t.equal(mp.servesMountTable, false,
        'Glob must indicate server is not a mounttable');
      res.end(t);
    });
  });
});

test('Test IsLeaf=False Server Option', function(t) {
  var serverOption = vanadium.rpc.serverOption({
    isLeaf: false
  });
  var name = 'testing/serverOption/isLeafFalse';

  var servObj = {
    name: name,
    dispatcher: dispatcher,
    serverOption: serverOption
  };

  serve(servObj, function(err, res) {
    t.error(err);

    var rt = res.runtime;
    var ns = rt.namespace();
    var stream = ns.glob(rt.getContext(), name).stream;
    stream.on('data', function(mp) {
      t.error(err);

      t.equal(mp.isLeaf, false, 'Glob must indicate server is not a leaf');
      t.equal(mp.servesMountTable, false,
        'Glob must indicate server is not a mounttable');
      res.end(t);
    });
  });
});

test('Test ServesMountTable=True Server Option', function(t) {
  var serverOption = vanadium.rpc.serverOption({
    servesMountTable: true
  });
  var name = 'testing/serverOption/ServesMountTableTrue';

  var servObj = {
    name: name,
    dispatcher: dispatcher,
    serverOption: serverOption
  };

  serve(servObj, function(err, res) {
    t.error(err);

    var rt = res.runtime;
    var ns = rt.namespace();
    var stream = ns.glob(rt.getContext(), name).stream;
    stream.on('data', function(mp) {
      t.error(err);

      t.equal(mp.isLeaf, false, 'Glob must indicate server is not a leaf');
      t.equal(mp.servesMountTable, true,
        'Glob must indicate server is a mounttable');
      res.end(t);
    });
  });
});

test('Test ServesMountTable=false server option', function(t) {
  var serverOption = vanadium.rpc.serverOption({
    servesMountTable: false
  });
  var name = 'testing/serverOption/ServesMountTableFalse';

  var servObj = {
    name: name,
    dispatcher: dispatcher,
    serverOption: serverOption
  };

  serve(servObj, function(err, res) {
    t.error(err);

    var rt = res.runtime;
    var ns = rt.namespace();
    var stream = ns.glob(rt.getContext(), name).stream;
    stream.on('data', function(mp) {
      t.error(err);

      t.equal(mp.isLeaf, false, 'Glob must indicate server is not a leaf');
      t.equal(mp.servesMountTable, false,
        'Glob must indicate server is not a mounttable');
      res.end(t);
    });
  });
});

test('Test ServesMountTable=ture and IsLeaf=true server option',
  function(t) {
    var serverOption = vanadium.rpc.serverOption({
      servesMountTable: true,
      isLeaf: true
    });
    var name = 'testing/serverOption/Both';

    var servObj = {
      name: name,
      dispatcher: dispatcher,
      serverOption: serverOption
    };

    serve(servObj, function(err, res) {
      t.error(err);

      var rt = res.runtime;
      var ns = rt.namespace();
      var stream = ns.glob(rt.getContext(), name).stream;
      stream.on('data', function(mp) {
        t.error(err);

        t.equal(mp.isLeaf, true, 'Glob must indicate server is a leaf');
        t.equal(mp.servesMountTable, true,
          'Glob must indicate server is a mounttable');
        res.end(t);
      });
    });
  });