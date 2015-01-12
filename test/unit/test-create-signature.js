/**
 * @fileoverview Tests of generating signature with multiple descriptions
 */
var test = require('prova');
var createSignatures = require('../../src/vdl/create-signatures');

var vom = require('vom');

function TestService() {
}

TestService.prototype.noArgsFunction = function(ctx) {};
TestService.prototype.namedFunction = NamedFunc;
function NamedFunc(context, x, y, z ) {}
TestService.prototype.streamingFunction = function(context, $stream) {};

test('create signatures with no description', function(t) {
  var testService = new TestService();
  var sigs = createSignatures(testService);
  t.equals(sigs.length, 1);
  var expected = {
    methods: [{
      name: 'NoArgsFunction',
      inArgs: [],
      outArgs: [{
        'type': vom.Types.ANY
      }, {
        'type': vom.Types.ERROR
      }]
    }, {
      name: 'NamedFunction',
      inArgs: [{
        name: 'x',
      }, {
        name: 'y'
      }, {
        name: 'z'
      }],
      outArgs: [{
        'type': vom.Types.ANY
      }, {
        'type': vom.Types.ERROR
      }]
    },{
      name: 'StreamingFunction',
      inArgs: [],
      outArgs: [{
        'type': vom.Types.ANY
      }, {
        'type': vom.Types.ERROR
      }],
      inStream: {
        type: vom.Types.ANY,
      },
      outStream: {
        type: vom.Types.ANY,
      }
    }]
  };
  var stringifiedResult = vom.Stringify(sigs[0]);
  var stringifiedExpected = vom.Stringify(expected);
  t.equals(stringifiedResult, stringifiedExpected);
  t.end();
});

test('create signatures with full description', function(t) {
  var testService = new TestService();
  var desc = {
    name: 'TestService',
    pkgPath: 'service/test',
    doc: 'TestServiceDoc',
    methods: [{
      name: 'NoArgsFunction',
      doc: 'NoArgsDoc',
      inArgs: [],
      outArgs: [],
    }, {
      name: 'NamedFunction',
      doc: 'NamedFunctionDoc',
      inArgs: [{
        name: 'x',
        doc: 'xDoc',
        type: vom.Types.UINT32
      }, {
        name: 'y',
        doc: 'yDoc',
        type: vom.Types.STRING
      }, {
        name: 'z',
        doc: 'zDoc',
        type: vom.Types.Complex128
      }],
      outArgs: [{
        name: 'a',
        doc: 'aDoc',
        type: vom.Types.STRING
      }, {
        name: 'err',
        doc: 'errDoc',
        type: vom.Types.ERROR
      }]
    }, {
      name: 'StreamingFunction',
      doc: 'StreamingFunctionDoc',
      inArgs: [],
      outArgs: [{
        name: 'err',
        doc: 'errDoc',
        type: vom.Types.ERROR
      }],
      inStream: {
        type: vom.Types.UINT32
      },
      outStream: {
        type: vom.Types.INT32
      }
    }]
  };
  var sigs = createSignatures(testService, desc);
  t.equals(sigs.length, 1);
  var stringifiedResult = vom.Stringify(sigs[0]);
  var stringifiedExpected = vom.Stringify(desc);
  t.equals(stringifiedResult, stringifiedExpected);
  t.end();
});

test('create signatures with one description but extra methods', function(t) {
  var testService = new TestService();
  var desc = {
    name: 'TestService',
    pkgPath: 'service/test',
    doc: 'TestServiceDoc',
    methods: [{
      name: 'NamedFunction',
      doc: 'NamedFunctionDoc',
      inArgs: [{
        name: 'x',
        doc: 'xDoc',
        type: vom.Types.UINT32
      }, {
        name: 'y',
        doc: 'yDoc',
        type: vom.Types.STRING
      }, {
        name: 'z',
        doc: 'zDoc',
        type: vom.Types.Complex128
      }],
      outArgs: [{
        name: 'a',
        doc: 'aDoc',
        type: vom.Types.STRING
      }, {
        name: 'err',
        doc: 'errDoc',
        type: vom.Types.ERROR
      }]
    }, {
      name: 'StreamingFunction',
      doc: 'StreamingFunctionDoc',
      inArgs: [],
      outArgs: [{
        name: 'err',
        doc: 'errDoc',
        type: vom.Types.ERROR
      }],
      inStream: {
        type: vom.Types.UINT32
      },
      outStream: {
        type: vom.Types.INT32
      }
    }]
  };
  var sigs = createSignatures(testService, desc);
  t.equals(sigs.length, 2);
  var stringifiedResult = vom.Stringify(sigs[0]);
  var stringifiedExpected = vom.Stringify(desc);
  t.equals(stringifiedResult, stringifiedExpected);

  var expectedExtra = {
    methods: [{
      name: 'NoArgsFunction',
      inArgs: [],
      outArgs: [{
        'type': vom.Types.ANY
      }, {
        'type': vom.Types.ERROR
      }]
    }]
  };
  var stringifiedResultExtra = vom.Stringify(sigs[1]);
  var stringifiedExpectedExtra = vom.Stringify(expectedExtra);
  t.equals(stringifiedResultExtra, stringifiedExpectedExtra);

  t.end();
});

test('create signatures with full description across multiple descs',
     function(t) {
  var testService = new TestService();
  var descs = [{
    name: 'TestService',
    pkgPath: 'service/test',
    doc: 'TestServiceDoc',
    methods: [{
      name: 'NoArgsFunction',
      doc: 'NoArgsDoc',
      inArgs: [],
      outArgs: [],
    }]
  }, {
    name: 'TestService2',
    pkgPath: 'service2/test',
    doc: 'TestService2Doc',
    methods: [{
      name: 'NamedFunction',
      doc: 'NamedFunctionDoc',
      inArgs: [{
        name: 'x',
        doc: 'xDoc',
        type: vom.Types.UINT32
      }, {
        name: 'y',
        doc: 'yDoc',
        type: vom.Types.STRING
      }, {
        name: 'z',
        doc: 'zDoc',
        type: vom.Types.Complex128
      }],
      outArgs: [{
        name: 'a',
        doc: 'aDoc',
        type: vom.Types.STRING
      }, {
        name: 'err',
        doc: 'errDoc',
        type: vom.Types.ERROR
      }]
    }]
  }, {
    name: 'TestService3',
    pkgPath: 'service3/test',
    doc: 'TestService3Doc',
    methods: [{
      name: 'StreamingFunction',
      doc: 'StreamingFunctionDoc',
      inArgs: [],
      outArgs: [{
        name: 'err',
        doc: 'errDoc',
        type: vom.Types.ERROR
      }],
      inStream: {
        type: vom.Types.UINT32
      },
      outStream: {
        type: vom.Types.INT32
      }
    }]
  }];
  var sigs = createSignatures(testService, descs);
  t.equals(sigs.length, 3);
  var stringifiedResult = vom.Stringify(sigs);
  var stringifiedExpected = vom.Stringify(descs);
  t.equals(stringifiedResult, stringifiedExpected);
  t.end();
});

test('create signatures with multiple descs and missing methods',
     function(t) {
  var testService = new TestService();
  var descs = [{
    name: 'TestService2',
    pkgPath: 'service2/test',
    doc: 'TestService2Doc',
    methods: [{
      name: 'NamedFunction',
      doc: 'NamedFunctionDoc',
      inArgs: [{
        name: 'x',
        doc: 'xDoc',
        type: vom.Types.UINT32
      }, {
        name: 'y',
        doc: 'yDoc',
        type: vom.Types.STRING
      }, {
        name: 'z',
        doc: 'zDoc',
        type: vom.Types.Complex128
      }],
      outArgs: [{
        name: 'a',
        doc: 'aDoc',
        type: vom.Types.STRING
      }, {
        name: 'err',
        doc: 'errDoc',
        type: vom.Types.ERROR
      }]
    }]
  }, {
    name: 'TestService3',
    pkgPath: 'service3/test',
    doc: 'TestService3Doc',
    methods: [{
      name: 'StreamingFunction',
      doc: 'StreamingFunctionDoc',
      inArgs: [],
      outArgs: [{
        name: 'err',
        doc: 'errDoc',
        type: vom.Types.ERROR
      }],
      inStream: {
        type: vom.Types.UINT32
      },
      outStream: {
        type: vom.Types.INT32
      }
    }]
  }];
  var sigs = createSignatures(testService, descs);
  t.equals(sigs.length, 3);
  var expectedDescs = descs.concat([{
    methods: [{
      name: 'NoArgsFunction',
      inArgs: [],
      outArgs: [{
        'type': vom.Types.ANY
      }, {
        'type': vom.Types.ERROR
      }]
    }]
  }]);
  var stringifiedResult = vom.Stringify(sigs);
  var stringifiedExpected = vom.Stringify(expectedDescs);
  t.equals(stringifiedResult, stringifiedExpected);
  t.end();
});

test('create signatures with full description across multiple descs with ' +
     'duplicates', function(t) {
  var testService = new TestService();
  var descs = [{
    name: 'TestService',
    pkgPath: 'service/test',
    doc: 'TestServiceDoc',
    methods: [{
      name: 'NoArgsFunction',
      doc: 'NoArgsDoc',
      inArgs: [],
      outArgs: [],
    }]
  }, {
    name: 'TestService2',
    pkgPath: 'service2/test',
    doc: 'TestService2Doc',
    methods: [{
      name: 'NamedFunction',
      doc: 'NamedFunctionDoc',
      inArgs: [{
        name: 'x',
        doc: 'xDoc',
        type: vom.Types.UINT32
      }, {
        name: 'y',
        doc: 'yDoc',
        type: vom.Types.STRING
      }, {
        name: 'z',
        doc: 'zDoc',
        type: vom.Types.Complex128
      }],
      outArgs: [{
        name: 'a',
        doc: 'aDoc',
        type: vom.Types.STRING
      }, {
        name: 'err',
        doc: 'errDoc',
        type: vom.Types.ERROR
      }]
    }]
  }, {
    name: 'TestService3',
    pkgPath: 'service3/test',
    doc: 'TestService3Doc',
    methods: [{
      name: 'NamedFunction',
      doc: 'NamedFunctionDoc',
      inArgs: [{
        name: 'x',
        doc: 'xDoc',
        type: vom.Types.UINT32
      }, {
        name: 'y',
        doc: 'yDoc',
        type: vom.Types.STRING
      }, {
        name: 'z',
        doc: 'zDoc',
        type: vom.Types.Complex128
      }],
      outArgs: [{
        name: 'a',
        doc: 'aDoc',
        type: vom.Types.STRING
      }, {
        name: 'err',
        doc: 'errDoc',
        type: vom.Types.ERROR
      }]
    }, {
      name: 'StreamingFunction',
      doc: 'StreamingFunctionDoc',
      inArgs: [],
      outArgs: [{
        name: 'err',
        doc: 'errDoc',
        type: vom.Types.ERROR
      }],
      inStream: {
        type: vom.Types.UINT32
      },
      outStream: {
        type: vom.Types.INT32
      }
    }]
  }];
  var sigs = createSignatures(testService, descs);
  t.equals(sigs.length, 3);
  var stringifiedResult = vom.Stringify(sigs);
  var stringifiedExpected = vom.Stringify(descs);
  t.equals(stringifiedResult, stringifiedExpected);
  t.end();
});

test('create signatures with full description across multiple descs with ' +
     'incompatible methods', function(t) {
  var testService = new TestService();
  var descs = [{
    name: 'TestService',
    pkgPath: 'service/test',
    doc: 'TestServiceDoc',
    methods: [{
      name: 'NoArgsFunction',
      doc: 'NoArgsDoc',
      inArgs: [],
      outArgs: [],
    }]
  }, {
    name: 'TestService2',
    pkgPath: 'service2/test',
    doc: 'TestService2Doc',
    methods: [{
      name: 'NamedFunction',
      doc: 'NamedFunctionDoc',
      inArgs: [{
        name: 'x',
        doc: 'xDoc',
        type: vom.Types.UINT32
      }, {
        name: 'y',
        doc: 'yDoc',
        type: vom.Types.STRING
      }, {
        name: 'z',
        doc: 'zDoc',
        type: vom.Types.Complex128
      }],
      outArgs: [{
        name: 'a',
        doc: 'aDoc',
        type: vom.Types.STRING
      }, {
        name: 'err',
        doc: 'errDoc',
        type: vom.Types.ERROR
      }]
    }]
  }, {
    name: 'TestService3',
    pkgPath: 'service3/test',
    doc: 'TestService3Doc',
    methods: [{
      name: 'StreamingFunction',
      doc: 'StreamingFunctionDoc',
      inArgs: [],
      outArgs: [{
        name: 'err',
        doc: 'errDoc',
        type: vom.Types.ERROR
      }],
      inStream: {
        type: vom.Types.UINT32
      },
      outStream: {
        type: vom.Types.INT32
      }
    }, {
      name: 'NamedFunction',
      doc: 'NamedFunctionDoc',
      inArgs: [{
        name: 'x',
        doc: 'xDoc',
        type: vom.Types.UINT32
      }, {
        name: 'y',
        doc: 'yDoc',
        type: vom.Types.ANY
      }, {
        name: 'z',
        doc: 'zDoc',
        type: vom.Types.Complex128
      }],
      outArgs: [{
        name: 'a',
        doc: 'aDoc',
        type: vom.Types.STRING
      }, {
        name: 'err',
        doc: 'errDoc',
        type: vom.Types.ERROR
      }]
    }]
  }];
  t.throws(function() {
    createSignatures(testService, descs);
  }, null, 'NamedFunction should not match');
  t.end();
});
