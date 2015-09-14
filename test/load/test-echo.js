// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var service = require('../integration/get-service');
var serve = require('../integration/serve');
var Stress = require('../vdl-out/v.io/x/js.core/stress').Stress;
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

function Echoer() {}

Echoer.prototype._serviceDescription = Stress.prototype._serviceDescription;

Echoer.prototype.echo = function(ctx, serverCall, bytes) {
  return Promise.resolve(bytes);
};

var echoer = new Echoer();

function alwaysAuth(ctx, call) {
  return Promise.resolve();
}

function dispatcher(suffix) {
  return {
    service: echoer,
    authorizer: alwaysAuth
  };
}

/*
 * The setup of this test is to have a JS server running under the name load
 * and then ask the Go stressd server to create a go client and run the
 * performance test against our server for DURATION milliseconds and return
 * the results
 */
test('load test echo server', function(assert) {
  var opts = {
    name: 'load',
    dispatcher: dispatcher,
    autoBind: false,
  };
  serve(opts, function(err, res) {
    assert.error(err);
    if (err) {
      res.end(assert);
    }
    // In order to run a performance test where we have a go client send
    // a bunch of tests to the server, we tell the stressd server to run
    // a peformance test against the server we just started.
    var client = res.runtime.getClient();
    var ctx = res.runtime.getContext();
    client.bindTo(ctx, '/localhost:8141').then(function(stub) {
      ctx = ctx.withTimeout(DURATION * 2);
      return stub.serverEcho(ctx, { seconds: DURATION / 1000 }, 'load');
    }).then(function(result) {
      result.iterations = result.iterations.toNativeNumberApprox();
      assert.ok(true, JSON.stringify(result));
      res.end(assert);
    }).catch(function(err) {
      res.end(assert, err);
    });
  });
});
