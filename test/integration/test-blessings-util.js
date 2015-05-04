// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var vanadium = require('../../');
var config = require('./default-config');
var security = require('../../src/security');

test('Test union of blessings (promise case)', function(t) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    runtime.principal.blessSelf(runtime.getContext(), 'blessedname1')
    .then(function(blessings1) {
      return runtime.principal.blessSelf(runtime.getContext(), 'blessedname2')
      .then(function(blessings2) {
        return security.unionOfBlessings(
          runtime.getContext(), blessings1, blessings2);
      });
    })
    .then(function(unionedBlessings) {
      return unionedBlessings._debugString(runtime.getContext());
    })
    .then(function(debugStr) {
      t.ok(debugStr.indexOf('blessedname1') >= 0, 'first blessing in union');
      t.ok(debugStr.indexOf('blessedname2') >= 0, 'second blessing in union');
      runtime.close(t.end);
    }).catch(function(err) {
      runtime.close();
      t.end(err);
    });
  });
});

test('Test union of blessings (callback case)', function(t) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    runtime.principal.blessSelf(runtime.getContext(), 'blessedname1',
      function(err, blessings1) {
      if (err) {
        t.error(err);
        runtime.close(t.end);
        return;
      }
      runtime.principal.blessSelf(runtime.getContext(), 'blessedname2',
        function(err, blessings2) {
        if (err) {
          t.error(err);
          runtime.close(t.end);
          return;
        }
        security.unionOfBlessings(runtime.getContext(), blessings1,
          blessings2, function(err, unionedBlessings) {
          if (err) {
            t.error(err);
            runtime.close(t.end);
            return;
          }
          unionedBlessings._debugString(runtime.getContext())
          .then(function(debugStr) {
            t.ok(debugStr.indexOf('blessedname1') >= 0,
              'first blessing in union');
            t.ok(debugStr.indexOf('blessedname2') >= 0,
              'second blessing in union');
            runtime.close(t.end);
          }).catch(function(err) {
            t.error(err);
            runtime.close(t.end);
          });
        });
      });
    });
  });
});
