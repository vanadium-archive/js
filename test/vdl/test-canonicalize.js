/**
 * @fileoverview Tests for canonicalize.js
 */

var test = require('prova');

var BigInt = require('./../../src/vdl/big-int.js');
var Complex = require('./../../src/vdl/complex.js');
var Kind = require('./../../src/vdl/kind.js');
var Registry = require('./../../src/vdl/registry.js');
var Type = require('./../../src/vdl/type.js');
var Types = require('./../../src/vdl/types.js');
var canonicalize = require('./../../src/vdl/canonicalize.js');
var stringify = require('./../../src/vdl/stringify.js');

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

  var Float32 = Registry.lookupOrCreateConstructor(Types.FLOAT32);

  var tests = [
    {
      name: 'list w/ typed values',
      input: [3, false, null, 'abc', undefined, new Float32(3.14)],
      output: [3, false, null, 'abc', null, new Float32(3.14)],
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
              val: new Float32(3.14)// any with wrapped float32
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
  var OptStringType = new Type({
    kind: Kind.OPTIONAL,
    elem: Types.STRING
  });
  var OptStr = Registry.lookupOrCreateConstructor(OptStringType);
  var AnyListType = new Type({
    kind: Kind.LIST,
    elem: Types.ANY
  });
  var BoolListType = new Type({
    kind: Kind.LIST,
    elem: Types.BOOL
  });

  var ComplicatedStringStructType = new Type({
    kind: Kind.STRUCT,
    fields: [
      {
        name: 'JSValueString',
        type: Types.ANY
      },
      {
        name: 'WrappedString',
        type: Types.STRING
      },
      {
        name: 'NativeString',
        type: Types.STRING
      },
      {
        name: 'AnyString',
        type: Types.ANY
      },
      {
        name: 'NullOptionalAny',
        type: OptStringType
      },
      {
        name: 'OptionalToString',
        type: OptStringType
      },
      {
        name: 'UndefinedToZeroString',
        type: Types.STRING
      },
      {
        name: 'UndefinedToZeroStringAny',
        type: Types.STRING
      }
    ]
  });
  var ComplicatedBoolAnyListType = new Type({
    kind: Kind.STRUCT,
    fields: [
      {
        name: 'BoolToAny',
        type: BoolListType
      },
      {
        name: 'BoolToBool',
        type: BoolListType
      },
      {
        name: 'AnyToBool',
        type: AnyListType
      },
      {
        name: 'AnyToAny',
        type: AnyListType
      }
    ]
  });

  var Bool = Registry.lookupOrCreateConstructor(Types.BOOL);
  var Str = Registry.lookupOrCreateConstructor(Types.STRING);
  var ComplicatedStringStruct = Registry.lookupOrCreateConstructor(
    ComplicatedStringStructType);
  var ComplicatedBoolAnyList = Registry.lookupOrCreateConstructor(
    ComplicatedBoolAnyListType);

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
      name: 'struct with internal string/any',
      inputObject: new ComplicatedStringStruct({
        jSValueString: 'go as JSValue',
        wrappedString: new Str('overly wrapped input'),
        nativeString: 'true string',
        anyString: new Str('string any'),
        nullOptionalAny: null,
        optionalToString: new OptStr('non-empty string'),
        undefinedToZeroString: undefined,
        undefinedToZeroStringAny: undefined
      }),
      inputFields: [
        {
          name: 'JSValueString',
          type: Types.ANY
        },
        {
          name: 'WrappedString',
          type: Types.ANY
        },
        {
          name: 'NativeString',
          type: Types.ANY
        },
        {
          name: 'AnyString',
          type: Types.STRING
        },
        {
          name: 'NullOptionalAny',
          type: Types.ANY
        },
        {
          name: 'OptionalToString',
          type: Types.STRING
        },
        {
          name: 'UndefinedToZeroString',
          type: Types.STRING
        },
        {
          name: 'UndefinedToZeroStringAny',
          type: Types.ANY
        }
      ],
      outputObject: {
        jSValueString: 'go as JSValue',
        wrappedString: new Str('overly wrapped input'),
        nativeString: new Str('true string'),
        anyString: 'string any',
        nullOptionalAny: {
          val: null
        },
        optionalToString: 'non-empty string',
        undefinedToZeroString: '',
        undefinedToZeroStringAny: new Str('')
      },
      outputObjectDeep: {
        jSValueString: {
          val: {
            string: {
              val: 'go as JSValue'
            }
          }
        },
        wrappedString: {
          val: new Str('overly wrapped input')
        },
        nativeString: {
          val: new Str('true string')
        },
        anyString: new Str('string any'),
        nullOptionalAny: {
          val: {
            val: null
          }
        },
        optionalToString: new Str('non-empty string'),
        undefinedToZeroString: new Str(''),
        undefinedToZeroStringAny: {
          val: new Str('')
        }
      }
    },
    {
      name: 'struct with internal []any and []bool',
      inputObject: new ComplicatedBoolAnyList({
        boolToAny: [true, false, true],
        boolToBool: [false, false],
        anyToBool: [new Bool(true), new Bool(true), new Bool(false)],
        anyToAny: [new Bool(true)]
      }),
      inputFields: [
        {
          name: 'BoolToAny',
          type: AnyListType
        },
        {
          name: 'BoolToBool',
          type: BoolListType
        },
        {
          name: 'AnyToBool',
          type: BoolListType
        },
        {
          name: 'AnyToAny',
          type: AnyListType
        },
      ],
      outputObject: {
        boolToAny: [new Bool(true), new Bool(false), new Bool(true)],
        boolToBool: [false, false],
        anyToBool: [true, true, false],
        anyToAny: [new Bool(true)]
      },
      outputObjectDeep: {
        boolToAny: {
          val: [
            { val: new Bool(true) },
            { val: new Bool(false) },
            { val: new Bool(true) }
          ]
        },
        boolToBool: {
          val: [new Bool(false), new Bool(false)]
        },
        anyToBool: {
          val: [new Bool(true), new Bool(true), new Bool(false)]
        },
        anyToAny: {
          val: [{ val: new Bool(true) }]
        },
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
          name: 'Optional',
          type: {
            kind: Kind.OPTIONAL,
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
        'optional': null,
        'string': '',
        'array': [false, false, false],
        'list': [],
        'set': new Set(),
        'map': new Map(),
        'typeObject': Types.ANY
      },
      outputObjectDeep: {
        'enum': { val: 'Sunday' },
        'optional': { val: null },
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
      name: 'recursive canonicalize - struct, union',
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
          name: 'Union',
          type: {
            kind: Kind.UNION,
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
        'union': {
          a: false
        }
      },
      outputObjectDeep: {
        'struct': {
          a: { val: false },
          b: { val: new BigInt(0, new Uint8Array()) }
        },
        'union': {
          a: { val: false }
        }
      }
    }
  ];

  for (var i = 0; i < tests.length; i++) {
    // TODO(alexfandrianto): This test logic matches the Union test logic.
    // It would be nice to move to its own function.
    var name = tests[i].name;
    var input = tests[i].inputObject;
    var fields = tests[i].inputFields;
    var expected = tests[i].outputObject;
    var expectedDeep = tests[i].outputObjectDeep;
    var type = new Type({
      kind: Kind.STRUCT,
      fields: fields
    });

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

test('canonicalize union - basic functionality', function(t) {
  var tests = [
    {
      name: 'filled union A, some fields',
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
      name: 'filled union E, some fields',
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
      name: 'filled union with explicitly undefined fields',
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
      name: 'union with private properties',
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
    var type = new Type({
      kind: Kind.UNION,
      fields: fields
    });

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


// TODO(alexfandrianto): Perhaps this test is not necessary anymore; we have
// other coverage, and it seems like it's just checking that deep wrap converts
// to shallow wrap.
test('canonicalize deep to shallow - basic functionality', function(t) {
  var Int16 = Registry.lookupOrCreateConstructor(Types.INT16);
  var Int64 = Registry.lookupOrCreateConstructor(Types.INT64);
  var Uint32 = Registry.lookupOrCreateConstructor(Types.UINT32);
  var Complex64 = Registry.lookupOrCreateConstructor(Types.COMPLEX64);
  var Str = Registry.lookupOrCreateConstructor(Types.STRING);
  var Uint32Uint32Map = Registry.lookupOrCreateConstructor({
    kind: Kind.MAP,
    name: '',
    key: Types.INT32,
    elem: Types.INT32
  });
  var KindNameStruct = Registry.lookupOrCreateConstructor({
    kind: Kind.STRUCT,
    name: '',
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
  });
  var ABUnion = Registry.lookupOrCreateConstructor({
    kind: Kind.UNION,
    name: '',
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
  });
  var ABStruct = Registry.lookupOrCreateConstructor({
    kind: Kind.STRUCT,
    name: '',
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
  });
  var AnyStrStruct = Registry.lookupOrCreateConstructor({
    kind: Kind.STRUCT,
    name: '',
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
  });

  var tests = [
    {
      name: 'top-level only',
      input: new Int16(5, true),
      expected: new Int16(5)
    },
    {
      name: 'wrapped big int',
      input: new Int64(new BigInt(1, new Uint8Array([0x10, 0xff])), true),
      expected: new Int64(new BigInt(1, new Uint8Array([0x10, 0xff])))
    },
    {
      name: 'wrapped complex',
      input: new Complex64(new Complex(4, 5), true),
      expected: new Complex64(new Complex(4, 5))
    },
    {
      name: 'map',
      input: new Uint32Uint32Map(new Map([[3, 4], [6, 3]]), true),
      expected: new Uint32Uint32Map(new Map([[3, 4], [6, 3]]))
    },
    {
      name: 'fake typeobject',
      input: new KindNameStruct({
        kind: new Uint32(3, true),
        name: new Str('Boolean', true)
      }, true),
      expected: {
        kind: 3,
        name: 'Boolean'
      }
    },
    {
      name: 'union',
      input: new ABUnion({
        b: new Str('abc', true),
      }, true),
      expected: {
        b: 'abc'
      }
    },
    {
      name: 'struct',
      input: new ABStruct({
        a: new Uint32(3, true),
        b: new Str('abc', true)
      }, true),
      expected: {
        a: 3,
        b: 'abc',
      }
    },
    {
      name: 'Struct with ANY',
      input: new AnyStrStruct({
        any: new Str('wrapped', true),
        normal: new Str('shallow', true)
      }, true),
      expected: {
        any: new Str('wrapped'),
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
// like the canonicalize struct and union tests. In fact, this tests basic
// canonicalization, since it includes more types than just struct/union.
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


// This test checks the successful cases of value to type conversion.
// For example, some structs can convert to maps, and non-null optionals convert
// to their base type.
// This test supplements the cross-language conversion tests cases in
// test-vom-compatible.js
test('canonicalize conversion - success', function(t) {
  var AnyListType = new Type({
    kind: Kind.LIST,
    elem: Types.ANY
  });
  var OptStringType = new Type({
    kind: Kind.OPTIONAL,
    elem: Types.STRING
  });
  var StringListType = new Type({
    kind: Kind.LIST,
    elem: Types.STRING
  });
  var IntSetType = new Type({
    kind: Kind.SET,
    key: Types.INT16
  });
  var FloatBoolMapType = new Type({
    kind: Kind.MAP,
    key: Types.FLOAT32,
    elem: Types.BOOL
  });
  var Byte10ArrayType = new Type({
    kind: Kind.ARRAY,
    elem: Types.BYTE,
    len: 10
  });
  var StructABCType = new Type({
    kind: Kind.STRUCT,
    fields: [
      {
        name: 'A',
        type: Types.BOOL
      },
      {
        name: 'B',
        type: Types.STRING
      },
      {
        name: 'C',
        type: Types.UINT32
      }
    ]
  });
  var StructCDBType = new Type({
    kind: Kind.STRUCT,
    fields: [
      {
        name: 'C',
        type: Types.UINT32
      },
      {
        name: 'D',
        type: OptStringType
      },
      {
        name: 'B',
        type: Types.STRING
      }
    ]
  });

  var Any = Registry.lookupOrCreateConstructor(Types.ANY);
  var AnyList = Registry.lookupOrCreateConstructor(AnyListType);
  var Str = Registry.lookupOrCreateConstructor(Types.STRING);
  var StrList = Registry.lookupOrCreateConstructor(StringListType);
  var OptStr = Registry.lookupOrCreateConstructor(OptStringType);
  var IntSet = Registry.lookupOrCreateConstructor(IntSetType);
  var FloatBoolMap = Registry.lookupOrCreateConstructor(FloatBoolMapType);
  var Byte10Array = Registry.lookupOrCreateConstructor(Byte10ArrayType);
  var StructABC = Registry.lookupOrCreateConstructor(StructABCType);
  var StructCDB = Registry.lookupOrCreateConstructor(StructCDBType);

  var tests = [
    {
      name: 'Any(String) to String',
      inValue: new Any(new Str('fff')),
      outValue: new Str('fff'),
      targetType: Types.STRING
    },
    {
      name: 'String to Any(String)',
      inValue: new Str('fff'),
      outValue: new Any(new Str('fff')),
      targetType: Types.ANY
    },
    {
      name: '[]Any to []String',
      // Note: 'jsval' is a JSValue that happens to convert to a string.
      // This cannot always be expected to work, however.
      inValue: new AnyList([new Str('fff'), 'jsval']),
      outValue: new StrList(['fff', 'jsval']),
      targetType: StringListType
    },
    {
      name: '[]string to []any',
      inValue: new StrList(['fff', 'not jsval']),
      outValue: new AnyList([new Str('fff'), new Str('not jsval')]),
      targetType: AnyListType
    },
    {
      name: 'OptString to String',
      inValue: new OptStr('abc'),
      outValue: new Str('abc'),
      targetType: Types.STRING
    },
    {
      name: 'String to ByteArray',
      inValue: '1234567',
      outValue: new Byte10Array(
        new Uint8Array([49, 50, 51, 52, 53, 54, 55, 0, 0, 0])
      ),
      targetType: Byte10ArrayType
    },
    {
      name: 'Set to Map',
      inValue: new IntSet(new Set([4, -5, 8])),
      outValue: new FloatBoolMap(new Map([[4, true], [-5, true], [8, true]])),
      targetType: FloatBoolMapType
    },
    {
      name: 'Map to Set',
      inValue: new FloatBoolMap(new Map([[4, false], [-5, true], [8, true]])),
      outValue: new IntSet(new Set([-5, 8])),
      targetType: IntSetType
    },
    {
      name: 'StructABC to StructCDB',
      inValue: new StructABC({
        a: true,
        b: 'boom',
        c: 5
      }),
      outValue: new StructCDB({
        b: 'boom',
        c: 5,
        d: undefined
      }),
      targetType: StructCDBType
    },
    {
      name: 'StructCDB to StructABC',
      inValue: new StructCDB({
        d: null,
        b: 'doom',
        c: 6
      }),
      outValue: new StructABC({
        a: undefined,
        b: 'doom',
        c: 6
      }),
      targetType: StructABCType
    }
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];

    t.deepEqual(
      canonicalize.reduce(test.inValue, test.targetType),
      test.outValue,
      test.name + ' converts correctly'
    );
  }
  t.end();
});

// This test checks the failure cases of value to type conversion.
// For example, some maps fail to convert to sets, and null optional values
// cannot convert to their base type.
// This test supplements the cross-language conversion tests cases in
// test-vom-compatible.js
test('canonicalize conversion - failure', function(t) {
  var OptStringType = new Type({
    kind: Kind.OPTIONAL,
    elem: Types.STRING
  });
  var IntListType = new Type({
    kind: Kind.LIST,
    elem: Types.INT32
  });
  var Int3ArrType = new Type({
    kind: Kind.ARRAY,
    elem: Types.INT32,
    len: 3
  });
  var IntSetType = new Type({
    kind: Kind.SET,
    key: Types.INT16
  });

  var Str = Registry.lookupOrCreateConstructor(Types.STRING);
  var OptStr = Registry.lookupOrCreateConstructor(OptStringType);
  var IntList = Registry.lookupOrCreateConstructor(IntListType);

  var tests = [
    {
      name: 'number larger than MAX_FLOAT32',
      inValue: 1e40,
      targetType: Types.FLOAT32,
      expectedErr: 'is too large'
    },
    {
      name: 'imag smaller than MAX_FLOAT32 in Complex64',
      inValue: { real: 0, imag: -1e40 },
      targetType: Types.COMPLEX64,
      expectedErr: 'is too small'
    },
    {
      name: 'negative, real Complex to uint',
      inValue: new Complex(-4, 0),
      targetType: Types.UINT16,
      expectedErr: 'value cannot be negative'
    },
    {
      name: 'null OptString to String',
      inValue: new OptStr(null),
      targetType: Types.STRING,
      expectedErr: 'value is null for non-optional type'
    },
    {
      name: 'String to Bool',
      inValue: new Str('not a boolean'),
      targetType: Types.BOOL,
      expectedErr: 'not compatible'
    },
    {
      name: 'String to Bool - native',
      inValue: 'not a boolean',
      targetType: Types.BOOL,
      expectedErr: 'value is not a boolean'
    },
    {
      name: 'large list to smaller array',
      inValue: new IntList([3, 4, 8, 1]),
      targetType: Int3ArrType,
      expectedErr: 'exceeds type length 3'
    },
    {
      name: 'large list to smaller array - native',
      inValue: [3, 4, 8, 1],
      targetType: Int3ArrType,
      expectedErr: 'exceeds type length 3'
    },
    {
      name: 'map to set',
      inValue: new Map([[4, 'not a bool'], [5, true]]),
      targetType: IntSetType,
      expectedErr: 'this Map value cannot convert to Set'
    }
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];

    t.throws(
      canonicalize.reduce.bind(null, test.inValue, test.targetType),
      new RegExp('.*' + (test.expectedErr || '') + '.*'),
      test.name + ' fails to convert'
    );
  }
  t.end();
});