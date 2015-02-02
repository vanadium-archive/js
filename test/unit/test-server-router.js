/**
 * @fileoveriew Tests server_router.js.
 */

var test = require('prova');
var Router = require('../../src/ipc/server-router');
var Server = require('../../src/ipc/server');
var MessageType = require('../../src/proxy/message-type');
var vom = require('../../src/vom/vom');
var DecodeUtil = require('../../src/lib/decode-util');
var context = require('../../src/runtime/context');

test('Server Router Signature Lookup', function(t) {
  var inputName = 'aName';
  var inputMessageId = 10;
  var inputService = {
    a: function(ctx, x, $stream, y) {
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
            type: vom.Types.JSVALUE
          },
          {
            name: 'y',
            doc: '',
            type: vom.Types.JSVALUE
          }
        ],
        outArgs: [
          {
            name: '',
            doc: '',
            type: vom.Types.JSVALUE
          },
        ],
        inStream: {
          name: '',
          doc: '',
          type: vom.Types.JSVALUE
        },
        outStream: {
          name: '',
          doc: '',
          type: vom.Types.JSVALUE
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

  var mockRuntime = {
    newContext: function() {
      return new context.Context();
    }
  };
  var router = new Router(mockProxy, 'TestAppName', mockRuntime);
  var server = new Server(router);
  var options = {
    authorizer: function(){}
  };
  server.serve(inputName, inputService, options, function(){});

  var request = {
    serverID: server.id,
    suffix: inputName
  };
  router.handleLookupRequest(inputMessageId, request).then(function(result) {
    t.equals(responseType, MessageType.LOOKUP_RESPONSE, 'response type');
    t.equals(responseMessageId, inputMessageId, 'message id');

    var data = JSON.parse(responseData);
    t.ok(data.hasOwnProperty('handle'), 'has a handle');
    t.equals(data.hasAuthorizer, true, 'has authorizer');
    var decodedSignature = DecodeUtil.decode(data.signature);
    t.deepEquals(decodedSignature, expectedSignature, 'signature');

    t.end();
  });
});
