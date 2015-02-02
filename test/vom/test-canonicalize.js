/**
 * @fileoverview Tests for canonicalize.js
 */

var test = require('prova');

var BigInt = require('./../../src/vom/big-int.js');
var Complex = require('./../../src/vom/complex.js');
var Kind = require('./../../src/vom/kind.js');
var Registry = require('./../../src/vom/registry.js');
var Types = require('./../../src/vom/types.js');
var canonicalize = require('./../../src/vom/canonicalize.js');
var stringify = require('./../../src/vom/stringify.js');

// A helper function that shallow copies an object into an object with the
// JSValue prototype. It makes the test cases a lot more readable.
function JS(obj) {
  var JSValue = Registry.lookupOrCreateConstructor(Types.JSVALUE);
  var jsval = Object.create(JSValue.prototype);
  Object.keys(obj).forEach(function(key) {
    jsval[key] = obj[key];
  });
  return jsval;
}

// Test basic JSValue canonicalization. Pure JSValues are used.
// TODO(alexfandrianto): It would be good to test a JSValue inside another type.
// For example, []JSValue or a struct with JSValues.
test('canonicalize JSValue - basic functionality', function(t) {
  var tests = [
    {
      name: 'null',
      input: null,
      output: null,
      outputDeep: JS({
        'null': {}
      })
    },
    {
      name: 'number',
      input: 4,
      output: 4,
      outputDeep: JS({
        'number': {
          val: 4
        }
      })
    },
    {
      name: 'string',
      input: 'fadasa',
      output: 'fadasa',
      outputDeep: JS({
        'string': {
          val: 'fadasa'
        }
      })
    },
    {
      name: 'list',
      input: [3, false, null, 'abc', undefined],
      output: [3, false, null, 'abc', null],
      outputDeep: JS({
        'list': {
          val: [
            {
              val: JS({
                'number': { val: 3 }
              })
            },
            {
              val: JS({
                'boolean': { val: false }
              })
            },
            {
              val: JS({
                'null': {}
              })
            },
            {
              val: JS({
                'string': { val: 'abc' }
              })
            },
            {
              val: JS({
                'null': {}
              })
            }
          ]
        }
      })
    },
    {
      name: 'map',
      input: new Map([
        [345, '345'],
        [null, null]
      ]),
      output: new Map([
        [345, '345'],
        [null, null]
      ]),
      outputDeep: JS({
        'map': {
          val: [
            {
              key: {
                val: JS({ 'number': { val: 345 } })
              },
              value: {
                val: JS({ 'string': { val: '345' } })
              }
            },
            {
              key: {
                val: JS({ 'null': {} })
              },
              value: {
                val: JS({ 'null': {} })
              }
            }
          ]
        }
      })
    },
    {
      name: 'object',
      input: { name: '', servers: [], mT: false },
      output: { name: '', servers: [], mT: false },
      outputDeep: JS({
        'object': {
          val: [
            {
              key: {
                val: 'name'
              },
              value: {
                val: JS({ 'string': { val: '' } })
              }
            },
            {
              key: {
                val: 'servers'
              },
              value: {
                val: JS({ 'list': { val: [] } })
              }
            },
            {
              key: {
                val: 'mT'
              },
              value: {
                val: JS({ 'boolean': { val: false } })
              }
            }
          ]
        }
      })
    }
  ];

  for (var i = 0; i < tests.length; i++) {
    var name = tests[i].name;
    var input = tests[i].input;
    var expected = tests[i].output;
    var expectedDeep = tests[i].outputDeep;
    var type = Types.JSVALUE;

    // The input canonicalizes to the expected output.
    var output = canonicalize.reduce(input, type);
    t.deepEqual(output, expected, name);

    // Canonicalize is idempotent.
    var output2 = canonicalize.reduce(output, type);
    t.deepEqual(output2, output, name + ' - idempotent');

    // The deep wrapped output should also match the expected deep output.
    var outputDeep = canonicalize.fill(input, type);
    t.deepEqual(outputDeep, expectedDeep, name + ' - deep');

    // This is also idempotent.
    var outputDeep2 = canonicalize.fill(outputDeep, type);
    t.deepEqual(outputDeep2, outputDeep, name + ' - deep idempotent');

    // DeepWrap(output) === outputDeep
    var outputToDeep = canonicalize.fill(output, type);
    t.deepEqual(outputToDeep, outputDeep, ' - shallow to deep');

    // Unwrap(outputDeep) === output
    var outputDeepToShallow = canonicalize.reduce(outputDeep, type);
    t.deepEqual(outputDeepToShallow, output, ' - deep to shallow');


    // The type of the deep output must match. (Shallow lacks type.)
    var expectedTypeStr = stringify(type);
    var outputDeepTypeStr = stringify(outputDeep._type);
    t.equal(outputDeepTypeStr, expectedTypeStr,
      name + ' - top-level type match');
  }
  t.end();
});

test('canonicalize JSValue - mixed JSValue and non-JSValue functionality',
  function(t) {

  var tests = [
    {
      name: 'list w/ typed values',
      input: [3, false, null, 'abc', undefined, {
        val: 3.14,
        _type: Types.FLOAT32,   // pretend this is on the prototype
        _wrappedType: true      // pretend this is on the prototype
      }],
      output: [3, false, null, 'abc', null, {
        val: 3.14               // This 3.14 needs to have _type FLOAT32
      }],                       // TODO(alexfandrianto): This needs a test.
      outputDeep: JS({
        'list': {
          val: [
            {
              val: JS({
                'number': { val: 3 }
              })
            },
            {
              val: JS({
                'boolean': { val: false }
              })
            },
            {
              val: JS({
                'null': {}
              })
            },
            {
              val: JS({
                'string': { val: 'abc' }
              })
            },
            {
              val: JS({
                'null': {}
              })
            },
            {
              val: {             // any with wrapped float32
                val: 3.14
              }
            }
          ]
        }
      })
    },
  ];

  for (var i = 0; i < tests.length; i++) {
    var name = tests[i].name;
    var input = tests[i].input;
    var expected = tests[i].output;
    var expectedDeep = tests[i].outputDeep;
    var type = Types.JSVALUE;

    // The input canonicalizes to the expected output.
    var output = canonicalize.reduce(input, type);
    t.deepEqual(output, expected, name);

    // Canonicalize is idempotent.
    var output2 = canonicalize.reduce(output, type);
    t.deepEqual(output2, output, name + ' - idempotent');

    // The deep wrapped output should also match the expected deep output.
    var outputDeep = canonicalize.fill(input, type);
    t.deepEqual(outputDeep, expectedDeep, name + ' - deep');

    // This is also idempotent.
    var outputDeep2 = canonicalize.fill(outputDeep, type);
    t.deepEqual(outputDeep2, outputDeep, name + ' - deep idempotent');

    // DeepWrap(output) === outputDeep
    var outputToDeep = canonicalize.fill(output, type);
    t.deepEqual(outputToDeep, outputDeep, ' - shallow to deep');

    // Unwrap(outputDeep) === output
    var outputDeepToShallow = canonicalize.reduce(outputDeep, type);
    t.deepEqual(outputDeepToShallow, output, ' - deep to shallow');


    // The type of the deep output must match. (Shallow lacks type.)
    var expectedTypeStr = stringify(type);
    var outputDeepTypeStr = stringify(outputDeep._type);
    t.equal(outputDeepTypeStr, expectedTypeStr,
      name + ' - top-level type match');
  }
  t.end();
});

test('canonicalize struct - basic functionality', function(t) {
  var tests = [
    {
      name: 'empty object, no fields',
      inputObject: {},
      inputFields: [],
      outputObject: {},
      outputObjectDeep: {}
    },
    {
      name: 'object w/ private properties, no fields',
      inputObject: {_private: 'I persist!'},
      inputFields: [],
      outputObject: {_private: 'I persist!'},
      outputObjectDeep: {_private: 'I persist!'}
    },
    {
      name: 'normal object, no extra fields',
      inputObject: {
        a: 4,
        b: 'can',
        e: 'plan'
      },
      inputFields: [
        {
          name: 'A',
          type: Types.UINT32
        },
        {
          name: 'B',
          type: Types.STRING
        },
        {
          name: 'E',
          type: Types.ANY
        },
      ],
      outputObject: {
        a: 4,
        b: 'can',
        e: 'plan'       // JSValue in ANY has no wrapping in shallow mode.
      },
      outputObjectDeep: {
        a: { val: 4 },
        b: { val: 'can' },
        e: {            // any
          val: {        // INFERRED: JSValue(string).
            string: { val: 'plan' }
          }
        }
      }
    },
    {
      name: 'empty object, some fields',
      inputObject: {},
      inputFields: [
        {
          name: 'Man',
          type: Types.ANY
        },
        {
          name: 'Ban',
          type: Types.BOOL
        },
        {
          name: 'Dan',
          type: Types.COMPLEX64
        }
      ],
      outputObject: {
        man: null,
        ban: false,
        dan: new Complex(0, 0)
      },
      outputObjectDeep: {
        man: { val: null },
        ban: { val: false },
        dan: { val: new Complex(0, 0) }
      }
    },
    {
      name: 'simple zero values',
      inputObject: {},
      inputFields: [
        {
          name: 'Enum',
          type: {
            kind: Kind.ENUM,
            labels: ['Sunday', 'Monday', 'Tuesday']
          }
        },
        {
          name: 'Nilable',
          type: {
            kind: Kind.NILABLE,
            elem: Types.STRING
          }
        },
        {
          name: 'String',
          type: Types.STRING
        },
        {
          name: 'Array',
          type: {
            kind: Kind.ARRAY,
            elem: Types.BOOL,
            len: 3
          }
        },
        {
          name: 'List',
          type: {
            kind: Kind.LIST,
            elem: Types.BOOL
          }
        },
        {
          name: 'Set',
          type: {
            kind: Kind.SET,
            key: Types.UINT64
          }
        },
        {
          name: 'Map',
          type: {
            kind: Kind.MAP,
            key: Types.STRING,
            elem: Types.STRING
          }
        },
        {
          name: 'TypeObject',
          type: Types.TYPEOBJECT
        }
      ],
      outputObject: {
        'enum': 'Sunday',
        'nilable': null,
        'string': '',
        'array': [false, false, false],
        'list': [],
        'set': new Set(),
        'map': new Map(),
        'typeObject': Types.ANY
      },
      outputObjectDeep: {
        'enum': { val: 'Sunday' },
        'nilable': { val: null },
        'string': { val: '' },
        'array': {
          val: [
            { val: false },
            { val: false },
            { val: false }
          ]
        },
        'list': {
          val: []
        },
        'set': {
          val: new Set()
        },
        'map': {
          val: new Map()
        },
        'typeObject': Types.ANY
      }
    },
    {
      name: 'byte slice',
      inputObject: {},
      inputFields: [
        {
          name: 'ByteSlice',
          type: {
            kind: Kind.LIST,
            elem: Types.BYTE
          }
        }
      ],
      outputObject: {
        'byteSlice': new Uint8Array()
      },
      outputObjectDeep: {
        'byteSlice': {
          val: new Uint8Array()
        }
      }
    },
    {
      name: 'byte array',
      inputObject: {},
      inputFields: [
        {
          name: 'ByteArray',
          type: {
            kind: Kind.ARRAY,
            elem: Types.BYTE,
            len: 4
          }
        }
      ],
      outputObject: {
        'byteArray': new Uint8Array([0, 0, 0, 0])
      },
      outputObjectDeep: {
        'byteArray': {
          val: new Uint8Array([0, 0, 0, 0])
        }
      }
    },
    {
      name: 'recursive canonicalize - struct, oneof',
      inputObject: {},
      inputFields: [
        {
          name: 'Struct',
          type: {
            kind: Kind.STRUCT,
            fields: [
              {
                name: 'A',
                type: Types.BOOL
              },
              {
                name: 'B',
                type: Types.UINT64
              }
            ]
          }
        },
        {
          name: 'OneOf',
          type: {
            kind: Kind.ONEOF,
            fields: [
              {
                name: 'A',
                type: Types.BOOL
              },
              {
                name: 'B',
                type: Types.UINT64
              }
            ]
          }
        }
      ],
      outputObject: {
        'struct': {
          a: false,
          b: new BigInt(0, new Uint8Array())
        },
        'oneOf': {
          a: false
        }
      },
      outputObjectDeep: {
        'struct': {
          a: { val: false },
          b: { val: new BigInt(0, new Uint8Array()) }
        },
        'oneOf': {
          a: { val: false }
        }
      }
    }
  ];

  for (var i = 0; i < tests.length; i++) {
    // TODO(alexfandrianto): This test logic matches the OneOf test logic.
    // It would be nice to move to its own function.
    var name = tests[i].name;
    var input = tests[i].inputObject;
    var fields = tests[i].inputFields;
    var expected = tests[i].outputObject;
    var expectedDeep = tests[i].outputObjectDeep;
    var type = {
      kind: Kind.STRUCT,
      fields: fields
    };

    // The input object and its fields canonicalize to the expected output.
    var output = canonicalize.reduce(input, type);
    t.deepEqual(output, expected, name);

    // Canonicalize is idempotent.
    var output2 = canonicalize.reduce(output, type);
    t.deepEqual(output2, output, name + ' - idempotent');

    // The deep wrapped output should also match the expected deep output.
    var outputDeep = canonicalize.fill(input, type);
    t.deepEqual(outputDeep, expectedDeep, name + ' - deep');

    // This is also idempotent.
    var outputDeep2 = canonicalize.fill(outputDeep, type);
    t.deepEqual(outputDeep2, outputDeep, name + ' - deep idempotent');

    // DeepWrap(output) === outputDeep
    var outputToDeep = canonicalize.fill(output, type);
    t.deepEqual(outputToDeep, outputDeep, ' - shallow to deep');

    // Unwrap(outputDeep) === output
    var outputDeepToShallow = canonicalize.reduce(outputDeep, type);
    t.deepEqual(outputDeepToShallow, output, ' - deep to shallow');
  }
  t.end();
});

test('canonicalize oneOf - basic functionality', function(t) {
  var tests = [
    {
      name: 'filled oneOf A, some fields',
      inputObject: {
        a: 4
      },
      inputFields: [
        {
          name: 'A',
          type: Types.UINT32
        },
        {
          name: 'B',
          type: Types.STRING
        },
        {
          name: 'E',
          type: Types.ANY
        }
      ],
      outputObject: {
        a: 4
      },
      outputObjectDeep: {
        a: {
          val: 4
        }
      }
    },
    {
      name: 'filled oneOf E, some fields',
      inputObject: {
        e: [4, 'asdf']
      },
      inputFields: [
        {
          name: 'A',
          type: Types.UINT32
        },
        {
          name: 'B',
          type: Types.STRING
        },
        {
          name: 'E',
          type: Types.ANY
        }
      ],
      outputObject: {         // any with []JSValue
        e: [4, 'asdf']
      },
      outputObjectDeep: {
        e: {                  // any
          val: {              // INFERRED: JSValue(list)
            list: {
              val: [
                {
                  val: {      // any
                    number: { // JSValue(float64)
                      val: 4
                    }
                  }
                },
                {
                  val: {      // any
                    string: { // JSValue(string)
                      val: 'asdf'
                    }
                  }
                }
              ]
            }
          }
        }
      }
    },
    {
      name: 'filled oneOf with explicitly undefined fields',
      inputObject: {
        a: undefined,
        b: 'and',
        e: undefined
      },
      inputFields: [
        {
          name: 'A',
          type: Types.UINT32
        },
        {
          name: 'B',
          type: Types.STRING
        },
        {
          name: 'E',
          type: Types.ANY
        }
      ],
      outputObject: {
        b: 'and'
      },
      outputObjectDeep: {
        b: { val: 'and' }
      }
    },
    {
      name: 'oneOf with private properties',
      inputObject: {
        a: undefined,
        b: 'foo',
        _private1: 'I LIVE!',
        _private2: 'ME TOO!'
      },
      inputFields: [
        {
          name: 'A',
          type: Types.UINT32
        },
        {
          name: 'B',
          type: Types.STRING
        },
        {
          name: 'E',
          type: Types.ANY
        }
      ],
      outputObject: {
        b: 'foo',
        _private1: 'I LIVE!',
        _private2: 'ME TOO!'
      },
      outputObjectDeep: {
        b: { val: 'foo' },
        _private1: 'I LIVE!',
        _private2: 'ME TOO!'
      }
    }
  ];

  for (var i = 0; i < tests.length; i++) {
    var name = tests[i].name;
    var input = tests[i].inputObject;
    var fields = tests[i].inputFields;
    var expected = tests[i].outputObject;
    var expectedDeep = tests[i].outputObjectDeep;
    var type = {
      kind: Kind.ONEOF,
      fields: fields
    };

    // The input object and its fields canonicalize to the expected output.
    var output = canonicalize.reduce(input, type);
    t.deepEqual(output, expected, name);

    // Canonicalize is idempotent.
    var output2 = canonicalize.reduce(output, type);
    t.deepEqual(output2, output, name + ' - idempotent');

    // The deep wrapped output should also match the expected deep output.
    var outputDeep = canonicalize.fill(input, type);
    t.deepEqual(outputDeep, expectedDeep, name + ' - deep');

    // This is also idempotent.
    var outputDeep2 = canonicalize.fill(outputDeep, type);
    t.deepEqual(outputDeep2, outputDeep, name + ' - deep idempotent');

    // DeepWrap(output) === outputDeep
    var outputToDeep = canonicalize.fill(output, type);
    t.deepEqual(outputToDeep, outputDeep, ' - shallow to deep');

    // Unwrap(outputDeep) === output
    var outputDeepToShallow = canonicalize.reduce(outputDeep, type);
    t.deepEqual(outputDeepToShallow, output, ' - deep to shallow');
  }
  t.end();
});

// Ensures that valid types don't error out when canonicalizing.
test('canonicalize type - basic functionality', function(t) {
  var loopyList = {
    kind: Kind.LIST
  };
  loopyList.elem = loopyList;
  var expectedLoopyList = {
    name: '',
    kind: Kind.LIST
  };
  expectedLoopyList.elem = expectedLoopyList;

  var tests = [
    {
      name: 'undefined type => any',
      inputType: undefined,
      outputType: Types.ANY
    },
    {
      name: 'simple list',
      inputType: {
        kind: Kind.LIST,
        elem: Types.INT16
      },
      outputType: {
        name: '',
        kind: Kind.LIST,
        elem: Types.INT16
      }
    },
    {
      name: 'typeobject',
      inputType: {
        kind: Kind.TYPEOBJECT
      },
      outputType: Types.TYPEOBJECT
    },
    {
      name: 'loopyList',
      inputType: loopyList,
      outputType: expectedLoopyList
    }
  ];

  for (var i = 0; i < tests.length; i++) {
    var name = tests[i].name;
    var input = tests[i].inputType;
    var expected = tests[i].outputType;

    // The input object and its fields canonicalize to the expected output.
    // Since TypeObjects can be recursive, it's best to stringify them.
    var output = canonicalize.type(input);
    var outputStr = stringify(output);
    var expectedStr = stringify(expected);
    t.equal(outputStr, expectedStr, name);

    // Canonicalize Type is idempotent.
    var output2 = canonicalize.type(output);
    var output2Str = stringify(output2);
    t.equal(output2Str, expectedStr, name + ' - idempotent');

    // Post-canonicalization, the type is still a TypeObject.
    t.deepEqual(output._type, Types.TYPEOBJECT, name + ' - is TypeObject');
  }
  t.end();
});

// TODO(alexfandrianto): Add a general idempotency test since we always expect
// canonicalize and canonicalizeType to be idempotent when successful.


test('canonicalize deep to shallow - basic functionality', function(t) {
  var tests = [
    {
      name: 'top-level only',
      input: {
        val: 5,
        _wrappedType: true, // pretend that this is on the prototype
        _type: Types.INT16  // pretend that this is on the prototype
      },
      expected: {
        val: 5
      }
    },
    {
      name: 'map',
      input: {
        val: new Map([
          [
            {
              val: 3,
              _wrappedType: true, // pretend that this is on the prototype
              _type: Types.UINT32 // pretend that this is on the prototype
            },
            {
              val: 4,
              _wrappedType: true, // pretend that this is on the prototype
              _type: Types.UINT32 // pretend that this is on the prototype
            }
          ], [
            {
              val: 6,
              _wrappedType: true, // pretend that this is on the prototype
              _type: Types.UINT32 // pretend that this is on the prototype
            },
            {
              val: 3,
              _wrappedType: true, // pretend that this is on the prototype
              _type: Types.UINT32 // pretend that this is on the prototype
            }
          ]
        ]),
        _wrappedType: true, // pretend it is wrapped
        _type: {            // pretend it has a type
          kind: Kind.MAP,
          key: Types.INT32,
          elem: Types.INT32
        }
      },
      expected: {
        val: new Map([[3, 4], [6, 3]])
      }
    },
    {
      name: 'fake typeobject',
      input: {
        kind: {
          val: 3,
          _wrappedType: true, // pretend that this is on the prototype
          _type: Types.UINT32 // pretend that this is on the prototype
        },
        name: {
          val: 'Boolean',
          _wrappedType: true, // pretend that this is on the prototype
          _type: Types.STRING // pretend that this is on the prototype
        },
        _type: {              // pretend that this is on the prototype
          kind: Kind.STRUCT,
          fields: [
            {
              name: 'Kind',
              type: Types.UINT32
            },
            {
              name: 'Name',
              type: Types.STRING
            }
          ]
        }
      },
      expected: {
        kind: 3,
        name: 'Boolean'
      }
    },
    {
      name: 'oneof',
      input: {
        b: {
          val: 'abc',
          _wrappedType: true, // pretend that this is on the prototype
          _type: Types.STRING // pretend that this is on the prototype
        },
        _type: {              // pretend that this is on the prototype
          kind: Kind.ONEOF,
          fields: [
            {
              name: 'A',
              type: Types.UINT32
            },
            {
              name: 'B',
              type: Types.STRING
            }
          ]
        }
      },
      expected: {
        b: 'abc'
      }
    },
    {
      name: 'struct',
      input: {
        a: {
          val: 3,
          _wrappedType: true, // pretend that this is on the prototype
          _type: Types.UINT32 // pretend that this is on the prototype
        },
        b: {
          val: 'abc',
          _wrappedType: true, // pretend that this is on the prototype
          _type: Types.STRING // pretend that this is on the prototype
        },
        _type: {              // pretend that this is on the prototype
          kind: Kind.STRUCT,
          fields: [
            {
              name: 'A',
              type: Types.UINT32
            },
            {
              name: 'B',
              type: Types.STRING
            }
          ]
        }
      },
      expected: {
        a: 3,
        b: 'abc',
      }
    },
    {
      name: 'Struct with ANY',
      input: {
        any: {
          val: 'wrapped',
          _wrappedType: true, // pretend that this is on the prototype
          _type: Types.STRING // pretend that this is on the prototype
        },
        normal: {
          val: 'shallow',
          _wrappedType: true, // pretend that this is on the prototype
          _type: Types.STRING // pretend that this is on the prototype
        },
        _type: {              // pretend that this is on the prototype
          kind: Kind.STRUCT,
          fields: [
            {
              name: 'Any',
              type: Types.ANY
            },
            {
              name: 'Normal',
              type: Types.STRING
            }
          ]
        }
      },
      expected: {
        any: {
          val: 'wrapped'
        },
        normal: 'shallow'
      }
    }
  ];

  for (var i = 0; i < tests.length; i++) {
    testDeepWrapToUnwrap(t, tests[i]);
  }
  t.end();
});

// TODO(alexfandrianto): DeepWrapToUnwrap can be expanded to test more, just
// like the canonicalize struct and oneof tests. In fact, this tests basic
// canonicalization, since it includes more types than just struct/oneof.
// So the TODO is to convert this into a basic canonicalization test.
function testDeepWrapToUnwrap(t, test) {
  var name = test.name;
  var input = test.input;
  var expected = test.expected;

  // Canonicalize without wrapping deeply.
  var output = canonicalize.reduce(input, input._type);

  // Compare with stringify; the output/expected could be recursive.
  var expectedStr = stringify(expected);
  var outputStr = stringify(output);
  t.equal(outputStr, expectedStr, name);

  // The types must also match.
  var type = input._type;
  var expectedTypeStr = stringify(type);
  var outputTypeStr = stringify(output._type);
  t.equal(outputTypeStr, expectedTypeStr, name + ' - top-level type match');
}
