/**
 * @fileoverview Tests of recursive extend.
 */

var test = require('prova');
var argHelper = require('../../src/lib/arg_helper.js');

var func = function(a, b, $inject1, c, d, $inject2) {};

test('getArgumentNamesFromFunction()', function(t) {
    var expect = ['a', 'b', '$inject1', 'c', 'd', '$inject2'];
    var got = argHelper.getArgumentNamesFromFunction(func);
    t.deepEquals(expect, got);
    t.end();
});

test('getFunctionArgs()', function(t) {
    var expect = ['a', 'b', 'c', 'd'];
    var got = argHelper.getFunctionArgs(func);
    t.deepEquals(expect, got);
    t.end();
});

test('getFunctionInjections()', function(t) {
    var expect = ['$inject1', '$inject2'];
    var got = argHelper.getFunctionInjections(func);
    t.deepEquals(expect, got);
    t.end();
});

test('getInjectionPositions()', function(t) {
    var expect = {
        '$inject1': 2,
        '$inject2': 5
    };
    var got = argHelper.getInjectionPositions(func);
    t.deepEquals(expect, got);
    t.end();
});

test('getArgOffsets()', function(t) {
    var expect = [
        0, 1, 3, 4
    ];
    var got = argHelper.getArgOffsets(func);
    t.deepEquals(expect, got);
    t.end();
});