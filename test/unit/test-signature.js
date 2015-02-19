/**
 * @fileoverview Tests of signature generation.
 */

var test = require('prova');
var Signature = require('../../src/vdl/signature.js');
var vdl = require('../../src/vdl');

function TestService() {
    this.nonPrototypeFunction = function(ctx, a, $stream, b) {};
}

TestService.prototype.noArgsFunction = function(ctx) {};
TestService.prototype.namedFunction = function NamedFunc(ctx, x, y, z) {};

test('signature', function(t) {
    var testService = new TestService();

    var tests = [
        {
            name: 'No descriptor',
            desc: undefined,
            expected: { 'methods': [] }
        },
        {
            name: 'Name-only descriptor',
            desc: {
                methods: [
                    {
                        name: 'NonPrototypeFunction'
                    },
                    {
                        name: 'NoArgsFunction'
                    },
                    {
                        name: 'NamedFunction'
                    }
                ]
            },
            expected: {
                'methods': [
                    {
                        'name': 'NonPrototypeFunction',
                        'inArgs': [
                            {
                                'name': 'a',
                                'type': vdl.Types.JSVALUE
                            },
                            {
                                'name': 'b',
                                'type': vdl.Types.JSVALUE
                            }
                        ],
                        'outArgs': [
                          {
                            'type': vdl.Types.JSVALUE
                          }
                        ],
                        'inStream': {
                            'type': vdl.Types.JSVALUE
                        },
                        'outStream': {
                            'type': vdl.Types.JSVALUE
                        },
                    },
                    {
                        'name': 'NoArgsFunction',
                        'inArgs': [],
                        'outArgs': [
                            {
                                'type': vdl.Types.JSVALUE
                            }
                        ]
                    },
                    {
                        'name': 'NamedFunction',
                        'inArgs': [
                            {
                                'name': 'x',
                                'type': vdl.Types.JSVALUE
                            },
                            {
                                'name': 'y',
                                'type': vdl.Types.JSVALUE
                            },
                            {
                                'name': 'z',
                                'type': vdl.Types.JSVALUE
                            }
                        ],
                        'outArgs': [
                          {
                            'type': vdl.Types.JSVALUE
                          }
                        ]
                    },
                ]
            }
        },
        {
            name: 'Complete descriptor',
            desc: {
                'name': 'TestService',
                'pkgPath': 'service/test',
                'doc': 'TestServiceDoc',
                'embeds': [
                    {
                        'name': 'Embed1',
                        'pkgPath': 'path/to/embed1',
                        'doc': 'Embed1Doc'
                    },
                    {
                        'name': 'Embed2',
                        'pkgPath': 'path/to/embed2',
                        'doc': 'Embed2Doc'
                    }
                ],
                'methods': [
                    {
                        'name': 'NonPrototypeFunction',
                        'doc': 'NonPrototypeFunctionDoc',
                        'inArgs': [
                            {
                                'name': 'a',
                                'doc': 'aDoc',
                                'type': vdl.Types.UINT32
                            },
                            {
                                'name': 'b',
                                'doc': 'bDoc',
                                'type': vdl.Types.STRING
                            }
                        ],
                        'inStream': {
                            'type': vdl.Types.UINT32
                        },
                        'outStream': {
                            'type': vdl.Types.UINT32
                        },
                        'tags': [
                            {
                                val: 'aTag',
                                '_wrappedType': true,
                                '_type': {
                                    name: 'StringTag',
                                    kind: vdl.Kind.STRING
                                }
                            }
                        ]
                    },
                    {
                        'name': 'NoArgsFunction',
                        'doc': 'NoArgsFunctionDoc',
                        'outArgs': [
                            {
                                'name': 'first',
                                'doc': 'firstDoc',
                                'type': vdl.Types.INT16
                            },
                            {
                                'name': 'second',
                                'doc': 'secondDoc',
                                'type': vdl.Types.STRING
                            }
                        ]
                    },
                    {
                        'name': 'NamedFunction',
                        'doc': 'NamedFunctionDoc',
                        'inArgs': [
                            {
                                'name': 'x',
                                'doc': 'xDoc',
                                'type': vdl.Types.UINT32
                            },
                            {
                                'name': 'y',
                                'doc': 'yDoc',
                                'type': vdl.Types.STRING
                            },
                            {
                                'name': 'z',
                                'doc': 'zDoc',
                                'type': vdl.Types.STRING
                            }
                        ]
                    },
                ]
            },
            expected: {
                'name': 'TestService',
                'pkgPath': 'service/test',
                'doc': 'TestServiceDoc',
                'embeds': [
                    {
                        'name': 'Embed1',
                        'pkgPath': 'path/to/embed1',
                        'doc': 'Embed1Doc'
                    },
                    {
                        'name': 'Embed2',
                        'pkgPath': 'path/to/embed2',
                        'doc': 'Embed2Doc'
                    }
                ],
                'methods': [
                    {
                        'name': 'NonPrototypeFunction',
                        'doc': 'NonPrototypeFunctionDoc',
                        'inArgs': [
                            {
                                'name': 'a',
                                'doc': 'aDoc',
                                'type': vdl.Types.UINT32
                            },
                            {
                                'name': 'b',
                                'doc': 'bDoc',
                                'type': vdl.Types.STRING
                            }
                        ],
                        'outArgs': [
                          {
                            'type': vdl.Types.JSVALUE
                          }
                        ],
                        'inStream': {
                            'type': vdl.Types.UINT32
                        },
                        'outStream': {
                            'type': vdl.Types.UINT32
                        },
                        'tags': [
                            {
                                'val': 'aTag',
                                '_wrappedType': true,
                                '_type': {
                                    'name': 'StringTag',
                                    'kind': vdl.Kind.STRING
                                }
                            }
                        ]
                    },
                    {
                        'name': 'NoArgsFunction',
                        'doc': 'NoArgsFunctionDoc',
                        'inArgs': [],
                        'outArgs': [
                            {
                                'name': 'first',
                                'doc': 'firstDoc',
                                'type': vdl.Types.INT16
                            },
                            {
                                'name': 'second',
                                'doc': 'secondDoc',
                                'type': vdl.Types.STRING
                            }
                        ]
                    },
                    {
                        'name': 'NamedFunction',
                        'doc': 'NamedFunctionDoc',
                        'inArgs': [
                            {
                                'name': 'x',
                                'doc': 'xDoc',
                                'type': vdl.Types.UINT32
                            },
                            {
                                'name': 'y',
                                'doc': 'yDoc',
                                'type': vdl.Types.STRING
                            },
                            {
                                'name': 'z',
                                'doc': 'zDoc',
                                'type': vdl.Types.STRING
                            }
                        ],
                        'outArgs': [
                          {
                            'type': vdl.Types.JSVALUE
                          }
                        ]
                    },
                ]
            }
        },
        {
            name: 'Incompatible method descriptors',
            desc: {
                'methods': [
                    {
                        'name': 'NonexistingMethod',
                        'inArgs': []
                    },
                    {
                        'name': 'NonPrototypeFunction',
                        'inArgs': [
                            {
                                'name': 'a',
                                'type': vdl.Types.STRING
                            }
                        ]
                    },
                    {
                        'name': 'NamedFunction',
                        'inArgs': [
                            {
                                'name': 'x',
                                'type': vdl.Types.INT16
                            },
                            {
                                'name': 'SIGNATURENAME',
                                'type': vdl.Types.INT16
                            },
                            {
                                'name': 'z',
                                'type': vdl.Types.INT16
                            }
                        ],
                        'inStream': {
                            'type': vdl.Types.ANY
                        },
                        'outStream': {
                            'type': vdl.Types.STRING
                        }
                    }
                ]
            },
            expected: {
                'methods': [
                    {
                        'name': 'NonPrototypeFunction',
                        'inArgs': [
                            {
                                'name': 'a',
                                'type': vdl.Types.JSVALUE
                            },
                            {
                                'name': 'b',
                                'type': vdl.Types.JSVALUE
                            }
                        ],
                        'outArgs': [
                            {
                                'type': vdl.Types.JSVALUE
                            }
                        ],
                        'inStream': {
                            'type': vdl.Types.JSVALUE
                        },
                        'outStream': {
                            'type': vdl.Types.JSVALUE
                        }
                    },
                    {
                        'name': 'NamedFunction',
                        'inArgs': [
                            {
                                'name': 'x',
                                'type': vdl.Types.INT16
                            },
                            {
                                'name': 'SIGNATURENAME',
                                'type': vdl.Types.INT16
                            },
                            {
                                'name': 'z',
                                'type': vdl.Types.INT16
                            }
                        ],
                        'outArgs': [
                          {
                            'type': vdl.Types.JSVALUE
                          }
                        ],
                    }
                ]
            }
        }
    ];

    for (var i = 0; i< tests.length; i++) {
        var test = tests[i];

        var resultSig = new Signature(testService, test.desc);
        var stringifiedResult = vdl.Stringify(resultSig);

        var stringifiedExpected = vdl.Stringify(test.expected);

        t.equals(stringifiedResult, stringifiedExpected, test.name);
    }
    t.end();
});
