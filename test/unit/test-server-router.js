// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoveriew Tests server_router.js.
 */

var test = require('prova');
var Router = require('../../src/rpc/server-router');
var Server = require('../../src/rpc/server');
var Outgoing = require('../../src/proxy/message-type').Outgoing;
var vdl = require('../../src/vdl');
var hexVom = require('../../src/lib/hex-vom');
var context = require('../../src/context');
var leafDispatcher = require('../../src/rpc/leaf-dispatcher');

test('Server Router Signature Lookup', function(t) {
  var inputName = 'aName';
  var inputMessageId = 10;
  var inputService = {
    a: function(ctx, serverCall, x, $stream, y) {
      return x + y;
    }
  };
  var expectedSignature = [{
    name: '',
    pkgPath: '',
    doc: '',
    embeds: [],
    methods: [
      {
        name: 'A',
        doc: '',
        inArgs: [
          {
            name: 'x',
            doc: '',
            type: vdl.types.JSVALUE
          },
          {
            name: 'y',
            doc: '',
            type: vdl.types.JSVALUE
          }
        ],
        outArgs: [
          {
            name: '',
            doc: '',
            type: vdl.types.JSVALUE
          },
        ],
        inStream: {
          name: '',
          doc: '',
          type: vdl.types.JSVALUE
        },
        outStream: {
          name: '',
          doc: '',
          type: vdl.types.JSVALUE
        },
        tags: []
      }
    ]
  }];

  var responseData;
  var responseType;
  var responseMessageId;
  var mockProxy = {
    sendRequest: function(data, type, ignored, messageId) {
      responseData = data;
      responseType = type;
      responseMessageId = messageId;
    },
    addIncomingHandler: function(){},
    nextId: function() { return inputMessageId; }
  };
  var mockController = {
    newServer: function(){}
  };
  var mockRuntime = {
    newContext: function() {
      return new context.Context();
    }
  };
  var router = new Router(mockProxy, 'TestAppName',
                          mockRuntime, mockController);
  var server = new Server(router);
  var authorizer = function(){};
  var dispatcher = leafDispatcher(inputService, authorizer);
  server._init(inputName, dispatcher, null, function(){});

  var request = {
    serverId: server.id,
    suffix: inputName
  };
  router.handleLookupRequest(inputMessageId, request).then(function(result) {
    t.equals(responseType, Outgoing.LOOKUP_RESPONSE, 'response type');
    t.equals(responseMessageId, inputMessageId, 'message id');

    return hexVom.decode(responseData);
  }).then(function(reply) {
    t.ok(reply.hasOwnProperty('handle'), 'has a handle');
    t.equals(reply.hasAuthorizer, true, 'has authorizer');
    t.deepEquals(reply.signature, expectedSignature, 'signature');
    t.end();
  }).catch(t.end);
});
