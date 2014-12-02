/**
 * @fileoverview Tests of signature generation.
 */

var test = require('prova');
var Signature = require('../../src/vdl/signature.js');
var vom = require('vom');

function TestService() {
    this.nonPrototypeFunction = function(a, $stream, b) {};
}

TestService.prototype.noArgsFunction = function() {};
TestService.prototype.namedFunction = function NamedFunc(x, $a, y, z, $b) {};

test('signature', function(t) {
    var testService = new TestService();

    var tests = [
        {
            name: 'No descriptor',
            desc: undefined,
            expected: {
                'methods': [
                    {
                        'name': 'NonPrototypeFunction',
                        'inArgs': [
                            {
                                'name': 'a'
                            },
                            {
                                'name': 'b'
                            }
                        ],
                        'outArgs': [
                            {
                                'type': vom.Types.ANY
                            },
                            {
                                'type': vom.Types.ERROR
                            }
                        ],
                        'hasInStreamHACK': true,
                        'hasOutStreamHACK': true
                    },
                    {
                        'name': 'NoArgsFunction',
                        'inArgs': [],
                        'outArgs': [
                            {
                                'type': vom.Types.ANY
                            },
                            {
                                'type': vom.Types.ERROR
                            }
                        ],
                        'hasInStreamHACK': false,
                        'hasOutStreamHACK': false
                    },
                    {
                        'name': 'NamedFunction',
                        'inArgs': [
                            {
                                'name': 'x'
                            },
                            {
                                'name': 'y'
                            },
                            {
                                'name': 'z'
                            }
                        ],
                        'outArgs': [
                            {
                                'type': vom.Types.ANY
                            },
                            {
                                'type': vom.Types.ERROR
                            }
                        ],
                        'hasInStreamHACK': false,
                        'hasOutStreamHACK': false
                    }
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
                                'type': vom.Types.UINT32
                            },
                            {
                                'name': 'b',
                                'doc': 'bDoc',
                                'type': vom.Types.STRING
                            }
                        ],
                        'inStreamHACK': {
                            'type': vom.Types.UINT32
                        },
                        'hasInStreamHACK': true,
                        'outStreamHACK': {
                            'type': vom.Types.UINT32
                        },
                        'hasOutStreamHACK': true,
                        'tags': [
                            {
                                val: 'aTag',
                                '_wrappedType': true,
                                '_type': {
                                    name: 'StringTag',
                                    kind: vom.Kind.STRING
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
                                'type': vom.Types.INT16
                            },
                            {
                                'name': 'second',
                                'doc': 'secondDoc',
                                'type': vom.Types.STRING
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
                                'type': vom.Types.UINT32
                            },
                            {
                                'name': 'y',
                                'doc': 'yDoc',
                                'type': vom.Types.STRING
                            },
                            {
                                'name': 'z',
                                'doc': 'zDoc',
                                'type': vom.Types.STRING
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
                                'type': vom.Types.UINT32
                            },
                            {
                                'name': 'b',
                                'doc': 'bDoc',
                                'type': vom.Types.STRING
                            }
                        ],
                        'outArgs': [
                          {
                            'type': vom.Types.ANY
                          },
                          {
                            'type': vom.Types.ERROR
                          }
                        ],
                        'inStreamHACK': {
                            'type': vom.Types.UINT32
                        },
                        'hasInStreamHACK': true,
                        'outStreamHACK': {
                            'type': vom.Types.UINT32
                        },
                        'hasOutStreamHACK': true,
                        'tags': [
                            {
                                'val': 'aTag',
                                '_wrappedType': true,
                                '_type': {
                                    'name': 'StringTag',
                                    'kind': vom.Kind.STRING
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
                                'type': vom.Types.INT16
                            },
                            {
                                'name': 'second',
                                'doc': 'secondDoc',
                                'type': vom.Types.STRING
                            }
                        ],
                        'hasInStreamHACK': false,
                        'hasOutStreamHACK': false
                    },
                    {
                        'name': 'NamedFunction',
                        'doc': 'NamedFunctionDoc',
                        'inArgs': [
                            {
                                'name': 'x',
                                'doc': 'xDoc',
                                'type': vom.Types.UINT32
                            },
                            {
                                'name': 'y',
                                'doc': 'yDoc',
                                'type': vom.Types.STRING
                            },
                            {
                                'name': 'z',
                                'doc': 'zDoc',
                                'type': vom.Types.STRING
                            }
                        ],
                        'outArgs': [
                          {
                            'type': vom.Types.ANY
                          },
                          {
                            'type': vom.Types.ERROR
                          }
                        ],
                        'hasInStreamHACK': false,
                        'hasOutStreamHACK': false
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
                                'type': vom.Types.STRING
                            }
                        ]
                    },
                    {
                        'name': 'NamedFunction',
                        'inArgs': [
                            {
                                'name': 'x',
                                'type': vom.Types.INT16
                            },
                            {
                                'name': 'WRONGNAME',
                                'type': vom.Types.INT16
                            },
                            {
                                'name': 'z',
                                'type': vom.Types.INT16
                            }
                        ]
                    }
                ]
            },
            expected: {
                'methods': [
                    {
                        'name': 'NonPrototypeFunction',
                        'inArgs': [
                            {
                                'name': 'a'
                            },
                            {
                                'name': 'b'
                            }
                        ],
                        'outArgs': [
                            {
                                'type': vom.Types.ANY
                            },
                            {
                                'type': vom.Types.ERROR
                            }
                        ],
                        'hasInStreamHACK': true,
                        'hasOutStreamHACK': true
                    },
                    {
                        'name': 'NoArgsFunction',
                        'inArgs': [],
                        'outArgs': [
                            {
                                'type': vom.Types.ANY
                            },
                            {
                                'type': vom.Types.ERROR
                            }
                        ],
                        'hasInStreamHACK': false,
                        'hasOutStreamHACK': false
                    },
                    {
                        'name': 'NamedFunction',
                        'inArgs': [
                            {
                                'name': 'x'
                            },
                            {
                                'name': 'y'
                            },
                            {
                                'name': 'z'
                            }
                        ],
                        'outArgs': [
                            {
                                'type': vom.Types.ANY
                            },
                            {
                                'type': vom.Types.ERROR
                            }
                        ],
                        'hasInStreamHACK': false,
                        'hasOutStreamHACK': false
                    }
                ]
            }
        }
    ];

    for (var i = 0; i< tests.length; i++) {
        var test = tests[i];

        var resultSig = new Signature(testService, test.desc);
        var stringifiedResult = vom.Stringify(resultSig);

        var stringifiedExpected = vom.Stringify(test.expected);

        t.equals(stringifiedResult, stringifiedExpected, test.name);
    }
    t.end();
});