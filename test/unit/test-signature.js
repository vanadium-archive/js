// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Tests of signature generation.
 */

var test = require('prova');
var Signature = require('../../src/vdl/signature.js');
var vdl = require('../../src/vdl');
var stringify = require('../../src/vdl/stringify');

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
            name: 'NonPrototypeFunction',
            doc: '',
            inArgs: [
              {
                name: 'a',
                doc: '',
                type: vdl.Types.JSVALUE
              },
              {
                name: 'b',
                doc: '',
                type: vdl.Types.JSVALUE
              }
            ],
            outArgs: [
              {
                name: '',
                doc: '',
                type: vdl.Types.JSVALUE
              }
            ],
            inStream: {
              name: '',
              doc: '',
              type: vdl.Types.JSVALUE
            },
            outStream: {
              name: '',
              doc: '',
              type: vdl.Types.JSVALUE
            },
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
                type: vdl.Types.JSVALUE
              }
            ],
            inStream: null,
            outStream: null,
            tags: []
          },
          {
            name: 'NamedFunction',
            doc: '',
            inArgs: [
              {
                name: 'x',
                doc: '',
                type: vdl.Types.JSVALUE
              },
              {
                name: 'y',
                doc: '',
                type: vdl.Types.JSVALUE
              },
              {
                name: 'z',
                doc: '',
                type: vdl.Types.JSVALUE
              }
            ],
            outArgs: [
              {
                name: '',
                doc: '',
                type: vdl.Types.JSVALUE
              }
            ],
            inStream: null,
            outStream: null,
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
                type: vdl.Types.UINT32
              },
              {
                name: 'b',
                doc: 'bDoc',
                type: vdl.Types.STRING
              }
            ],
            inStream: {
              type: vdl.Types.UINT32
            },
            outStream: {
              type: vdl.Types.UINT32
            },
            tags: [
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
            name: 'NoArgsFunction',
            doc: 'NoArgsFunctionDoc',
            outArgs: [
              {
                name: 'first',
                doc: 'firstDoc',
                type: vdl.Types.INT16
              },
              {
                name: 'second',
                doc: 'secondDoc',
                type: vdl.Types.STRING
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
                type: vdl.Types.UINT32
              },
              {
                name: 'y',
                doc: 'yDoc',
                type: vdl.Types.STRING
              },
              {
                name: 'z',
                doc: 'zDoc',
                type: vdl.Types.STRING
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
            name: 'NonPrototypeFunction',
            doc: 'NonPrototypeFunctionDoc',
            inArgs: [
              {
                name: 'a',
                doc: 'aDoc',
                type: vdl.Types.UINT32
              },
              {
                name: 'b',
                doc: 'bDoc',
                type: vdl.Types.STRING
              }
            ],
            outArgs: [
              {
                name: '',
                doc: '',
                type: vdl.Types.JSVALUE
              }
            ],
            inStream: {
              name: '',
              doc: '',
              type: vdl.Types.UINT32
            },
            outStream: {
              name: '',
              doc: '',
              type: vdl.Types.UINT32
            },
            tags: [
              {
                val: 'aTag',
              }
            ]
          },
          {
            name: 'NoArgsFunction',
            doc: 'NoArgsFunctionDoc',
            inArgs: [],
            outArgs: [
              {
                name: 'first',
                doc: 'firstDoc',
                type: vdl.Types.INT16
              },
              {
                name: 'second',
                doc: 'secondDoc',
                type: vdl.Types.STRING
              }
            ],
            inStream: null,
            outStream: null,
            tags: []
          },
          {
            name: 'NamedFunction',
            doc: 'NamedFunctionDoc',
            inArgs: [
              {
                name: 'x',
                doc: 'xDoc',
                type: vdl.Types.UINT32
              },
              {
                name: 'y',
                doc: 'yDoc',
                type: vdl.Types.STRING
              },
              {
                name: 'z',
                doc: 'zDoc',
                type: vdl.Types.STRING
              }
            ],
            outArgs: [
              {
                name: '',
                doc: '',
                type: vdl.Types.JSVALUE
              }
            ],
            inStream: null,
            outStream: null,
            tags: []
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
                type: vdl.Types.STRING
              }
            ]
          },
          {
            name: 'NamedFunction',
            inArgs: [
              {
                name: 'x',
                doc: '',
                type: vdl.Types.INT16
              },
              {
                name: 'SIGNATURENAME',
                type: vdl.Types.INT16
              },
              {
                name: 'z',
                type: vdl.Types.INT16
              }
            ],
            inStream: {
              type: vdl.Types.ANY
            },
            outStream: {
              type: vdl.Types.STRING
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
            name: 'NonPrototypeFunction',
            doc: '',
            inArgs: [
              {
                name: 'a',
                doc: '',
                type: vdl.Types.JSVALUE
              },
              {
                name: 'b',
                doc: '',
                type: vdl.Types.JSVALUE
              }
            ],
            outArgs: [
              {
                name: '',
                doc: '',
                type: vdl.Types.JSVALUE
              }
            ],
            inStream: {
              name: '',
              doc: '',
              type: vdl.Types.JSVALUE
            },
            outStream: {
              name: '',
              doc: '',
              type: vdl.Types.JSVALUE
            },
            tags: []
          },
          {
            name: 'NamedFunction',
            doc: '',
            inArgs: [
              {
                name: 'x',
                doc: '',
                type: vdl.Types.INT16
              },
              {
                name: 'SIGNATURENAME',
                doc: '',
                type: vdl.Types.INT16
              },
              {
                name: 'z',
                doc: '',
                type: vdl.Types.INT16
              }
            ],
            outArgs: [
              {
                name: '',
                doc: '',
                type: vdl.Types.JSVALUE
              }
            ],
            inStream: null,
            outStream: null,
            tags: []
          }
        ]
      }
    }
  ];

  for (var i = 0; i< tests.length; i++) {
    var test = tests[i];

    var resultSig = new Signature(testService, test.desc);
    var stringifiedResult = stringify(resultSig);
    var stringifiedExpected = stringify(test.expected);

    t.equals(stringifiedResult, stringifiedExpected, test.name);
  }
  t.end();
});
