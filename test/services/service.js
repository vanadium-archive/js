var path = require('path');
var spawn = require('child_process').spawn;
var inherits = require('util').inherits;
var EE = require('events').EventEmitter;
var extend = require('xtend');
var which = require('which');
var PassThrough = require('stream').PassThrough;
var fs = require('fs');

var VEYRON_ROOT = process.env.VEYRON_ROOT;
var VEYRON_BINS = [
  path.join(VEYRON_ROOT, 'veyron.js/go/bin'),
  path.join(VEYRON_ROOT, 'veyron.js/nacl/scripts')
];
var DEFAULT_FLAGS = {
  v: 3,
  log_dir: path.resolve('tmp/log')  // jshint ignore:line
};

process.env.PATH += ':' + VEYRON_BINS.join(':');

module.exports = Service;

function Service(name, env) {
  if (!(this instanceof Service)) {
    return new Service(name, env);
  }

  var service = this;

  EE.call(service);

  try {
    service.config = require('./config-' + name);
  } catch (e) {
    service.config = {};
  }

  service.name = name;
  service.args = flags(extend(DEFAULT_FLAGS, service.config.flags));
  service.env = env || {};
}

inherits(Service, EE);

Service.prototype.spawn = function(args) {
  var service = this;

  args = args || service.args;

  if (!VEYRON_ROOT) {
    var err = new Error('Please export $VEYRON_ROOT to proceed');
    return service.emit('error', err);
  }

  which(service.name, function(err, bin) {
    if (err) {
      return service.emit('error', notfound(service.name));
    }

    var errlog = '';

    service.process = spawn(bin, args, {env: service.env});

    if (service.name !== 'servicerunner') {
      if (service.name === 'write-wspr-config.js') {
        // HACK: Wait for chrome to spin up.
        setTimeout(function() {
          service.emit('ready');
        }, 5000);
      } else {
        service.emit('ready');
      }
    }

    if (service.process.stdout) {
      service.process.stdout.pipe(fs.createWriteStream(
        path.join('tmp', service.name + '.stdout.log')));

      if (service.name === 'servicerunner') {
        service.process.stdout.on('data', function(data) {
          service.emit('vars', JSON.parse(data.toString()));
          service.emit('ready');
        });
      }
    }

    // Buffer stderr until close so that a meaningful error can be emitted
    // when a non-zero exit code is encountered.
    //
    // NOTE: All veyron bins log to stderr so this buffer will just grow
    // until that is resolved...
    if (service.process.stderr) {
      var stderr = new PassThrough();
      service.process.stderr.pipe(stderr);
      stderr.pipe(fs.createWriteStream(
        path.join('tmp', service.name + '.stderr.log')));

      stderr.on('data', function(data) {
        errlog += data;
      });
    }

    service.process.on('close', function(code) {
      if (code === 0) {
        return;
      }

      var message = [
        'non-zero exit code: ' + code,
        'while running: ' + service.name + ' ' + args.join(' '),
        '\n',
        errlog
      ].join('\n');

      service.emit('error', new Error(message));
    });

    [ 'exit', 'close' ].forEach(function(name) {
        service.process.on(name, service.emit.bind(service, name));
    });

    service.emit('spawn', service.process.stdout, service.process.stderr);
  });
};

// A quick wrapper for short run execs, useful for non-deamons like the
// principal command.
Service.prototype.exec = function(command, cb) {
  var service = this;
  service
    .on('error', cb.bind(service))
    .on('spawn', cb.bind(service, null))
    .spawn(command.split(' '));
};

Service.prototype.kill = function() {
  var service = this;

  if (service.process) {
    service.process.kill.apply(service.process, arguments);
  }
};

function notfound(name) {
  var message = 'Veyron binary not found: ' + name + '\n' +
      'Please run "make clean" and try again.' +
      'If problem persists, "make go/bin -B" can force building of binaries.';

  return new Error(message);
}

function flags(obj) {
  var args = Object.keys(obj).map(function(key) {
    return ['-', key, '=', obj[key]].join('');
  });

  return args;
}
