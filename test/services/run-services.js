// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// TODO(sadovsky): Rename this file service-runner.js.

var debug = require('debug')('run-services');
var EE = require('events').EventEmitter;
var extend = require('xtend');
var inherits = require('util').inherits;
var mkdirp = require('mkdirp');
var parallel = require('run-parallel');
var path = require('path');
var service = require('./service');

module.exports = Runner;

/**
 * var runner = Runner(names=[])
 *
 * Emits: start, stop, error
 *
 * @param {Array} names of the vanadium services to run.
 * @returns {Runner}
 */
function Runner(names) {
  if (!(this instanceof Runner)) {
    return new Runner(names);
  }

  // TODO(sadovsky): Make these fields private.
  var runner = this;

  EE.call(runner);

  // Env vars produced by servicerunner job. These are made visible to clients
  // in case they want to pass them to other subprocesses.
  runner.env = {};

  runner._names = names;
  runner._services = [];

  // Used to make start() and stop() idempotent.
  runner._startCalled = false;
  runner._stopCalled = false;
}

inherits(Runner, EE);

Runner.prototype.start = function(cb) {
  var runner = this;
  if (runner._startCalled) {
    debug('warning: start called multiple times');
    return;
  }
  runner._startCalled = true;

  debug('starting core services...');
  runner._setup(function() {
    debug('core services ready; starting additional services...');
    var services = runner._names.map(runner._add.bind(runner));
    // Note, we don't map over runner._services because that includes
    // servicerunner.
    var jobs = services.map(createStartWorker);
    parallel(jobs, function(err) {
      debug('started all services');
      runner.emit('start');
      cb(err);
    });
  });

  return runner;
};

Runner.prototype._add = function(name) {
  var runner = this;
  var env = extend(process.env, runner.env);
  var s = service(name, env);
  s.on('error', function(err) {
    debug('error detected, stopping all services');
    runner.emit('error', err);
    runner.stop();
  });
  runner._services.push(s);
  return s;
};

// Creates a temporary directory for output, generates a principal, starts core
// services (mount table, proxyd, wsprd), writes various vars to runner.env,
// then calls cb.
Runner.prototype._setup = function(cb) {
  var runner = this;

  mkdirp(path.resolve('tmp/log'), createCredentials);

  function createCredentials(err) {
    if (err) {
      return runner.emit('error', err);
    }
    runner.env.V23_CREDENTIALS = path.resolve('tmp/test-credentials');
    service('principal')
      .exec('create -overwrite ' + runner.env.V23_CREDENTIALS + ' test',
	          function(err, stdout, stderr) {
              if (err) {
                return runner.emit('error', err);
              }
              stdout.on('close', startCoreServices);
            });
  }

  function startCoreServices() {
    runner
      ._add('servicerunner')
      .on('vars', function(vars) {
        runner.env = extend(runner.env, {
          IDENTITYD: vars.TEST_IDENTITYD_NAME + '/google',
          IDENTITYD_BLESSING_URL:
              vars.TEST_IDENTITYD_HTTP_ADDR + '/auth/blessing-root',
          V23_NAMESPACE: vars.MT_NAME,
          PROXY_ADDR: vars.PROXY_NAME,
          WSPR_ADDR: vars.WSPR_ADDR
        });
        console.log('Tests running with environment: ', runner.env);
      })
      .on('ready', function() {
        debug('core services running');
        cb();
      })
      .spawn();
  }
};

Runner.prototype.stop = function(cb) {
  var runner = this;
  if (runner._stopCalled) {
    debug('warning: stop called multiple times');
    return;
  }
  runner._stopCalled = true;

  cb = cb || function() {};

  debug('stopping...');

  // Remove all error listeners before killing any services so that services
  // don't complain when other services they depend on are shut down.
  runner._services.map(function(s) {
    s.removeAllListeners('error');
  });

  var jobs = runner._services.map(createStopWorker);
  parallel(jobs, function(err) {
    debug('stopped');
    runner.emit('stop');
    cb(err);
  });
};

function createStartWorker(service) {
  return function start(cb) {
    debug('spawning: %s', service.name);
    service.on('ready', function ready() {
      debug('ready: %s', service.name);
      cb();
    });
    service.spawn();
  };
}

function createStopWorker(service) {
  return function stop(cb) {
    debug('exiting %s', service.name);
    service.on('exit', cb);
    service.kill('SIGTERM');
  };
}
