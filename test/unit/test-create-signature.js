/**
 * @fileoverview Tests of generating signature with multiple descriptions
 */
var test = require('prova');
var createSignatures = require('../../src/vdl/create-signatures');

var vdl = require('../../src/vdl');

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
        'type': vdl.Types.JSVALUE
      }]
    }, {
      name: 'NamedFunction',
      inArgs: [{
        name: 'x',
        type: vdl.Types.JSVALUE
      }, {
        name: 'y',
        type: vdl.Types.JSVALUE
      }, {
        name: 'z',
        type: vdl.Types.JSVALUE
      }],
      outArgs: [{
        'type': vdl.Types.JSVALUE
      }]
    },{
      name: 'StreamingFunction',
      inArgs: [],
      outArgs: [{
        'type': vdl.Types.JSVALUE
      }],
      inStream: {
        type: vdl.Types.JSVALUE,
      },
      outStream: {
        type: vdl.Types.JSVALUE,
      }
    }]
  };
  var stringifiedResult = vdl.Stringify(sigs[0]);
  var stringifiedExpected = vdl.Stringify(expected);
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
        type: vdl.Types.UINT32
      }, {
        name: 'y',
        doc: 'yDoc',
        type: vdl.Types.STRING
      }, {
        name: 'z',
        doc: 'zDoc',
        type: vdl.Types.Complex128
      }],
      outArgs: [{
        name: 'a',
        doc: 'aDoc',
        type: vdl.Types.STRING
      }, {
        name: 'err',
        doc: 'errDoc',
        type: vdl.Types.ERROR
      }]
    }, {
      name: 'StreamingFunction',
      doc: 'StreamingFunctionDoc',
      inArgs: [],
      outArgs: [{
        name: 'err',
        doc: 'errDoc',
        type: vdl.Types.ERROR
      }],
      inStream: {
        type: vdl.Types.UINT32
      },
      outStream: {
        type: vdl.Types.INT32
      }
    }]
  };
  var sigs = createSignatures(testService, desc);
  t.equals(sigs.length, 1);
  var stringifiedResult = vdl.Stringify(sigs[0]);
  var stringifiedExpected = vdl.Stringify(desc);
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
        type: vdl.Types.UINT32
      }, {
        name: 'y',
        doc: 'yDoc',
        type: vdl.Types.STRING
      }, {
        name: 'z',
        doc: 'zDoc',
        type: vdl.Types.Complex128
      }],
      outArgs: [{
        name: 'a',
        doc: 'aDoc',
        type: vdl.Types.STRING
      }, {
        name: 'err',
        doc: 'errDoc',
        type: vdl.Types.ERROR
      }]
    }, {
      name: 'StreamingFunction',
      doc: 'StreamingFunctionDoc',
      inArgs: [],
      outArgs: [],
      inStream: {
        type: vdl.Types.UINT32
      },
      outStream: {
        type: vdl.Types.INT32
      }
    }]
  };
  var sigs = createSignatures(testService, desc);
  t.equals(sigs.length, 2);
  var stringifiedResult = vdl.Stringify(sigs[0]);
  var stringifiedExpected = vdl.Stringify(desc);
  t.equals(stringifiedResult, stringifiedExpected);

  var expectedExtra = {
    methods: [{
      name: 'NoArgsFunction',
      inArgs: [],
      outArgs: [{
        'type': vdl.Types.JSVALUE
      }]
    }]
  };
  var stringifiedResultExtra = vdl.Stringify(sigs[1]);
  var stringifiedExpectedExtra = vdl.Stringify(expectedExtra);
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
        type: vdl.Types.UINT32
      }, {
        name: 'y',
        doc: 'yDoc',
        type: vdl.Types.STRING
      }, {
        name: 'z',
        doc: 'zDoc',
        type: vdl.Types.Complex128
      }],
      outArgs: [{
        name: 'a',
        doc: 'aDoc',
        type: vdl.Types.STRING
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
      outArgs: [],
      inStream: {
        type: vdl.Types.UINT32
      },
      outStream: {
        type: vdl.Types.INT32
      }
    }]
  }];
  var sigs = createSignatures(testService, descs);
  t.equals(sigs.length, 3);
  var stringifiedResult = vdl.Stringify(sigs);
  var stringifiedExpected = vdl.Stringify(descs);
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
        type: vdl.Types.UINT32
      }, {
        name: 'y',
        doc: 'yDoc',
        type: vdl.Types.STRING
      }, {
        name: 'z',
        doc: 'zDoc',
        type: vdl.Types.Complex128
      }],
      outArgs: [{
        name: 'a',
        doc: 'aDoc',
        type: vdl.Types.STRING
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
      outArgs: [],
      inStream: {
        type: vdl.Types.UINT32
      },
      outStream: {
        type: vdl.Types.INT32
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
        'type': vdl.Types.JSVALUE
      }]
    }]
  }]);
  var stringifiedResult = vdl.Stringify(sigs);
  var stringifiedExpected = vdl.Stringify(expectedDescs);
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
        type: vdl.Types.UINT32
      }, {
        name: 'y',
        doc: 'yDoc',
        type: vdl.Types.STRING
      }, {
        name: 'z',
        doc: 'zDoc',
        type: vdl.Types.Complex128
      }],
      outArgs: [{
        name: 'a',
        doc: 'aDoc',
        type: vdl.Types.STRING
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
        type: vdl.Types.UINT32
      }, {
        name: 'y',
        doc: 'yDoc',
        type: vdl.Types.STRING
      }, {
        name: 'z',
        doc: 'zDoc',
        type: vdl.Types.Complex128
      }],
      outArgs: [{
        name: 'a',
        doc: 'aDoc',
        type: vdl.Types.STRING
      }]
    }, {
      name: 'StreamingFunction',
      doc: 'StreamingFunctionDoc',
      inArgs: [],
      outArgs: [],
      inStream: {
        type: vdl.Types.UINT32
      },
      outStream: {
        type: vdl.Types.INT32
      }
    }]
  }];
  var sigs = createSignatures(testService, descs);
  t.equals(sigs.length, 3);
  var stringifiedResult = vdl.Stringify(sigs);
  var stringifiedExpected = vdl.Stringify(descs);
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
        type: vdl.Types.UINT32
      }, {
        name: 'y',
        doc: 'yDoc',
        type: vdl.Types.STRING
      }, {
        name: 'z',
        doc: 'zDoc',
        type: vdl.Types.Complex128
      }],
      outArgs: [{
        name: 'a',
        doc: 'aDoc',
        type: vdl.Types.STRING
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
      outArgs: [],
      inStream: {
        type: vdl.Types.UINT32
      },
      outStream: {
        type: vdl.Types.INT32
      }
    }, {
      name: 'NamedFunction',
      doc: 'NamedFunctionDoc',
      inArgs: [{
        name: 'x',
        doc: 'xDoc',
        type: vdl.Types.UINT32
      }, {
        name: 'y',
        doc: 'yDoc',
        type: vdl.Types.ANY
      }, {
        name: 'z',
        doc: 'zDoc',
        type: vdl.Types.Complex128
      }],
      outArgs: [{
        name: 'a',
        doc: 'aDoc',
        type: vdl.Types.STRING
      }]
    }]
  }];
  t.throws(function() {
    createSignatures(testService, descs);
  }, null, 'NamedFunction should not match');
  t.end();
});
