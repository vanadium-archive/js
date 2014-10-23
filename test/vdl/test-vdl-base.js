var test = require('prova');
var base = require(
  '../../src/veyron.io/veyron/veyron2/vdl/testdata/base/base');
var Kind = require('vom').Kind;
var Types = require('vom').Types;

test('named primitive types', function(assert) {
  var res = new base.types.NamedBool(false);
  assert.equal(res._type, Types.BOOL);
  assert.equal(res.val, false);

  res = new base.types.NamedByte(1);
  assert.equal(res._type, Types.BYTE);
  assert.equal(res.val, 1);

  res = new base.types.NamedUint16(1);
  assert.equal(res._type, Types.UINT16);
  assert.equal(res.val, 1);

  res = new base.types.NamedUint32(1);
  assert.equal(res._type, Types.UINT32);
  assert.equal(res.val, 1);

  res = new base.types.NamedUint64(1);
  assert.equal(res._type, Types.UINT64);
  assert.equal(res.val, 1);

  res = new base.types.NamedInt16(1);
  assert.equal(res._type, Types.INT16);
  assert.equal(res.val, 1);

  res = new base.types.NamedInt32(1);
  assert.equal(res._type, Types.INT32);
  assert.equal(res.val, 1);

  res = new base.types.NamedInt64(1);
  assert.equal(res._type, Types.INT64);
  assert.equal(res.val, 1);

  res = new base.types.NamedFloat32(1);
  assert.equal(res._type, Types.FLOAT32);
  assert.equal(res.val, 1);

  res = new base.types.NamedFloat64(1);
  assert.equal(res._type, Types.FLOAT64);
  assert.equal(res.val, 1);

  res = new base.types.NamedComplex64(null);
  assert.equal(res._type, Types.COMPLEX64);
  assert.equal(res.val, null);

  res = new base.types.NamedComplex128(null);
  assert.equal(res._type, Types.COMPLEX128);
  assert.equal(res.val, null);

  res = new base.types.NamedString('foo');
  assert.equal(res._type, Types.STRING);
  assert.equal(res.val, 'foo');
  assert.end();
});

test('named composite types', function(assert) {
  var res = new base.types.NamedArray([false, true]);
  assert.deepEqual(res._type, {
    kind: Kind.ARRAY,
    elem: Types.BOOL,
    len: 2,
  });
  assert.deepEquals(res.val, [false, true]);

  res = new base.types.NamedList([]);
  assert.deepEqual(res._type, {
    kind: Kind.LIST,
    elem: Types.UINT32
  });
  assert.deepEquals(res.val, []);
  assert.end();
});

test('struct constructor', function(assert) {
  var res = new base.types.NamedStruct();
  // Make sure the default values are set.
  assert.equal(res.A, false);
  assert.equal(res.B, '');
  assert.equal(res.C, 0);

  res = new base.types.NamedStruct({A: true});
  // Make sure overrides are applied
  assert.equal(res.A, true);
  assert.equal(res.B, '');
  assert.equal(res.C, 0);
  assert.end();
});
