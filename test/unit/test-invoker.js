// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Tests the invoker and signature generation on the
 * vdl-generated testdata/base.js file.
 * This test is primarily to ensure that the vdl-generated format remains
 * compatible with that expected by the JavaScript signature generator.
 */

var test = require('tape');
var Invoker = require('../../src/invocation/invoker.js');
var Context = require('../../src/context').Context;
var vdl = require('../../src/vdl');
var stringify = require('../../src/vdl/stringify');
var base = require('../vdl-out/v.io/x/ref/lib/vdl/testdata/base');

function BasePartialImpl() {
}

BasePartialImpl.prototype.methodA3 = function(ctx, serverCall, $stream, a) {
    return ['methodA3', $stream, a];
};

BasePartialImpl.prototype.methodA4 = function(ctx, serverCall, $stream, a) {
  return;
};

BasePartialImpl.prototype.methodB1 = function(ctx, serverCall, a, b, cb) {
  cb(null);
};

test('Invoker and signature for vdl-generated base.js',
    function(t) {
    var impl = new BasePartialImpl();

    // We attach service description directly because we want to implement only
    // part of ServiceB. We check the generated signature and see that the
    // unimplemented methods were properly removed.
    // The alternative, BasePartialImpl.prototype = new base.ServiceB();
    // would not work because ServiceB has method stubs on its prototype.
    impl._serviceDescription = base.ServiceB.prototype._serviceDescription;
    var injections = {
      context: new Context(),
      stream: 'stream'
    };
    var invoker = new Invoker(impl);

    invoker.invoke('MethodA3', ['a'], injections, function(err, res) {
        t.error(err);
        t.deepEquals(res, [['methodA3', 'stream', 'a']]);

        var scalarsType = new base.Scalars()._type;
        var compositesType = new base.Composites()._type;
        var compCompType = new base.CompComp()._type;

        var sig = invoker.signature();
        var expectedSig = [{
            'name': 'ServiceB',
            'pkgPath': 'v.io/x/ref/lib/vdl/testdata/base',
            'doc': '',
            'embeds': [
                {
                    'name': 'ServiceA',
                    'pkgPath': 'v.io/x/ref/lib/vdl/testdata/base',
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
                            'type': vdl.types.INT32
                        }
                    ],
                    'outArgs': [
                        {
                            'name': 's',
                            'doc': '',
                            'type': vdl.types.STRING
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
                            'type': vdl.types.INT32
                        }
                    ],
                    'outArgs': [],
                    'inStream': {
                        'name': '',
                        'doc': '',
                        'type': vdl.types.INT32
                    },
                    'outStream': {
                        'name': '',
                        'doc': '',
                        'type': vdl.types.STRING
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
                    'inStream': null,
                    'outStream': null,
                    'tags': []
                }
            ]
        }];

        var expectedStr = stringify(expectedSig);
        var resultStr = stringify(sig);

        t.equals(resultStr, expectedStr);
        t.end();
    });
});
