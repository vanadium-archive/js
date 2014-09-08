/**
 * @fileoverview Tests for type_util.js
 */

var test = require('prova');

var stringify = require('./stringify.js');

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

  var tests = [
    {
      input: 1,
      expected: '1'
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
      input: ['x', 'y'],
      expected: '{"0":"x","1":"y"}'
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
      input: recursiveA,
      expected: '{"x":5,"y":ID[0]}'
    },
    {
      input: recursiveDependent,
      expected: '{"rec":{"c":{"b":ID[1],"p":10},"q":9}}'
    }
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    var resultStr = stringify(test.input);
    t.equals(resultStr, test.expected);
  }
  t.end();
});