var vom = require('vom');
module.exports = mock;

function mock(name) {
  var m;
  var writer;
  var encoder;

  switch (name) {
  case 'proxy':
    m = {
      cancelFromContext: function() {},
      nextId: function() { return 0; },
      sendRequest: function(data, type, handler, id) {
        var message = JSON.parse(data);

        if (message.isStreaming) {
          throw new Error('message.isStreaming should be false.');
        }

        writer = new vom.ByteArrayMessageWriter();
        encoder = new vom.Encoder(writer);
        encoder.encode({
          methodName: message.method,
          args: message.inArgs
        });
        handler.handleResponse(0, vom.Util.bytes2Hex(writer.getBytes()));
      },
      dequeue: function() {}
    };

    break;
  case 'client-signature':
    m = {
      tripleArgMethod: {
        inArgs: [ 'a', 'b', 'c' ],
        numOutArgs: 2
      },
      singleArgMethod: {
        inArgs: [ 'a' ],
        numOutArgs: 2
      }
    };
    break;
  default:
    throw new Error('No mock defined for "' + name + '"');
  }

  return m;
}
