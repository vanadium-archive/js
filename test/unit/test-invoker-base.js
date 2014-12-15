/**
 * @fileoverview Tests the invoker and signature generation on the
 * vdl-generated testdata/base.js file.
 * This test is primarily to ensure that the vdl-generated format remains
 * compatible with that expected by the javascript signature generator.
 */

var test = require('prova');
var Invoker = require('../../src/invocation/invoker.js');
var vom = require('vom');
var base =
    require('../../src/veyron.io/veyron/veyron2/vdl/testdata/base/base');

function BasePartialImpl() {
}

BasePartialImpl.prototype.methodA3 = function($stream, a) {
    return ['methodA3', $stream, a];
};

BasePartialImpl.prototype.methodA4 = function($stream, a) {
};

BasePartialImpl.prototype.methodB1 = function(a, b) {
};

test('Invoker and signature for vdl-generated base.js',
    function(t) {
    var desc = new base.serviceDefs.ServiceB().signature();
    var invoker = new Invoker(new BasePartialImpl(), desc);

    invoker.invoke('MethodA3', ['a'], {$stream: 'stream'}, function(err, res) {
        t.deepEquals(res, ['methodA3', 'stream', 'a']);

        var scalarsType = new base.types.Scalars()._type;
        var compositesType = new base.types.Composites()._type;
        var compCompType = new base.types.CompComp()._type;

        var sig = invoker.signature();
        var expectedSig = [{
            'name': 'ServiceB',
            'pkgPath': 'veyron.io/veyron/veyron2/vdl/testdata/base',
            'doc': '',
            'embeds': [
                {
                    'name': 'ServiceA',
                    'pkgPath': 'veyron.io/veyron/veyron2/vdl/testdata/base',
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
                            'type': vom.Types.INT32
                        }
                    ],
                    'outArgs': [
                        {
                            'name': 's',
                            'doc': '',
                            'type': vom.Types.STRING
                        },
                        {
                            'name': 'err',
                            'doc': '',
                            'type': vom.Types.ERROR
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
                            val: new vom.BigInt(1, new Uint8Array([0x6]))
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
                            'type': vom.Types.INT32
                        }
                    ],
                    'outArgs': [
                        {
                            'name': '',
                            'doc': '',
                            'type': vom.Types.ERROR
                        }
                    ],
                    'inStream': {
                        'name': '',
                        'doc': '',
                        'type': vom.Types.INT32
                    },
                    'outStream': {
                        'name': '',
                        'doc': '',
                        'type': vom.Types.STRING
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
                        },
                        {
                            'name': 'err',
                            'doc': '',
                            'type': vom.Types.ERROR
                        }
                    ],
                    'tags': []
                }
            ]
        }];

        var expectedStr = vom.Stringify(expectedSig);
        var resultStr = vom.Stringify(sig);

        t.equals(resultStr, expectedStr);
        t.end();
    });
});