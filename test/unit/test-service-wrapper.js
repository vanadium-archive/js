/**
 * @fileoverview Tests service wrapping and invocation.
 */

var test = require('prova');
var wrap = require('../../src/invocation/wrapper.js');

function TestService() {
    this.a = function(a, $injectX, b, c, $injectY, d, $injectZ) {
        return ['A', a, $injectX, b, c, $injectY, d, $injectZ];
    };
}

var desc = {
    name: 'AName',
    pkgPath: 'APkgPath'
};

function testWrappedService(t, testService) {
    var wrappedService = wrap(testService, desc);

    t.equals(Object.keys(wrappedService).length, 2);

    // Normal call.
    var res = wrappedService.a(
        ['aVal', 'bVal', 'cVal', 'dVal'],
        {
            '$injectX': 'X',
            '$injectZ': 'Z'
        }
    );
    t.deepEquals(res,
        ['A', 'aVal', 'X', 'bVal', 'cVal', undefined, 'dVal', 'Z']);

    // Wrong number of args.
    t.throws(function() {
        wrappedService.A(
            ['aVal', 'bVal', 'cVal'],
            {
                '$injectX': 'X',
                '$injectZ': 'Z'
            }
        );
    });

    // Signature. (just do a cursory check that nothing is wrong,
    // more in signature tests).
    var sig = wrappedService.signature();
    t.equals(sig.name, 'AName');
    t.deepEquals(
        sig.methods[0].inArgs.map(function(arg) { return arg.name; }),
        ['a', 'b', 'c', 'd']
    );

    t.end();
}

test('Service Wrapper', function(t) {
    testWrappedService(t, new TestService());
});

test('ServiceWrapper supports functions on prototype chain', function(t) {
    function Service() {}
    Service.prototype = new TestService();
    testWrappedService(t, new Service());
});

test('If service defines sig, it is used instead of generated sig',
    function(t) {
    var customSignatureService = {
        signature: function() {
            return 'custom signature';
        }
    };

    var wrappedService = wrap(customSignatureService);
    t.equals(Object.keys(wrappedService).length, 1);
    t.equals(wrappedService.signature([], {}), 'custom signature');
    t.end();
});