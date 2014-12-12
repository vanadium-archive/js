/**
 * @fileoverview Tests service invocation.
 */

var test = require('prova');
var Invoker = require('../../src/invocation/invoker.js');

function TestService() {
    this.a = function(a, $injectX, b, c, $injectY, d, $injectZ) {
        return ['A', a, $injectX, b, c, $injectY, d, $injectZ];
    };
}

var desc = {
    name: 'AName',
    pkgPath: 'APkgPath'
};

function testInvoker(t, testService) {
    t.plan(5);

    var invoker = new Invoker(testService, desc);

    // Normal call.
    invoker.invoke(
        'A',
        ['aVal', 'bVal', 'cVal', 'dVal'],
        {
            '$injectX': 'X',
            '$injectZ': 'Z'
        },
        function(err, res) {
            t.deepEquals(res,
                ['A', 'aVal', 'X', 'bVal', 'cVal', undefined, 'dVal', 'Z'],
                'Invocation out args match.');
        }
    );

    // Wrong number of args.
    invoker.invoke(
        'A',
        ['aVal', 'bVal', 'cVal'],
        {
            '$injectX': 'X',
            '$injectZ': 'Z'
        },
        function(err) {
            t.ok(err instanceof Error, 'wrong number of args - get error');
        }
    );

    // Invocation of undefined method.
    invoker.invoke('UndefinedMethod', [], {}, function(err) {
        t.ok(err instanceof Error, 'wrong number of args - undefined method');
    });

    // Signature. (just do a cursory check that nothing is wrong,
    // more in signature tests).
    var sig = invoker.signature();
    t.equals(sig[0].name, 'AName');
    t.deepEquals(
        sig[0].methods[0].inArgs.map(function(arg) { return arg.name; }),
        ['a', 'b', 'c', 'd'],
        'signature looks valid'
    );
}

test('Invoker', function(t) {
    testInvoker(t, new TestService());
});

test('Invoker supports functions on prototype chain', function(t) {
    function Service() {}
    Service.prototype = new TestService();
    testInvoker(t, new Service());
});