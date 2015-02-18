/**
 * @fileoverview Tests create-constructor.js
 */

var test = require('prova');

var BigInt = require('./../../src/vdl/big-int.js');
var createConstructor = require('./../../src/vdl/create-constructor.js');
var Kind = require('./../../src/vdl/kind.js');
var Types = require('./../../src/vdl/types.js');
var Complex = require('./../../src/vdl/complex.js');

test('create constructor', function(assert) {
  var tests = [
    {
      type: Types.UINT32,
      value: 23,
      expectedValue: {
        val: 23
      },
      expectedValueDeep: {
        val: 23
      }
    },
    {
      type: Types.UINT32,
      value: {
        val: 24,
        _type: Types.UINT32,
        _wrappedType: true
      },
      expectedValue: {
        val: 24
      },
      expectedValueDeep: {
        val: 24
      }
    },
    { // Ensure that we can pass constructed values as arguments
      type: Types.UINT32,
      value:  new (createConstructor(Types.UINT32))(25),
      expectedValue: {
        val: 25
      },
      expectedValueDeep: {
        val: 25
      }
    },
    {
      type: Types.UINT64,
      value: {
        val: new BigInt(1, new Uint8Array([4, 3])),
        _type: Types.UINT64,
        _wrappedType: true
      },
      expectedValue: {
        val: new BigInt(1, new Uint8Array([4, 3])),
      },
      expectedValueDeep: {
        val: new BigInt(1, new Uint8Array([4, 3])),
      }
    },
    {
      type: Types.UINT64,
      value: {
        val: new BigInt(1, new Uint8Array([4, 3])),
        _type: {
          name: 'NamedBigInt',
          kind: Kind.UINT64
        },
        _wrappedType: true
      },
      expectedValue: {
        val: new BigInt(1, new Uint8Array([4, 3])),
      },
      expectedValueDeep: {
        val: new BigInt(1, new Uint8Array([4, 3])),
      }
    },
    { // Ensure that we can pass constructed values as arguments
      type: Types.UINT64,
      value:  new (createConstructor(Types.UINT64))(
        new BigInt(1, new Uint8Array([1, 2]))),
      expectedValue: {
        val: new BigInt(1, new Uint8Array([1, 2]))
      },
      expectedValueDeep: {
        val: new BigInt(1, new Uint8Array([1, 2]))
      }
    },
    {
      type: Types.COMPLEX64,
      value: {
        val: new Complex(2, 3),
        _type: Types.COMPLEX64,
        _wrappedType: true
      },
      expectedValue: {
        val: new Complex(2, 3)
      },
      expectedValueDeep: {
        val: new Complex(2, 3)
      }
    },
    {
      type: Types.STRING,
      value: {
        val: 'testString',
        _type: Types.STRING,
        _wrappedType: true
      },
      expectedValue: {
        val: 'testString'
      },
      expectedValueDeep: {
        val: 'testString'
      }
    },
    {
      type: {
        kind: Kind.MAP,
        name: 'aMap',
        key: Types.STRING,
        elem: Types.INT64,
      },
      value: {
        'a': 3,
        'b': -23,
      },
      expectedValue: {
        val: new Map([
          ['a', BigInt.fromNativeNumber(3)],
          ['b', BigInt.fromNativeNumber(-23)]
        ])
      },
      expectedValueDeep: {
        val: new Map([
          [{ val: 'a' }, { val: BigInt.fromNativeNumber(3) }],
          [{ val: 'b' }, { val: BigInt.fromNativeNumber(-23) }]
        ])
      }
    },
    {
      type: {
        kind: Kind.STRUCT,
        name: 'aStruct',
        fields: [
          {
            name: 'UsedField',
            type: Types.STRING
          },
          {
            name: 'UnusedField',
            type: Types.UINT16
          }
        ]
      },
      value: {
        usedField: 'value'
      },
      expectedValue: {
        usedField: 'value',
        unusedField: 0
      },
      expectedValueDeep: {
        usedField: { val: 'value' },
        unusedField: { val: 0 }
      }
    }
  ];
  for (var index = 0; index < tests.length; index++) {
    var test = tests[index];
    var type = test.type;
    var value = test.value;
    var expectedValue = test.expectedValue;
    var expectedValueDeep = test.expectedValueDeep;

    var Constructor = createConstructor(type);
    if (type.hasOwnProperty('name')) {
      assert.deepEqual(
        Constructor.displayName,
        'TypeConstructor[' + type.name + ']'
      );
    } else {
      assert.deepEqual(Constructor.displayName, 'TypeConstructor');
    }

    // Standard use of the constructor; constructedValues are shallow.
    var constructedValue = new Constructor(value);
    if (type.kind === Kind.STRUCT) {
      assert.deepEqual(constructedValue, expectedValue);
      assert.notOk(constructedValue.hasOwnProperty('_wrappedType'));
    } else {
      assert.deepEqual(constructedValue, expectedValue);
      assert.ok(constructedValue._wrappedType);
    }
    assert.deepEqual(constructedValue._type, type);

    // deepWrap use of the constructor; constructedValues are deep.
    var constructedValueDeep = new Constructor(value, true);
    if (type.kind === Kind.STRUCT) {
      assert.deepEqual(constructedValueDeep, expectedValueDeep);
      assert.notOk(constructedValue.hasOwnProperty('_wrappedType'));
    } else {
      assert.deepEqual(constructedValueDeep, expectedValueDeep);
      assert.ok(constructedValueDeep._wrappedType);
    }
    assert.deepEqual(constructedValueDeep._type, type);
  }
  assert.end();
});

test('created constructor fails on extra struct field', function(assert) {
  var type = {
    kind: Kind.STRUCT,
    name: 'aStruct',
    fields: [
      {
        name: 'usedField',
        type: Types.STRING
      }
    ]
  };
  var constructor = createConstructor(type);
  var value = {
    usedField: 'value',
    extraField: 4
  };
  assert.throws(function() {
    constructor(value);
  });
  assert.end();
});

test('created constructor fails on invalid data', function(assert) {
  var type = {
    kind: Kind.BOOL,
    name: 'aBool'
  };
  var constructor = createConstructor(type);
  var value = 'This is not a bool! This is a string!';
  assert.throws(function() {
    constructor(value);
  });
  assert.end();
});
