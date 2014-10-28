var parallel = require('run-parallel');
var service = require('./service');
var debug = require('debug')('run-services');
var EE = require('events').EventEmitter;
var inherits = require('util').inherits;
var extend = require('xtend');
var path = require('path');
var mkdirp = require('mkdirp');

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
    VEYRON_CREDENTIALS: path.resolve('tmp/test-credentials')
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

  var jobs = run.names.map(function(name) {
    var service = run.add(name);
    return createStartWorker(service);
  });

  parallel(jobs, started);

  function started(err) {
    debug('started all services');
    run.emit('start');
  }

  return run;
};

Run.prototype.setup = function() {
  var run = this;
  var tmp = path.join(run.options['tmp-dir'], 'log');
  var VEYRON_CREDENTIALS = run.options.VEYRON_CREDENTIALS;

  debug('setting up...');

  mkdirp(tmp, createCredentials);

  function createCredentials(err) {
    if (err) {
      return run.emit('error', err);
    }

    service('principal')
    .exec('create --overwrite ' + VEYRON_CREDENTIALS + ' test',
	  function(err, stdout, stderr) {
      if (err) {
        return run.emit('error', err);
      }

      stdout
      .on('close', startMounttable);
    });
  }

  function startMounttable(){
    run
    .add('mounttabled')
    .on('endpoint', function(endpoint){
      run.options.NAMESPACE_ROOT = endpoint;
    })
    .on('ready', function() {
      debug('mounttabled running');
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
  var opts = extend(process.env, {
    VEYRON_CREDENTIALS: run.options.VEYRON_CREDENTIALS
  });
  if (run.options.NAMESPACE_ROOT) {
    opts.NAMESPACE_ROOT = run.options.NAMESPACE_ROOT;
  }

  var s = service(name, opts);

  s.on('error', run.emit.bind(run, 'error'));

  // keep track so it can be sutdown later
  run.services.push(s);

  return s;
};

Run.prototype.stop = function (cb) {
  cb = cb || function(){};

  var run = this;

  run.on('stop', cb);

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

function createStartWorker(service) {
  return function start(cb) {
    debug('spawning: %s', service.name);

    service.on('ready', function ready() {
      debug('ready: %s', service.name);
      // Error listeners have already been listend to via the call to
      // run.add(name)
      cb();
    });
    service.spawn();
  };
}

function createStopWorker(service) {
  // Errors need to be removed from each service ahead of exiting since
  // things will start complaining about missing mountables etc. as all the
  // points in the constellation start to come down.
  service.removeAllListeners('error');
  service.on('error', function() {});

  return function stop(cb) {
    debug('exiting %s', service.name);
    service.on('exit', cb);
    service.kill('SIGTERM');
  };
}
