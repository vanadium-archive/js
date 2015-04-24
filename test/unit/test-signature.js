// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Tests of signature generation.
 */

var test = require('prova');
var Interface = require('../../src/vdl/interface');
var vdl = require('../../src/vdl');
var stringify = require('../../src/vdl/stringify');

function TestService() {
  this.nonPrototypeFunction = function(ctx, serverCall, a, $stream, b) {};
}

TestService.prototype.noArgsFunction = function(ctx, serverCall) {};
TestService.prototype.namedFunction = function NamedFunc(ctx, serverCall, x,
                                                         y, z) {};

test('signature', function(t) {
  var testService = new TestService();

  var tests = [
    {
      name: 'No descriptor',
      desc: undefined,
      expected: {
        methods: [],
        name: '',
        doc: '',
        embeds: [],
        pkgPath: ''
      }
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
        name: '',
        doc: '',
        embeds: [],
        pkgPath: '',
        methods: [
          {
            name: 'NamedFunction',
            doc: '',
            inArgs: [
              {
                name: 'x',
                doc: '',
                type: vdl.types.JSVALUE
              },
              {
                name: 'y',
                doc: '',
                type: vdl.types.JSVALUE
              },
              {
                name: 'z',
                doc: '',
                type: vdl.types.JSVALUE
              }
            ],
            outArgs: [
              {
                name: '',
                doc: '',
                type: vdl.types.JSVALUE
              }
            ],
            inStream: null,
            outStream: null,
            tags: []
          },
          {
            name: 'NoArgsFunction',
            doc: '',
            inArgs: [],
            outArgs: [
              {
                name: '',
                doc: '',
                type: vdl.types.JSVALUE
              }
            ],
            inStream: null,
            outStream: null,
            tags: []
          },
          {
            name: 'NonPrototypeFunction',
            doc: '',
            inArgs: [
              {
                name: 'a',
                doc: '',
                type: vdl.types.JSVALUE
              },
              {
                name: 'b',
                doc: '',
                type: vdl.types.JSVALUE
              }
            ],
            outArgs: [
              {
                name: '',
                doc: '',
                type: vdl.types.JSVALUE
              }
            ],
            inStream: {
              name: '',
              doc: '',
              type: vdl.types.JSVALUE
            },
            outStream: {
              name: '',
              doc: '',
              type: vdl.types.JSVALUE
            },
            tags: []
          },
        ]
      }
    },
    {
      name: 'Complete descriptor',
      desc: {
        name: 'TestService',
        pkgPath: 'service/test',
        doc: 'TestServiceDoc',
        embeds: [
          {
            name: 'Embed1',
            pkgPath: 'path/to/embed1',
            doc: 'Embed1Doc'
          },
          {
            name: 'Embed2',
            pkgPath: 'path/to/embed2',
            doc: 'Embed2Doc'
          }
        ],
        methods: [
          {
            name: 'NonPrototypeFunction',
            doc: 'NonPrototypeFunctionDoc',
            inArgs: [
              {
                name: 'a',
                doc: 'aDoc',
                type: vdl.types.UINT32
              },
              {
                name: 'b',
                doc: 'bDoc',
                type: vdl.types.STRING
              }
            ],
            inStream: {
              type: vdl.types.UINT32
            },
            outStream: {
              type: vdl.types.UINT32
            },
            tags: [
              {
                val: 'aTag',
                '_wrappedType': true,
                '_type': {
                  name: 'StringTag',
                  kind: vdl.kind.STRING
                }
              }
            ]
          },
          {
            name: 'NoArgsFunction',
            doc: 'NoArgsFunctionDoc',
            outArgs: [
              {
                name: 'first',
                doc: 'firstDoc',
                type: vdl.types.INT16
              },
              {
                name: 'second',
                doc: 'secondDoc',
                type: vdl.types.STRING
              }
            ]
          },
          {
            name: 'NamedFunction',
            doc: 'NamedFunctionDoc',
            inArgs: [
              {
                name: 'x',
                doc: 'xDoc',
                type: vdl.types.UINT32
              },
              {
                name: 'y',
                doc: 'yDoc',
                type: vdl.types.STRING
              },
              {
                name: 'z',
                doc: 'zDoc',
                type: vdl.types.STRING
              }
            ]
          },
        ]
      },
      expected: {
        name: 'TestService',
        pkgPath: 'service/test',
        doc: 'TestServiceDoc',
        embeds: [
          {
            name: 'Embed1',
            pkgPath: 'path/to/embed1',
            doc: 'Embed1Doc'
          },
          {
            name: 'Embed2',
            pkgPath: 'path/to/embed2',
            doc: 'Embed2Doc'
          }
        ],
        methods: [
          {
            name: 'NamedFunction',
            doc: 'NamedFunctionDoc',
            inArgs: [
              {
                name: 'x',
                doc: 'xDoc',
                type: vdl.types.UINT32
              },
              {
                name: 'y',
                doc: 'yDoc',
                type: vdl.types.STRING
              },
              {
                name: 'z',
                doc: 'zDoc',
                type: vdl.types.STRING
              }
            ],
            outArgs: [
              {
                name: '',
                doc: '',
                type: vdl.types.JSVALUE
              }
            ],
            inStream: null,
            outStream: null,
            tags: []
          },
          {
            name: 'NoArgsFunction',
            doc: 'NoArgsFunctionDoc',
            inArgs: [],
            outArgs: [
              {
                name: 'first',
                doc: 'firstDoc',
                type: vdl.types.INT16
              },
              {
                name: 'second',
                doc: 'secondDoc',
                type: vdl.types.STRING
              }
            ],
            inStream: null,
            outStream: null,
            tags: []
          },
          {
            name: 'NonPrototypeFunction',
            doc: 'NonPrototypeFunctionDoc',
            inArgs: [
              {
                name: 'a',
                doc: 'aDoc',
                type: vdl.types.UINT32
              },
              {
                name: 'b',
                doc: 'bDoc',
                type: vdl.types.STRING
              }
            ],
            outArgs: [
              {
                name: '',
                doc: '',
                type: vdl.types.JSVALUE
              }
            ],
            inStream: {
              name: '',
              doc: '',
              type: vdl.types.UINT32
            },
            outStream: {
              name: '',
              doc: '',
              type: vdl.types.UINT32
            },
            tags: [
              {
                val: 'aTag',
              }
            ]
          },
        ]
      }
    },
    {
      name: 'Incompatible method descriptors',
      desc: {
        methods: [
          {
            name: 'NonexistingMethod',
            inArgs: []
          },
          {
            name: 'NonPrototypeFunction',
            inArgs: [
              {
                name: 'a',
                type: vdl.types.STRING
              }
            ]
          },
          {
            name: 'NamedFunction',
            inArgs: [
              {
                name: 'x',
                doc: '',
                type: vdl.types.INT16
              },
              {
                name: 'SIGNATURENAME',
                type: vdl.types.INT16
              },
              {
                name: 'z',
                type: vdl.types.INT16
              }
            ],
            inStream: {
              type: vdl.types.ANY
            },
            outStream: {
              type: vdl.types.STRING
            }
          }
        ]
      },
      expected: {
        name: '',
        doc: '',
        embeds: [],
        pkgPath: '',
        methods: [
          {
            name: 'NamedFunction',
            doc: '',
            inArgs: [
              {
                name: 'x',
                doc: '',
                type: vdl.types.INT16
              },
              {
                name: 'SIGNATURENAME',
                doc: '',
                type: vdl.types.INT16
              },
              {
                name: 'z',
                doc: '',
                type: vdl.types.INT16
              }
            ],
            outArgs: [
              {
                name: '',
                doc: '',
                type: vdl.types.JSVALUE
              }
            ],
            inStream: null,
            outStream: null,
            tags: []
          },
          {
            name: 'NonPrototypeFunction',
            doc: '',
            inArgs: [
              {
                name: 'a',
                doc: '',
                type: vdl.types.JSVALUE
              },
              {
                name: 'b',
                doc: '',
                type: vdl.types.JSVALUE
              }
            ],
            outArgs: [
              {
                name: '',
                doc: '',
                type: vdl.types.JSVALUE
              }
            ],
            inStream: {
              name: '',
              doc: '',
              type: vdl.types.JSVALUE
            },
            outStream: {
              name: '',
              doc: '',
              type: vdl.types.JSVALUE
            },
            tags: []
          },
        ]
      }
    }
  ];

  for (var i = 0; i< tests.length; i++) {
    var test = tests[i];

    var resultSig = new Interface(testService, test.desc);
    var stringifiedResult = stringify(resultSig);
    var stringifiedExpected = stringify(test.expected);

    t.equals(stringifiedResult, stringifiedExpected, test.name);
  }
  t.end();
});
