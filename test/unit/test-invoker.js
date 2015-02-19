/**
 * @fileoverview Tests the invoker and signature generation on the
 * vdl-generated testdata/base.js file.
 * This test is primarily to ensure that the vdl-generated format remains
 * compatible with that expected by the javascript signature generator.
 */

var test = require('prova');
var Invoker = require('../../src/invocation/invoker.js');
var Context = require('../../src/runtime/context').Context;
var vdl = require('../../src/vdl');
var base = require('../vdl-out/v.io/core/veyron2/vdl/testdata/base');

function BasePartialImpl() {
}

BasePartialImpl.prototype.methodA3 = function(context, $stream, a) {
    return ['methodA3', $stream, a];
};

BasePartialImpl.prototype.methodA4 = function(context, $stream, a) {
};

BasePartialImpl.prototype.methodB1 = function(context, a, b) {
};

test('Invoker and signature for vdl-generated base.js',
    function(t) {
    var impl = new BasePartialImpl();
    impl._serviceDescription = base.ServiceB.
                               prototype._serviceDescription;
    var injections = {
      context: new Context(),
      stream: 'stream'
    };
    var invoker = new Invoker(impl);

    invoker.invoke('MethodA3', ['a'], injections, function(err, res) {
        t.deepEquals(res, [['methodA3', 'stream', 'a']]);

        var scalarsType = new base.Scalars()._type;
        var compositesType = new base.Composites()._type;
        var compCompType = new base.CompComp()._type;

        var sig = invoker.signature();
        var expectedSig = [{
            'name': 'ServiceB',
            'pkgPath': 'v.io/core/veyron2/vdl/testdata/base',
            'doc': '',
            'embeds': [
                {
                    'name': 'ServiceA',
                    'pkgPath': 'v.io/core/veyron2/vdl/testdata/base',
                    'doc': ''
                }
            ],
            'methods': [
                {
                    'name': 'MethodA3',
                    'doc': '',
                    'inArgs': [
                        {
                            'name': 'a',
                            'doc': '',
                            'type': vdl.Types.INT32
                        }
                    ],
                    'outArgs': [
                        {
                            'name': 's',
                            'doc': '',
                            'type': vdl.Types.STRING
                        }
                    ],
                    'inStream': null,
                    'outStream': {
                        'name': '',
                        'doc': '',
                        'type': scalarsType
                    },
                    'tags': [
                        {
                            val: 'tag'
                        },
                        {
                            val: new vdl.BigInt(1, new Uint8Array([0x6]))
                        }
                    ]
                },
                {
                    'name': 'MethodA4',
                    'doc': '',
                    'inArgs': [
                        {
                            'name': 'a',
                            'doc': '',
                            'type': vdl.Types.INT32
                        }
                    ],
                    'outArgs': [],
                    'inStream': {
                        'name': '',
                        'doc': '',
                        'type': vdl.Types.INT32
                    },
                    'outStream': {
                        'name': '',
                        'doc': '',
                        'type': vdl.Types.STRING
                    },
                    'tags': []
                },
                {
                    'name': 'MethodB1',
                    'doc': '',
                    'inArgs': [
                        {
                            'name': 'a',
                            'doc': '',
                            'type': scalarsType
                        },
                        {
                            'name': 'b',
                            'doc': '',
                            'type': compositesType
                        }
                    ],
                    'outArgs': [
                        {
                            'name': 'c',
                            'doc': '',
                            'type': compCompType
                        }
                    ],
                    'tags': []
                }
            ]
        }];

        var expectedStr = vdl.Stringify(expectedSig);
        var resultStr = vdl.Stringify(sig);

        t.equals(resultStr, expectedStr);
        t.end();
    });
});
