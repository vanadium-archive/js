#!/usr/bin/env node
// Launch WSPR in a chrome extension for testing.

var path = require('path');
var fs = require('fs');
var tmp = require('tmp');
var cp = require('child_process');
var extend = require('xtend');

var processesToKill = [];
function cleanup() {
    processesToKill.forEach(function(p) {
        p.kill();
    });
}

tmp.setGracefulCleanup();
process.on('exit', cleanup);

var env = extend(process.env, {
    NACL_PLUGIN_DEBUG: 1
});
if (!env.CHROME_DEVEL_SANDBOX) {
    env.CHROME_DEVEL_SANDBOX =
        path.join(path.dirname(env.CHROME_BIN), 'chrome_sandbox');
}

function writeConfig(callback) {
    fs.readFile(env.VEYRON_IDENTITY, function(err, identityContents) {
        if (err) {
            return callback(err);
        }

        // TODO(bprosnitz) Pass log dir arg to wspr

        var testConfig = require(path.join(env.VEYRON_ROOT,
            'veyron.js/test/services/config-wsprd.js'));
        var outConfig = {
            wsprHttpPort: testConfig.flags.port,
            identityd: testConfig.flags.identd,
            proxyName: testConfig.flags['veyron.proxy'],
            identityContents: ''+identityContents,
            // TODO(bprosnitz) Support all namespace environment variables.
            namespaceRoot: env.NAMESPACE_ROOT
        };

        console.log('Using config: ', outConfig);

        var configString = JSON.stringify(outConfig, null, '  ');
        fs.writeFile(
            path.join(env.VEYRON_ROOT, 'veyron.js/nacl/out/config.js'),
            '// jshint ignore: start\nwindow.config = ' + configString + ';',
            callback);
    });
}

function checkForChrome(callback) {
    if (env.CHROME_BIN === undefined) {
        return callback(new Error(
            'CHROME_BIN (for 32-bit chrome) must be defined'));
    }
    fs.exists(env.CHROME_BIN, function(exists) {
        if (exists) {
            callback();
        } else {
            callback(new Error('CHROME_BIN does not point to a file'));
        }
    });
}

function initializeProfile(userDir, callback) {
    console.log('Initializing profile...');
    // Hack:  NACL IRT won't load if the browser hasn't been loaded and shut
    // down before trying to load the extension after a new profile has been
    // created.
    var initialChrome = cp.spawn(env.CHROME_BIN,
        ['--user-data-dir=' + userDir],
        {
            env: env,
            stdio: ['ignore', process.stdout, process.stderr]
    });
    processesToKill.push(initialChrome);

    var calledCallback = false;
    initialChrome.on('err', function(err) {
        if (calledCallback) {
            return;
        }
        calledCallback = true;
        callback(err);
    });
    initialChrome.on('exit', function(code, signal) {
        if (calledCallback) {
            return;
        }
        calledCallback = true;
        if (code !== 0) {
            if (signal !== null) {
                callback(new Error(
                  'Signal received from parent process: ' + signal));
            } else {
                callback(new Error('Non-zero exit code: ' + code));
            }
        } else {
            callback();
        }
    });

    // Give chrome a few seconds to start up and initialize the profile.
    setTimeout(function() {
        initialChrome.kill();
    }, 2000);
}

function startWsprInChrome(callback) {
    tmp.dir({}, function(err, userDir) {
        if (err) {
            return callback(err);
        }

        initializeProfile(userDir, function(err) {
            if (err) {
                return callback(err);
            }

            console.log('Starting chrome...');

            var args = [
                '--vmodule=ppb*=4',
                '--enable-logging=stderr',
                '--user-data-dir=' + userDir,
                '--allow-nacl-socket-api=*',
                '--load-extension=' +
                    path.join(env.VEYRON_ROOT, '/veyron.js/nacl/out')
            ];

            var chromeProcess = cp.spawn(env.CHROME_BIN, args, {
                    env: env,
                    stdio: ['ignore', process.stdout, process.stderr]
                });
            processesToKill.push(chromeProcess);
        });
    });
}

function main(callback) {
    checkForChrome(function(err) {
        if (err) {
            return callback(err);
        }
        writeConfig(function(err) {
            if (err) {
                return callback(err);
            }
            startWsprInChrome(callback);
        });
    });
}

main(function(err) {
    if (err) {
        console.error(err);
        process.exit(1);
    }
});
