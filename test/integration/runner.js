var run = require('../services/run-services');
var debug = require('debug')('integration-runner');
var spawn = require('comandante');
var extend = require('xtend');
var argv = require('optimist').argv;

debug('starting services');

var services = [
  'proxyd',
  'test_serviced'
];

if ('use-nacl' in argv) {
  services.push('nacl-wsprd.js');
} else {
  services.push('wsprd');
}

var runner = run(services)
.on('start', test)
.on('error', crash)
.start();

process.on('SIGINT', stop);

function test() {
  debug('running tests');

  var debugArgs = {
    DEBUG: argv.debug || process.env.DEBUG || '',
    DEBUG_COLORS: true
  };

  // Extract the flags before the list of tests to run.
  // Neither optimist.argv or process.argv do the right thing here.
  var firstNonFlag;
  for (firstNonFlag = 2; firstNonFlag < process.argv.length; firstNonFlag++) {
    if (process.argv[firstNonFlag][0] !== '-') {
      break;
    }
  }
  var args = process.argv.slice(firstNonFlag);
  var env = extend(process.env, debugArgs);
  var prova = spawn('prova', args, { env: env });

  // Pipe the test run's stdout and stderr to the parent process
  prova.stdout.pipe(process.stdout);
  prova.stderr.pipe(process.stderr);
  prova.on('error', function(err) {
    debug('test errored');
    stop(err);
  });

  // NOTE: 'exit' is better than 'close' in this context since close can be
  // emitted multiple times (since multiple processes might share the same
  // stdio streams)
  prova.on('exit', function(code, signal) {
    debug('test process exited - code: %s, signal: %s', code, signal);
    stop(null, code);
  });
}

function stop(err, code) {
  runner.stop(function() {
    debug('runner stopped, exiting: %s', code);

    // NOTE: `stop` can be called with an error that has already been logged
    // via the stderr stream, process.exit() is called below without the
    // error to prevent double logging of errors.
    if (err) {
      process.exit(1);
    } else {
      process.exit(code);
    }
  });
}

function crash(err) {
  console.log(err.message);

  process.exit(1);
}
