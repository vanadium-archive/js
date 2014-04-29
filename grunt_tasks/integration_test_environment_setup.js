/**
 * Provides two tasks for setup and tear down of integration tests. For instance
 * processes like wspr can be spawned & then killed in setup and teardown
 * @param {object} grunt the Grunt module
 */
module.exports = function(grunt) {

  // List of processes we have spawned so we can kill them on teardown
  var runningChildProcesses = [];
  var cleaningUp;

  /**
   * Setups the required environment for integration testing such as
   * running wspr and sample Veyron services written in Go that are
   * expected in the integration tests.
   */
  grunt.registerTask('subtask_setupIntegrationTestEnvironment', function() {
    var spawn = require('child_process').spawn;
    var fs = require('fs');
    var path = require('path');

    // Indicate this is a async grunt task
    var done = this.async();

    // Reset state
    runningChildProcesses = [];
    cleaningUp = false;

    // Constants
    // Binary location of wspr and other processes to run
    var VEYRON_BIN_DIR = path.resolve('../../v/bin');
    var VEYRON_PROXY_BIN = VEYRON_BIN_DIR + '/proxy';
    var WSPR_BIN = VEYRON_BIN_DIR + '/wsprd';
    var IDENTITYD_BIN = VEYRON_BIN_DIR + '/identityd';
    var SAMPLE_GO_SERVICE_BIN = VEYRON_BIN_DIR + '/sampled';

    var VEYRON_PROXY_PORT = 3111;
    var WSPR_PORT = 3224; // The port for WSPR.
    var IDENTITYD_PORT = 8125; // The port for the identityd server.

    var LOGS_DIR = path.resolve('logs');

    // Ensure binaries exist
    if (!fs.existsSync(WSPR_BIN) || !fs.existsSync(IDENTITYD_BIN) ||
       !fs.existsSync(SAMPLE_GO_SERVICE_BIN)) {

      var errorMessage = 'Veyron binaries not found. Ensure "veyron" and ' +
        '"veyron2" are built and installed in ' + VEYRON_BIN_DIR + ' by ' +
        'running go-amd64 install \n' +
        WSPR_BIN + ', ' + IDENTITYD_BIN + ' and ' +
        SAMPLE_GO_SERVICE_BIN + ' are required for integration testing';

      fail(errorMessage);
    }

    var veyron_proxy_process = spawn(VEYRON_PROXY_BIN,
      ['-log_dir=' + LOGS_DIR, '-addr=127.0.0.1:' + VEYRON_PROXY_PORT]);
    veyron_proxy_process.title = 'Veyron Proxy';
    runningChildProcesses.push(veyron_proxy_process);

    // Run wspr
    var wspr_process = spawn(WSPR_BIN,
      ['-v=3', '-vv=3', '-log_dir=' + LOGS_DIR, '-port=' + WSPR_PORT,
       '-vproxy=127.0.0.1:' + VEYRON_PROXY_PORT ]);
    wspr_process.title = 'WSPR';
    runningChildProcesses.push(wspr_process);

    // Run identityd
    var identityd_process = spawn(IDENTITYD_BIN, ['-port=' + IDENTITYD_PORT]);
    identityd_process.title = 'Identity Server';
    runningChildProcesses.push(identityd_process);

    // Run the sample go service proxy, we use the sampled example service
    var sample_service_process = spawn(SAMPLE_GO_SERVICE_BIN,
      ['-v=3', '-vv=3', '-log_dir=' + LOGS_DIR]);
    sample_service_process.title = 'Sampled';
    runningChildProcesses.push(sample_service_process);

    // Wait until we get the sample service endpoint from the process stdout
    sample_service_process.stdout.on('data', function(data) {

      var endpoint = data.toString().replace(('Listening at: '), '').trim();
      if (!endpoint.match(/^@.*@$/)) {
        var errorMessage = SAMPLE_GO_SERVICE_BIN + ' did not print the ' +
          'endpoint address on stdout. Expected stdout: ' +
          'Listening at: <VeyronEndPointAddress> but got ' +
          data;

        fail(errorMessage);
      }

      // Success, set the config vars that tests rely on and return
      var testConfigs = grunt.testConfigs;

      testConfigs['WSPR_SERVER_URL'] = 'http://localhost:' +
        WSPR_PORT;
      testConfigs['IDENTITY_SERVER_URL'] = 'http://localhost:' +
        IDENTITYD_PORT + '/random/';

      testConfigs['SAMPLE_VEYRON_GO_SERVICE_ENDPOINT'] = endpoint;
    });

    runningChildProcesses.forEach(function(runningProcess) {
      var stderr = '';
      runningProcess.stderr.on('data', function(d) {
        stderr += d;
        grunt.log.debug(d);
      });
      runningProcess.on('exit', function (code) {
        if (!cleaningUp) {
          fail(runningProcess.title +
            ' crashed before tests finish with code: ' + code +
            ' here is the stderr:\n' + stderr);
        }
       });
    });

    // Return with success, allowing sometime for proxy to fully start
    setTimeout(function() { done(true); }, 500);

  });

  // Kills any running process we started and calls done when all finish
  var cleanUp = function(done) {
    cleaningUp = true;
    var numExited = 0;
    for(var i = 0; i < runningChildProcesses.length; i++) {
      runningChildProcesses[i].kill('SIGTERM');
      // wait until all exit
      runningChildProcesses[i].on('exit', function (code) {
        numExited++;
        if (done !== undefined && numExited == runningChildProcesses.length) {
          done(true);
        }
      });
    }
  };

  // Fails the task after cleaning up
  var fail = function(message) {
    cleanUp();
    grunt.fail.fatal(message);
  };

  // Cleanup in case Grunt fails or is forced to exit
  process.on('exit', function() {
    cleanUp();
  });

  /**
   * Tears down anything setup in subtask_setupIntegrationTestEnvironment
   * such as killing wspr and other services spawned for testing
   */
  grunt.registerTask('subtask_teardownIntegrationTestEnvironment', function() {
    // Indicate this is a async grunt task
    var done = this.async();
    cleanUp(done);
  });
};
