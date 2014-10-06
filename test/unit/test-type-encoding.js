/**
 * @fileoverview Tests for TypeEncoder and TypeDecoder.
 */

var test = require('prova');

var stringify = require('./../../src/vom/stringify.js');
var Types = require('./../../src/vom/types.js');
var Kind = require('./../../src/vom/kind.js');

var TypeEncoder = require('./../../src/vom/type_encoder.js');
var TypeDecoder = require('./../../src/vom/type_decoder.js');

var ByteArrayMessageWriter = require(
    './../../src/vom/byte_array_message_writer.js');
var RawVomReader = require('./../../src/vom/raw_vom_reader.js');

/**
 * Type message reader reads type messages from the provided data.
 * @param {Uint8Array} bytes The input data.
 * @constructor
 */
function TypeMessageReader(bytes) {
  this.rawReader = new RawVomReader(bytes);
  var header = this.rawReader._readRawBytes(1);
  if (header[0] !== 0x80) {
    throw new Error('Improperly formatted bytes. Must start with 0x80');
  }
}

/**
 * Read the next type message.
 */
TypeMessageReader.prototype.nextMessage = function(typeDecoder) {
  var typeId;
  try {
    typeId = this.rawReader.readInt();
  } catch (error) {
    // Hopefully EOF.
    // TODO(bprosnitz) Make this a more accurate check.
    return null;
  }
  if (typeId < 0) {
    var len = this.rawReader.readUint();
    var body = this.rawReader._readRawBytes(len);
    return {
      typeId: -typeId,
      messageBytes: body
    };
  }
  throw new Error('Value messages not implemented.');
};

test('encode and decode', function(t) {
  var UPPER_LOOP_LIMIT = 100;

  var recursiveType = {
    kind: Kind.LIST,
    name: 'recList'
  };
  recursiveType.elem = recursiveType;

  var secondLevelRecursiveTypeA = {
    kind: Kind.SET,
    name: 'recSet'
  };
  var secondLevelRecursiveTypeB = {
    kind: Kind.ARRAY,
    len: 4
  };
  secondLevelRecursiveTypeB.elem = secondLevelRecursiveTypeA;
  secondLevelRecursiveTypeA.key = secondLevelRecursiveTypeB;

  var tests = [
    Types.ANY,
    Types.BOOL,
    Types.BYTE,
    Types.UINT16,
    Types.UINT32,
    Types.UINT64,
    Types.INT16,
    Types.INT32,
    Types.INT64,
    Types.FLOAT32,
    Types.FLOAT64,
    Types.COMPLEX64,
    Types.COMPLEX128,
    Types.STRING,
    Types.TYPEVAL,
    {
      kind: Kind.BOOL,
      name: 'Boolean'
    },
    {
      kind: Kind.ENUM,
      name: 'EnumName',
      labels: ['labelOne', 'labelTwo']
    },
    {
      kind: Kind.ARRAY,
      elem: {
        kind: Kind.STRING,
        name: 'namedString'
      },
      len: 10
    },
    {
      kind: Kind.LIST,
      elem: {
        kind: Kind.UINT16,
        name: 'namedUint16'
      }
    },
    {
      kind: Kind.SET,
      name: 'setName',
      key: {
        kind: Kind.UINT32,
        name: 'namedUint32'
      }
    },
    {
      kind: Kind.MAP,
      key: {
        kind: Kind.INT16,
        name: 'namedInt16'
      },
      elem: {
        kind: Kind.INT32,
        name: 'namedInt32'
      }
    },
    {
      kind: Kind.STRUCT,
      name: 'structName',
      fields: [
        {
          name: 'firstField',
          type: Types.STRING
        },
        {
          name: 'secondField',
          type: {
            kind: Kind.LIST,
            elem: Types.INT16
          }
        }
      ]
    },
    {
      kind: Kind.ONEOF,
      name: 'oneOfName',
      types: [
        Types.INT16,
        {
          kind: Kind.SET,
          key: Types.BOOL
        }
      ]
    },
    {
      kind: Kind.NILABLE,
      elem: Types.UINT64
    },
    recursiveType,
    secondLevelRecursiveTypeA,
    secondLevelRecursiveTypeB
  ];

  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];

    var writer = new ByteArrayMessageWriter();
    var typeEncoder = new TypeEncoder();
    var id = typeEncoder.encodeType(writer, test);

    var typeDecoder = new TypeDecoder();
    var reader = new TypeMessageReader(writer.getBytes());
    for (var j = 0; j < UPPER_LOOP_LIMIT; j++) {
      var message = reader.nextMessage();
      if (message === null) {
        break;
      }
      typeDecoder.defineType(message.typeId, message.messageBytes);
    }
    if (j === UPPER_LOOP_LIMIT) {
      t.fail('read too many messages');
      break;
    }

    var resultType = typeDecoder.lookupType(id);
    var resultStr = stringify(resultType);
    var expectedStr = stringify(test);
    t.equals(resultStr, expectedStr);
  }
  t.end();
});
