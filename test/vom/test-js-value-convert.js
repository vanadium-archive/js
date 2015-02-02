/**
 * @fileoverview Tests for js-value.js
 * Conversion of JSValue to and from native values should be idempotent.
 * Tests of the shallow convertTonative are performed in canonicalize.
 */

var test = require('prova');

var Registry = require('./../../src/vom/registry.js');
var Types = require('./../../src/vom/types.js');
var jsValueConvert = require('./../../src/vom/js-value-convert.js');
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

// Note: These test cases usually convert native and jsval correctly. There are
// some edge cases like 'undefined', so nativeFinal is used in such cases.
test('js-value convert to and from native', function(t) {
  var tests = [
    {
      name: 'Undefined',
      native: undefined,
      jsval: JS({
        'null': {}
      }),
      nativeFinal: null
    },
    {
      name: 'Null',
      native: null,
      jsval: JS({
        'null': {}
      })
    },
    {
      name: 'Boolean',
      native: false,
      jsval: JS({
        'boolean': false
      })
    },
    {
      name: 'Number',
      native: 4,
      jsval: JS({
        'number': 4
      })
    },
    {
      name: 'String',
      native: 'abc',
      jsval: JS({
        'string': 'abc'
      })
    },
    {
      name: 'Bytes',
      native: new Uint8Array([3, 55, 128]),
      jsval: JS({
        'bytes': new Uint8Array([3, 55, 128])
      })
    },
    {
      name: 'List of various things',
      native: ['', 'pi', 3.14, true, null],
      jsval: JS({
        'list': [
          JS({
            'string': ''
          }),
          JS({
            'string': 'pi'
          }),
          JS({
            'number': 3.14
          }),
          JS({
            'boolean': true
          }),
          JS({
            'null': {}
          })
        ]
      })
    },
    {
      name: 'Set of various things',
      native: new Set(['', 'pi', 3.14, true, null]),
      jsval: JS({
        'set': [
          JS({
            'string': ''
          }),
          JS({
            'string': 'pi'
          }),
          JS({
            'number': 3.14
          }),
          JS({
            'boolean': true
          }),
          JS({
            'null': {}
          })
        ]
      })
    },
    {
      name: 'Set with undefined',
      native: new Set([null, undefined]),
      jsval: JS({
        'set': [
          JS({
            'null': {}
          }),
          JS({
            'null': {}
          }),
        ]
      }),
      nativeFinal: new Set([null])
    },
    {
      name: 'Map of various things',
      native: new Map([
        ['3', 3],
        [false, null],

      ]),
      jsval: JS({
        'map': [
          {
            'key': JS({
              'string': '3'
            }),
            'value': JS({
              'number': 3
            })
          },
          {
            'key': JS({
              'boolean': false
            }),
            'value': JS({
              'null': {}
            })
          }
        ]
      })
    },
    {
      name: 'Object',
      native: {},
      jsval: JS({
        'object': []
      })
    },
    {
      name: 'Object with private properties',
      native: {
        _private: 'Gonna be dropped',
        survivor: 'I\'m gonna make it'
      },
      jsval: JS({
        'object': [
          {
            'key': 'survivor',
            'value': JS({
              'string': 'I\'m gonna make it'
            })
          }
        ]
      }),
      nativeFinal: {
        survivor: 'I\'m gonna make it'
      }
    },
    {
      name: 'Object with undefined',
      native: {
        'num': -9.4,
        'str': '\n',
        'abc': undefined
      },
      jsval: JS({
        'object': [
          {
            'key': 'num',
            'value': JS({
              'number': -9.4
            })
          },
          {
            'key': 'str',
            'value': JS({
              'string': '\n'
            })
          },
          {
            'key': 'abc',
            'value': JS({
              'null': {}
            })
          }
        ]
      }),
      nativeFinal: {
        'num': -9.4,
        'str': '\n',
        'abc': null // An object with an 'undefined' field value will be
                    // converted back to native form with 'null' in that field.
      }
    },
    {
      name: 'List with some typed values',
      native: [3, false, null, 'abc', undefined, {
        val: 3.14,
        _type: Types.FLOAT32,   // pretend this is on the prototype
        _wrappedType: true      // pretend this is on the prototype
      }],
      jsval: JS({
        'list': [
          JS({
            'number': 3
          }),
          JS({
            'boolean': false
          }),
          JS({
            'null': {}
          }),
          JS({
            'string': 'abc'
          }),
          JS({
            'null': {}
          }),
          {
            val: 3.14,
            _type: Types.FLOAT32, // pretend this is on the prototype
            _wrappedType: true    // pretend this is on the prototype
          }
        ]
      }),
      nativeFinal: [3, false, null, 'abc', null, {
        val: 3.14,
        _type: Types.FLOAT32,   // pretend this is on the prototype
        _wrappedType: true      // pretend this is on the prototype
      }]
    }
  ];

  for (var i = 0; i < tests.length; i++) {
    var name = tests[i].name;
    var native = tests[i].native;
    var jsval = tests[i].jsval;
    // Note: Uses native if nativeFinal is not defined by the test case.
    var nativeFinal = tests[i].nativeFinal;
    if (nativeFinal === undefined) {
      nativeFinal = native;
    }

    // Check that native => JSValue is ok and has the correct type.
    var jsValueFromNative = jsValueConvert.fromNative(native);
    t.deepEqual(jsValueFromNative, jsval, name + ' - from native');
    t.equal(stringify(jsValueFromNative), stringify(jsval),
      name + ' - from native (stringify)');
    t.ok(jsValueFromNative._type === Types.JSVALUE,
      name + ' - from native has Type JSValue');

    // Check that JSValue => native is ok.
    var nativeFromJSValue = jsValueConvert.toNative(jsval);
    t.deepEqual(nativeFromJSValue, nativeFinal,
      name + ' - to native');
    t.equal(stringify(nativeFromJSValue), stringify(nativeFinal),
      name + ' - to native (stringify)');

    // Check that native remains the same if converted to native.
    var stillNative = jsValueConvert.toNative(native);
    t.deepEqual(native, stillNative, name + ' - native to native is no-op');
    t.equal(stringify(native), stringify(stillNative),
      name + ' - native to native is no-op (stringify)');

    // Check that jsval remains the same if converted from native.
    var stillJSVal = jsValueConvert.fromNative(jsval);
    t.deepEqual(jsval, stillJSVal, name + ' - jsval to jsval is no-op');
    t.equal(stringify(jsval), stringify(stillJSVal),
      name + ' - jsval to jsval is no-op (stringify)');
  }

  t.end();
});
