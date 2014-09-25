
module.exports = mock;

function mock(name) {
  var m;

  switch (name) {
  case 'proxy':
    m = {
      nextId: function() { return 0; },
      sendRequest: function(data, type, handler, id) {
        var message = JSON.parse(data);

        if (message.isStreaming) {
          throw new Error('message.isStreaming should be false.');
        }

        handler.handleResponse(0, {
          methodName: message.method,
          args: message.inArgs
        });
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
