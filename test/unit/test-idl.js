var test = require('prova');
var idl = require('../../src/idl/idl.js');

test('empty service', function(assert) {
  var service = new idl.ServiceWrapper({});
  var idlWire = idl.generateIdlWireDescription(service);

  assert.deepEqual(idlWire, {
    _type: idl.idlWireDescType
  });
  assert.end();
});

test('empty method', function(assert) {
  var service = new idl.ServiceWrapper({ noop: noop });
  var idlWire = idl.generateIdlWireDescription(service);
  var expected = {
    _type: idl.idlWireDescType,
    noop: {
      InArgs: [],
      NumOutArgs: 2,
      IsStreaming: false
    }
  };

  assert.deepEqual(idlWire, expected);
  assert.end();
});

test('method with args', function(assert) {
  var service = new idl.ServiceWrapper({ doubleArgs: doubleArgs });
  var idlWire = idl.generateIdlWireDescription(service);
  var expected = {
    _type: idl.idlWireDescType,
    doubleArgs: {
      InArgs: ['arg1', 'arg2'],
      NumOutArgs: 2,
      IsStreaming: false
    }
  };

  assert.deepEqual(idlWire, expected);
  assert.end();
});

test('multiple methods', function(assert) {
  var service = new idl.ServiceWrapper({
    noop: noop,
    doubleArgs: doubleArgs
  });
  var idlWire = idl.generateIdlWireDescription(service);
  var expected = {
    _type: idl.idlWireDescType,
    noop: {
      InArgs: [],
      NumOutArgs: 2,
      IsStreaming: false
    },
    doubleArgs: {
      InArgs: ['arg1', 'arg2'],
      NumOutArgs: 2,
      IsStreaming: false
    }
  };

  assert.deepEqual(idlWire, expected);
  assert.end();
});

test('skips methods with prefix: "_"', function(assert) {
  var service = new idl.ServiceWrapper({
    _skip: noop,
    doubleArgs: doubleArgs
  });
  var idlWire = idl.generateIdlWireDescription(service);
  var expected = {
    _type: idl.idlWireDescType,
    doubleArgs: {
      InArgs: ['arg1', 'arg2'],
      NumOutArgs: 2,
      IsStreaming: false
    }
  };

  assert.deepEqual(idlWire, expected);
  assert.end();
});

test('skips args with prefix: "$"', function(assert) {
  var service = new idl.ServiceWrapper({ dollars: dollars });
  var idlWire = idl.generateIdlWireDescription(service);
  var expected = {
    _type: idl.idlWireDescType,
    dollars: {
      InArgs: ['two', 'four'],
      NumOutArgs: 2,
      IsStreaming: false
    }
  };

  assert.deepEqual(idlWire, expected);
  assert.end();
});

test('streaming', function(assert) {
  var service = new idl.ServiceWrapper({
    method: function(one, $stream) {}
  });
  var idlWire = idl.generateIdlWireDescription(service);
  var expected = {
    _type: idl.idlWireDescType,
    method: {
      InArgs: ['one'],
      NumOutArgs: 2,
      IsStreaming: true
    }
  };

  assert.deepEqual(idlWire, expected);
  assert.end();
});

test('capitalized arguments', function(assert) {
  assert.throws(function() {
    idl.ServiceWrapper({ Method: noop });
  });

  assert.end();
});

function noop(){}

function doubleArgs(arg1, arg2) {
  return arg1;
}

function dollars($one, two, $three, four) {
}
