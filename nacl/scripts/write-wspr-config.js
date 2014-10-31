#!/usr/bin/env node

var path = require('path');
var fs = require('fs');

// HACK!!
// TODO(ataly, ashankar, bprosnitz): Get rid of the config entry for
// private key. Ideally, the private key would be generated/retrieved
// within WSPR-nacl by directly talking to some secure storage in
// Chrome (e.g. LocalStorage).
var pemPrivateKey = fs.readFileSync(
    path.join(process.env.VEYRON_CREDENTIALS, 'privatekey.pem'));

// TODO(bprosnitz) Pass log dir arg to wspr

var testConfig = require(path.join(process.env.VEYRON_ROOT,
    'veyron.js/test/services/config-wsprd.js'));
var outConfig = {
    wsprHttpPort: testConfig.flags.port,
    identityd: testConfig.flags.identd,
    proxyName: testConfig.flags['veyron.proxy'],
    pemPrivateKey: ''+pemPrivateKey,
    defaultBlessingName: 'test',
    // TODO(bprosnitz) Support all namespace environment variables.
    namespaceRoot: process.env.NAMESPACE_ROOT
};

console.log('Using config: ', outConfig);

var configString = JSON.stringify(outConfig, null, '  ');
fs.writeFileSync(
    path.join(process.env.VEYRON_ROOT, 'veyron.js/nacl/out/config.js'),
    'window.config = ' + configString + ';');