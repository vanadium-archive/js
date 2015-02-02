/**
 * @fileoverview Tests create-constructor.js
 */

var test = require('prova');

var BigInt = require('./../../src/vom/big-int.js');
var createConstructor = require('./../../src/vom/create-constructor.js');
var Kind = require('./../../src/vom/kind.js');
var Types = require('./../../src/vom/types.js');

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
