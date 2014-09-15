var run = require('../services/run-services');
var debug = require('debug')('integration-runner');
var spawn = require('comandante');
var extend = require('xtend');
var argv = require('optimist').argv;

debug('starting services');

var services = [
  'proxyd',
  'wsprd',
  'sampled',
  'identityd'
];

var runner = run(services)
.on('start', test)
.on('error', exit)
.start();

function test() {
  debug('running tests');

  var debugArgs = {
    DEBUG: argv.debug || process.env.DEBUG,
    DEBUG_COLORS: true
  };

  var env = extend(process.env, debugArgs);
  var prova = spawn('prova', [ 'test/integration/test-*.js' ], { env: env });

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
    debug('test process exited');
    stop();
  });
}

function stop(err) {
  runner.stop(function() {
    // NOTE: `stop` can be called with an error that has already been logged
    // via the stderr stream, exit is called below without the error to
    // prevent double logging of errors in this case.
    if (err) {
      exit();
    }
  });
}

function exit(err) {
  debug('exiting...');

  if (err) {
    console.error(err.message);
  }

  process.exit(1);
}
