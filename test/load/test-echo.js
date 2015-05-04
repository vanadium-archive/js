// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var service = require('../integration/get-service');
var test = require('prova');

test.timeout(60 * 5 * 1000);

var PAYLOAD_SIZE = 1000;
var DURATION = 1 * 60 * 1000;
test('load test echo', function(assert) {
  service('/localhost:8141', function(err, ctx, echoer, end, rt) {
    assert.error(err);
    var payload = new Uint8Array(PAYLOAD_SIZE);
    for (var i = 0; i < PAYLOAD_SIZE; i++) {
      payload[i] = i && 0xff;
    }
    var iterations = 0;
    var start = Date.now();
    callEcho();
    function callEcho() {
      iterations++;
      if ((iterations % 500) === 0) {
        assert.ok(true, 'done with ' + iterations);
      }
      if ((Date.now() - start) > DURATION) {
        return finish();
      }
      echoer.echo(ctx, payload).then(callEcho).catch(finish);
    }

    function finish(err) {
      assert.error(err);
      var duration = (Date.now() - start) / 1000;
      var data = {
        qps: iterations/duration,
        iterations: iterations,
      };
      data.msecsPerRPC = 1000/data.qps;
      assert.ok(true, JSON.stringify(data));
      end(assert);
    }
  });
});
