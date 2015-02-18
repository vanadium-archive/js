var test = require('prova');
var base = require(
  '../vdl-out/v.io/core/veyron2/vdl/testdata/base/base');
var context = require('../../src/runtime/context');
var SharedContextKeys = require('../../src/runtime/shared-context-keys');
var actions = require('../../src/errors/actions');

var Kind = require('../../src/vdl/vdl').Kind;
var Types = require('../../src/vdl/vdl').Types;
var BigInt = require('../../src/vdl/vdl').BigInt;

test('named primitive types', function(assert) {
  var res = new base.NamedBool(false);
  assert.deepEqual(res._type, {
    kind: Kind.BOOL,
    name: 'v.io/core/veyron2/vdl/testdata/base.NamedBool',
  });
  assert.equal(res.val, false);

  res = new base.NamedByte(1);
  assert.deepEqual(res._type,{
    kind: Kind.BYTE,
    name: 'v.io/core/veyron2/vdl/testdata/base.NamedByte',
  });
  assert.equal(res.val, 1);

  res = new base.NamedUint16(1);
  assert.deepEqual(res._type, {
    kind: Kind.UINT16,
    name: 'v.io/core/veyron2/vdl/testdata/base.NamedUint16',
  });
  assert.equal(res.val, 1);

  res = new base.NamedUint32(1);
  assert.deepEqual(res._type, {
    kind: Kind.UINT32,
    name: 'v.io/core/veyron2/vdl/testdata/base.NamedUint32',
  });
  assert.equal(res.val, 1);

  res = new base.NamedUint64(1);
  assert.deepEqual(res._type, {
    kind: Kind.UINT64,
    name: 'v.io/core/veyron2/vdl/testdata/base.NamedUint64',
  });
  assert.deepEqual(res.val, BigInt.fromNativeNumber(1));

  res = new base.NamedInt16(1);
  assert.deepEqual(res._type, {
    kind: Kind.INT16,
    name: 'v.io/core/veyron2/vdl/testdata/base.NamedInt16',
  });
  assert.equal(res.val, 1);

  res = new base.NamedInt32(1);
  assert.deepEqual(res._type, {
    kind: Kind.INT32,
    name: 'v.io/core/veyron2/vdl/testdata/base.NamedInt32',
  });
  assert.equal(res.val, 1);

  res = new base.NamedInt64(1);
  assert.deepEqual(res._type, {
    kind: Kind.INT64,
    name: 'v.io/core/veyron2/vdl/testdata/base.NamedInt64',
  });
  assert.deepEqual(res.val, BigInt.fromNativeNumber(1));

  res = new base.NamedFloat32(1);
  assert.deepEqual(res._type, {
    kind: Kind.FLOAT32,
    name: 'v.io/core/veyron2/vdl/testdata/base.NamedFloat32',
  });
  assert.equal(res.val, 1);

  res = new base.NamedFloat64(1);
  assert.deepEqual(res._type, {
    kind: Kind.FLOAT64,
    name: 'v.io/core/veyron2/vdl/testdata/base.NamedFloat64',
  });
  assert.equal(res.val, 1);

  res = new base.NamedComplex64({});
  assert.deepEqual(res._type, {
    kind: Kind.COMPLEX64,
    name: 'v.io/core/veyron2/vdl/testdata/base.NamedComplex64',
  });
  assert.deepEqual(res.val, { real: 0, imag: 0 });

  res = new base.NamedComplex128({});
  assert.deepEqual(res._type, {
    kind: Kind.COMPLEX128,
    name: 'v.io/core/veyron2/vdl/testdata/base.NamedComplex128',
  });
  assert.deepEqual(res.val, { real: 0, imag: 0 });

  res = new base.NamedString('foo');
  assert.deepEqual(res._type, {
    kind: Kind.STRING,
    name: 'v.io/core/veyron2/vdl/testdata/base.NamedString',
  });
  assert.equal(res.val, 'foo');
  assert.end();
});

test('named composite types', function(assert) {
  var res = new base.NamedArray([false, true]);
  assert.deepEqual(res._type, {
    name: 'v.io/core/veyron2/vdl/testdata/base.NamedArray',
    kind: Kind.ARRAY,
    elem: Types.BOOL,
    len: 2,
  });
  assert.deepEquals(res.val, [false, true]);

  res = new base.NamedList([]);
  assert.deepEqual(res._type, {
    name: 'v.io/core/veyron2/vdl/testdata/base.NamedList',
    kind: Kind.LIST,
    elem: Types.UINT32
  });
  assert.deepEquals(res.val, []);
  assert.end();
});

// The vdl behavior in createConstructor is to set the fields to their 0-value.
test('struct constructor', function(assert) {
  var res = new base.NamedStruct();
  // Make sure the default values are set.
  assert.equal(res.a, false);
  assert.equal(res.b, '');
  assert.equal(res.c, 0);

  res = new base.NamedStruct({a: true});
  // Make sure overrides are applied
  assert.equal(res.a, true);
  assert.equal(res.b, '');
  assert.equal(res.c, 0);
  assert.end();
});

test('errors', function(assert) {
  var rootContext = new context.Context();
  var enContext = rootContext.withValue(SharedContextKeys.LANG_KEY, 'en');
  var e = new base.WithParams2Error(enContext, 1, 2);
  assert.equal(e._argTypes.length, 2);
  assert.equal(e.message, 'app:op: en x=1 y=2');
  var frContext = rootContext.withValue(SharedContextKeys.LANG_KEY, 'fr');
  e = new base.WithParams2Error(frContext, 1, 2);
  assert.equal(e._argTypes.length, 2);
  assert.equal(e.message, 'app:op: fr y=2 x=1');
  assert.end();

  e = new base.NoParams2Error(rootContext);
  assert.equal(e.idAction.action, actions.RETRY_REFETCH);
});
