var debug = require('debug')('integration-runner');
var extend = require('xtend');
var ServiceRunner = require('../services/run-services');
var serviceRunner;
var spawn = require('child_process').spawn;

var argv = require('minimist')(process.argv.slice(2), {
  '--': true,
  default: {services: ''}
});

process.on('uncaughtException', function(err) {
  console.error('Uncaught exception: ' + err);
  stop(err);
});
process.on('SIGINT', stop);

// Spawn test command and stop on exit.
function runTests() {
  debug('running tests');
  var debugEnv = {
    DEBUG: argv.debug || process.env.DEBUG || '',
    DEBUG_COLORS: true
  };
  var env = extend(process.env, serviceRunner.env, debugEnv);

  var command = argv['--'];
  var name = command[0];
  var args = command.slice(1);
  var proc = spawn(name, args, {env: env});

  // Pipe the test's stdout and stderr to the parent process.
  proc.stdout.pipe(process.stdout);
  proc.stderr.pipe(process.stderr);
  proc.on('error', function(err) {
    debug('test errored');
    stop(err);
  });

  // NOTE: 'exit' is better than 'close' in this context since close can be
  // emitted multiple times (since multiple processes might share the same
  // stdio streams)
  proc.on('exit', function(code, signal) {
    debug('test process exited - code: %s, signal: %s', code, signal);
    stop(null, code);
  });
}

// Stop all services and exit.
function stop(err, code) {
  if (err) {
    code = code || 1;
    console.error(err);
    console.error(err.stack);
  } else {
    code = code || 0;
  }

  serviceRunner.stop(function(err) {
    if (err) {
      debug('warning: serviceRunner.stop() failed! exiting anyways: %s', code);
    } else {
      debug('runner stopped, exiting: %s', code);
    }
    process.exit(code);
  });
}

// Starts the "servicerunner" service as well as any services specified in the
// --services command line flag, then runs tests.
function startServicesAndRunTests() {
  var services = [];
  if (argv.services && argv.services.length) {
    services = argv.services.split(',');
  }

  debug('starting core services and: ' + services.join(', '));

  // NOTE(sadovsky): There are all sorts of race conditions and unhandled edge
  // cases in this code.
  serviceRunner = new ServiceRunner(services);
  serviceRunner
    .on('error', stop)
    .start(function(err) {
      if (err) {
        return stop(err);
      }
      runTests();
    });
}

startServicesAndRunTests();
