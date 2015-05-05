// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var vanadium = require('../../');
var config = require('./default-config');
var verror = vanadium.verror;

function end(t, rt, err) {
  t.error(err);
  rt.close(t.end);
}

test('Test passing valid options to client.callOption()', function(t) {
  vanadium.init(config, function(err, rt) {
    if (err) {
      return t.end(err);
    }

    var client = rt.newClient();

    var opts = client.callOption({ });
    t.ok(opts, 'with no options should succeed');

    opts = client.callOption({
      allowedServersPolicy: ['foo']
    });
    t.ok(opts, 'with allowedOptions should succeed');

    end(t, rt);
  });
});

test('Test passing invalid options to client.callOption()', function(t) {
  vanadium.init(config, function(err, rt) {
    if (err) {
      return t.end(err);
    }

    var client = rt.newClient();

    t.throws(function() {
      client.callOption({
        invalid: 'key'
      });
    },
    verror.BadArgError,
    ' with one invalid option should throw BadArgError');

    t.throws(function() {
      client.callOption({
        allowedServersPolicy: ['foo'],
        'invalid': 'key'
      });
    },
    verror.BadArgError,
    'with one valid and one invalid option should throw BadArgError');

    end(t, rt);
  });
});

test('Test passing allowedServersPolicy that matches server blessings',
  function(t) {
  vanadium.init(config, function(err, rt) {
    if (err) {
      return t.end(err);
    }

    var ctx = rt.getContext();
    var client = rt.newClient();

    client.bindTo(ctx, 'test_service/cache', function(err, cache) {
      if (err) {
        return end(t, rt, err);
      }

      var callOpt = client.callOption({
        allowedServersPolicy: ['test']
      });

      cache.set(ctx, 'foo', 'bar', callOpt, function(err) {
        end(t, rt, err);
      });
    });
  });
});

test('Test passing allowedServersPolicy that does not match server blessings',
  function(t) {
  vanadium.init(config, function(err, rt) {
    if (err) {
      return t.end(err);
    }

    var ctx = rt.getContext();
    var client = rt.newClient();

    client.bindTo(ctx, 'test_service/cache', function(err, cache) {
      if (err) {
        return end(t, rt, err);
      }

      var callOpt = client.callOption({
        allowedServersPolicy: ['bad/blessings']
      });

      cache.set(ctx, 'foo', 'bar', callOpt, function(err) {
        t.ok(err, 'should error');
        end(t, rt);
      });
    });
  });
});
