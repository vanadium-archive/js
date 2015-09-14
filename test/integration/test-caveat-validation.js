// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var vanadium = require('../../');
var serve = require('./serve');
var leafDispatcher = require('../../src/rpc/leaf-dispatcher');
var testService = require('../vdl-out/v.io/x/js.core/test_service');
var vdl = vanadium.vdl;

// Service to be invoked
function AServiceDef() {
  this.aMethod = function(ctx, serverCall) {
    return 'aResult';
  };
}
AServiceDef.prototype = new testService.InvokableTestMethod();
var aService = new AServiceDef();


test('caveatValidation', function(t) {
  var invokerName = 'test_service/caveatedInvoker';
  var serveName = 'testing/example';

  // Expected data to be passed to the caveat validator.
  var expectedCaveatData = new testService.TestCaveatData({
      a: 'a',
      b: {
        val: 9,
        _wrappedType: true,
        _type: {
          name: 'NamedInt32',
          kind: vdl.kind.INT32
        }
    }
  });

  // caveatValidator will validate caveats iff nextCaveatValidationResult
  // is true
  var nextCaveatValidationResult = true;
  function caveatValidator(ctx, call, data) {
    t.deepEqual(data, expectedCaveatData, 'validator receives correct data');
    if (!nextCaveatValidationResult) {
      throw new Error('Intentionally failing caveat validation');
    }
  }

  // Serve a service providing aMethod().
  var dispatcher = leafDispatcher(aService);
  serve(serveName, dispatcher, function(err, res) {
    if (err) {
      res.end(t, 'error in serve: ' + err);
      return;
    }

    // Register the caveat validator.
    res.runtime.caveatRegistry.register(
      testService.ConditionallyValidatingTestCaveat,
      caveatValidator);

    // Bind to the go process that will invoke aMethod.
    var client = res.runtime.getClient();
    client.bindTo(res.runtime.getContext(), invokerName, function(err, stub) {
      if (err) {
        res.end(t, 'error in bindTo: ' + err);
        return;
      }

      // Tell the go service to invoke aMethod with a caveat that validates.
      stub.invoke(res.runtime.getContext(), serveName,
        testService.ConditionallyValidatingTestCaveat,
        expectedCaveatData,
        function(err) {
        if (err) {
          res.end(t, 'error in invoke: ' + err);
          return;
        }

        // Tell the go service to invoke aMethod with a caveat that fails
        // validation.
        nextCaveatValidationResult = false;
        stub.invoke(res.runtime.getContext(), serveName,
          testService.ConditionallyValidatingTestCaveat,
          expectedCaveatData,
          function(err) {
            if (err) {
              // Expected to fail due to validation.
              nextCaveatValidationResult = true; // reset
              res.end(t);
              return;
            }
            nextCaveatValidationResult = true; // reset*/
            res.end(t, 'expected validation error in invoke');
        });
      });
    });
  });
});
