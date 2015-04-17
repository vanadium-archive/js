// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');

var config = require('./default-config');
var defaultBlessingRegex = require('./default-blessing-regex');
var leafDispatcher = require('../../src/rpc/leaf-dispatcher');
var serve = require('./serve');
var vanadium = require('../../');

function assertBlessings(blessings, t) {
  t.ok(Array.isArray(blessings), 'blessings is an array');
  t.ok(blessings.length > 0, 'blessings has at least one blessing');
  t.ok(defaultBlessingRegex.test(blessings[0]),
      'blessings[0] matches the default blessing regex.');
}

var serverName = 'foo';
function newDispatcher() {
  return leafDispatcher({
    bar: function(ctx, serverCall) {}
  });
}

test('Test remote blessings with no method name ' +
    '- client.remoteBlessings(' + serverName + ', cb)', function(t) {
  serve(serverName, newDispatcher(), function(err, res) {
    if (err) {
      return t.end(err);
    }

    var client = res.runtime.newClient();
    var ctx = res.runtime.getContext();

    client.remoteBlessings(ctx, serverName, function(err, blessings) {
      if (err) {
        t.error(err);
        res.end(t);
      }

      assertBlessings(blessings, t);

      res.end(t);
    });
  });
});

test('Test remote blessings with known method ' +
    '- client.remoteBlessings(' + serverName + ', bar, cb)', function(t) {
  serve(serverName, newDispatcher(), function(err, res) {
    if (err) {
      return t.end(err);
    }

    var client = res.runtime.newClient();
    var ctx = res.runtime.getContext();

    client.remoteBlessings(ctx, serverName, 'bar', function(err, blessings) {
      if (err) {
        t.error(err);
        res.end(t);
      }

      assertBlessings(blessings, t);

      res.end(t);
    });
  });
});

test('Test remote blessings with unknown method ' +
    '- client.remoteBlessings(' + serverName + ', baz, cb)', function(t) {
  serve(serverName, newDispatcher(), function(err, res) {
    if (err) {
      return t.end(err);
    }

    var client = res.runtime.newClient();
    var ctx = res.runtime.getContext();

    client.remoteBlessings(ctx, serverName, 'baz', function(err, blessings) {
      if (err) {
        t.error(err);
        res.end(t);
      }

      assertBlessings(blessings, t);

      res.end(t);
    });
  });
});

test('Test remote blessings with non-existant server ' +
    '- client.remoteBlessings(unknown, cb)', function(t) {
  vanadium.init(config, function(err, rt) {
    if (err) {
      return t.end(err);
    }
    var client = rt.newClient();
    var ctx = rt.getContext();

    client.remoteBlessings(ctx, 'unknown', function(err, blessings) {
      t.ok(err, 'should error');
      rt.close(t.end);
    });
  });
});
