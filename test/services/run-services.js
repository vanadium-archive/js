var parallel = require('run-parallel');
var service = require('./service');
var debug = require('debug')('run-services');
var EE = require('events').EventEmitter;
var inherits = require('util').inherits;
var extend = require('xtend');
var path = require('path');
var mkdirp = require('mkdirp');
var mounttableConfig = require('./config-mounttabled');
var fs = require('fs');

module.exports = Run;

/**
 * var runner = Run(names=[], options={})
 *
 * Events: start, stop, error
 *
 * @param {Array} names of the veyron services to run.
 * @param {Object} An object holding the options that will be passed to each
 * service's spawn call
 * @returns {Run}
 */
function Run(names, options) {
  if (! (this instanceof Run)) {
    return new Run(names, options);
  }

  if (! Array.isArray(names)) {
    names = [ names ];
  }

  // TODO(jasoncampbell): Allow options to pass through and clearly document
  // them.
  var run = this;
  var defaults = {
    'tmp-dir': path.resolve('tmp'),
    NAMESPACE_ROOT: '/localhost' + mounttableConfig.flags.address,
    VEYRON_IDENTITY: path.resolve('tmp/test-identity')
  };

  EE.call(this);

  run.options = extend(defaults, options);
  run.names = names;
  run.services = [];
  run.status = 'new';

  run.on('setup', function() {
    run.status = 'ready';
  });

  run.on('start', function(){
    run.status = 'running';
  });

  run.on('error', function(err) {
    debug('error detected, shutting child porcesses down');
    run.stop();
  });
}

inherits(Run, EE);

Run.prototype.is = function (status) {
  var run = this;

  return run.status === status;
};

Run.prototype.start = function () {
  var run = this;

  if (! run.is('ready')) {
    debug('deferring start');
    run.once('setup', run.start);
    run.setup();
    return run;
  }

  debug('now starting...');

  run.names.forEach(function(name) {
    debug('spawning: %s', name);
    run.add(name).spawn();
  });

  run.emit('start');

  return run;
};

Run.prototype.setup = function() {
  var run = this;
  var tmp = path.join(run.options['tmp-dir'], 'log');
  var VEYRON_IDENTITY = run.options.VEYRON_IDENTITY;

  debug('setting up...');

  mkdirp(tmp, createIdentity);

  function createIdentity(err) {
    if (err) {
      return run.emit('error', err);
    }

    service('identity')
    .exec('generate test', function(err, stdout, stderr) {
      if (err) {
        return run.emit('error', err);
      }

      stdout
      .pipe(fs.createWriteStream(VEYRON_IDENTITY))
      .on('close', startMounttable);
    });
  }

  function startMounttable(){
    run
    .add('mounttabled')
    .on('endpoint', function(endpoint){
      debug('endpoint: %s', endpoint);
      run.options.NAMESPACE_ROOT = endpoint;
      run.emit('setup');
    })
    .spawn();
  }
};

// Add services to the run list, this sets up some book keeping like error
// tracking and allows a list of services to be iterated over later to help
// with exiting everything cleanly.
Run.prototype.add = function(name) {
  var run = this;
  var s = service(name, {
    NAMESPACE_ROOT: run.options.NAMESPACE_ROOT,
    VEYRON_IDENTITY: run.options.VEYRON_IDENTITY
  });

  s.on('error', run.emit.bind(run, 'error'));

  // keep track so it can be sutdown later
  run.services.push(s);

  return s;
};

Run.prototype.stop = function (callback) {
  callback = callback || function(){};

  var run = this;

  run.on('stop', callback);

  if (run.is('stopping')) {
    return;
  }

  debug('stopping...');
  run.status = 'stopping';

  var jobs = run.services.map(createStopWorker);

  parallel(jobs, stopped);

  function stopped(err) {
    debug('stopped');
    run.emit('stop');
  }
};

function createStopWorker(service) {
  // Errors need to be removed from each service ahead of exiting since
  // things will start complaining about missing mountables etc. as all the
  // points in the constellation start to come down.
  service.removeAllListeners('error');
  service.on('error', function() {});

  return function worker(cb) {
    debug('exiting %s', service.name);
    service.on('exit', cb);
    service.kill('SIGTERM');
  };
}
