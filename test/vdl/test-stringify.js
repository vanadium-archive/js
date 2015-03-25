// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Tests for stringify.js
 */

var test = require('prova');

var stringify = require('./../../src/vdl/stringify.js');

test('stableCircularStringify', function(t) {
  var recursiveA = {
    x: 5
  };
  recursiveA.y = recursiveA;

  var recursiveB = {
    q: 9
  };
  var recursiveC = {
    p: 10
  };
  recursiveB.c = recursiveC;
  recursiveC.b = recursiveB;
  var recursiveDependent = {
    rec: recursiveB
  };

  // A repeated identical object shouldn't be replaced by references.
  var repeatedObject = {
    a: 5
  };

  var tests = [
    {
      input: 1,
      expected: '1'
    },
    {
      input: 4.0,
      expected: '4'
    },
    {
      input: true,
      expected: 'true'
    },
    {
      input: 'ok',
      expected: '"ok"'
    },
    {
      input: {
        'c': 'b',
        'a': 'd'
      },
      expected: '{"a":"d","c":"b"}'
    },
    {
      input: new Set([3, 5, 7]),
      expected: '{3:true,5:true,7:true}'
    },
    {
      input: new Set([[], [2], [2]]),
      expected: '{[]:true,[2]:true,[2]:true}'
    },
    {
      input: new Map([['a', 5], [3, 'we']]),
      expected: '{3:"we","a":5}'
    },
    {
      input: ['x', 'y'],
      expected: '["x","y"]'
    },
    {
      input: {
        'c': 'b',
        'b' : {
          'x': 8
        },
        'a': 'd'
      },
      expected: '{"a":"d","b":{"x":8},"c":"b"}'
    },
    {
      input: [
        new Set([{}, null]),
        new Map([
          [[3, 1], 70],
          ['a', { 'ax': 5 }]
        ])
      ],
      expected: '[{{}:true,null:true},{[3,1]:70,"a":{"ax":5}}]'
    },
    {
      input: recursiveA,
      expected: '{"x":5,"y":ID[0]}'
    },
    {
      input: recursiveDependent,
      expected: '{"rec":{"c":{"b":ID[1],"p":10},"q":9}}'
    },
    {
      input: [
        repeatedObject, repeatedObject
      ],
      expected: '[{"a":5},{"a":5}]'
    }
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    var resultStr = stringify(test.input);
    t.equals(resultStr, test.expected);
  }
  t.end();
});
