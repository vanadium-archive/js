var test = require('prova');
var base = require(
  '../../src/veyron.io/veyron/veyron2/vdl/testdata/base/base');
var Kind = require('vom').Kind;
var Types = require('vom').Types;
var BigInt = require('vom').BigInt;

test('named primitive types', function(assert) {
  var res = new base.types.NamedBool(false);
  assert.deepEqual(res._type, {
    kind: Kind.BOOL,
    name: 'veyron.io/veyron/veyron2/vdl/testdata/base.NamedBool',
  });
  assert.equal(res.val, false);

  res = new base.types.NamedByte(1);
  assert.deepEqual(res._type,{
    kind: Kind.BYTE,
    name: 'veyron.io/veyron/veyron2/vdl/testdata/base.NamedByte',
  });
  assert.equal(res.val, 1);

  res = new base.types.NamedUint16(1);
  assert.deepEqual(res._type, {
    kind: Kind.UINT16,
    name: 'veyron.io/veyron/veyron2/vdl/testdata/base.NamedUint16',
  });
  assert.equal(res.val, 1);

  res = new base.types.NamedUint32(1);
  assert.deepEqual(res._type, {
    kind: Kind.UINT32,
    name: 'veyron.io/veyron/veyron2/vdl/testdata/base.NamedUint32',
  });
  assert.equal(res.val, 1);

  res = new base.types.NamedUint64(1);
  assert.deepEqual(res._type, {
    kind: Kind.UINT64,
    name: 'veyron.io/veyron/veyron2/vdl/testdata/base.NamedUint64',
  });
  assert.deepEqual(res.val, BigInt.fromNativeNumber(1));

  res = new base.types.NamedInt16(1);
  assert.deepEqual(res._type, {
    kind: Kind.INT16,
    name: 'veyron.io/veyron/veyron2/vdl/testdata/base.NamedInt16',
  });
  assert.equal(res.val, 1);

  res = new base.types.NamedInt32(1);
  assert.deepEqual(res._type, {
    kind: Kind.INT32,
    name: 'veyron.io/veyron/veyron2/vdl/testdata/base.NamedInt32',
  });
  assert.equal(res.val, 1);

  res = new base.types.NamedInt64(1);
  assert.deepEqual(res._type, {
    kind: Kind.INT64,
    name: 'veyron.io/veyron/veyron2/vdl/testdata/base.NamedInt64',
  });
  assert.deepEqual(res.val, BigInt.fromNativeNumber(1));

  res = new base.types.NamedFloat32(1);
  assert.deepEqual(res._type, {
    kind: Kind.FLOAT32,
    name: 'veyron.io/veyron/veyron2/vdl/testdata/base.NamedFloat32',
  });
  assert.equal(res.val, 1);

  res = new base.types.NamedFloat64(1);
  assert.deepEqual(res._type, {
    kind: Kind.FLOAT64,
    name: 'veyron.io/veyron/veyron2/vdl/testdata/base.NamedFloat64',
  });
  assert.equal(res.val, 1);

  res = new base.types.NamedComplex64({});
  assert.deepEqual(res._type, {
    kind: Kind.COMPLEX64,
    name: 'veyron.io/veyron/veyron2/vdl/testdata/base.NamedComplex64',
  });
  assert.deepEqual(res.val, { real: 0, imag: 0 });

  res = new base.types.NamedComplex128({});
  assert.deepEqual(res._type, {
    kind: Kind.COMPLEX128,
    name: 'veyron.io/veyron/veyron2/vdl/testdata/base.NamedComplex128',
  });
  assert.deepEqual(res.val, { real: 0, imag: 0 });

  res = new base.types.NamedString('foo');
  assert.deepEqual(res._type, {
    kind: Kind.STRING,
    name: 'veyron.io/veyron/veyron2/vdl/testdata/base.NamedString',
  });
  assert.equal(res.val, 'foo');
  assert.end();
});

test('named composite types', function(assert) {
  var res = new base.types.NamedArray([false, true]);
  assert.deepEqual(res._type, {
    name: 'veyron.io/veyron/veyron2/vdl/testdata/base.NamedArray',
    kind: Kind.ARRAY,
    elem: Types.BOOL,
    len: 2,
  });
  assert.deepEquals(res.val, [false, true]);

  res = new base.types.NamedList([]);
  assert.deepEqual(res._type, {
    name: 'veyron.io/veyron/veyron2/vdl/testdata/base.NamedList',
    kind: Kind.LIST,
    elem: Types.UINT32
  });
  assert.deepEquals(res.val, []);
  assert.end();
});

// The vom behavior in createConstructor is to set the fields to their 0-value.
test('struct constructor', function(assert) {
  var res = new base.types.NamedStruct();
  // Make sure the default values are set.
  assert.equal(res.a, false);
  assert.equal(res.b, '');
  assert.equal(res.c, 0);

  res = new base.types.NamedStruct({a: true});
  // Make sure overrides are applied
  assert.equal(res.a, true);
  assert.equal(res.b, '');
  assert.equal(res.c, 0);
  assert.end();
});
