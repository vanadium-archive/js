/**
 * Provides two tasks for setup and tear down of integration tests. For instance
 * processes like http proxy can be spawned & then killed in setup and teardown
 * @param {object} grunt the Grunt module
 */
module.exports = function(grunt) {

  // List of processes we have spawned so we can kill them on teardown
  var runningChildProcesses = [];
  // Whether cleanup is in progress
  var cleaningUp = false;

  /**
   * Setups the required environment for integration testing such as
   * running http proxy and sample Veyron services written in Go that are
   * expected in the integration tests.
   */
  grunt.registerTask('subtask_setupIntegrationTestEnvironment', function() {

    var exec = require('child_process').exec;
    var fs = require('fs');
    var path = require('path');

    // Indicate this is a async grunt task
    var done = this.async();

    // Constants

    // Binary location of http proxy and other processes to run
    var VEYRON_BIN_DIR = path.resolve('../../v/bin');
    var HTTP_PROXY_BIN = VEYRON_BIN_DIR + '/http_proxyd';
    var SAMPLE_GO_SERVICE_BIN = VEYRON_BIN_DIR + '/sampled';

    var HTTP_PROXY_PORT = 3224; // What port to run HTTP proxy on
    var TIMEOUT = 2000; // Time to fail if processes do not spawn

    var LOGS_DIR = path.resolve('logs');

    // Ensure binaries exist
    if (!fs.existsSync(HTTP_PROXY_BIN) ||
       !fs.existsSync(SAMPLE_GO_SERVICE_BIN)) {

      var errorMessage = 'Veyron binaries not found. Ensure "veyron" and ' +
        '"veyron2" are built and installed in ' + VEYRON_BIN_DIR + ' by ' +
        'running go-amd64 install \n' +
        HTTP_PROXY_BIN + ' and ' + SAMPLE_GO_SERVICE_BIN + ' are required for' +
        'integration testing';

      fail(errorMessage);
    }
    // Run the http proxy
    var http_proxy_process = exec(HTTP_PROXY_BIN +
      ' -v=3 -vv=3 -log_dir=' + LOGS_DIR + ' -port=' + HTTP_PROXY_PORT, {
        maxBuffer: 4 *1024 * 1024
      },
      function(error, stdout, stderror) {
          if (error && !cleaningUp) {
            var errorMessage = 'Running http proxy failed because:\n' + error +
              '\nIntegration tests can not continue without running ' +
              'http proxy. Please fix the issue. Temporarily, you can run ' +
              'the build without running tests (make build)';

            fail(errorMessage);
          }
      });
    runningChildProcesses.push(http_proxy_process);
    // Run the sample go service proxy, we use the sampled example service
    var sample_service_process = exec(SAMPLE_GO_SERVICE_BIN +
      ' -v=3 -vv=3 -log_dir=' + LOGS_DIR,
      [{timeout: TIMEOUT, maxBuffer: 4 * 1024 * 1024}],
      function(error, stdout, stderror) {
        if (error && !cleaningUp) {
          var errorMessage = 'Running ' + SAMPLE_GO_SERVICE_BIN +
            ' failed because:\n' + error +
            '\nIntegration tests can not continue without running ' +
            SAMPLE_GO_SERVICE_BIN + '.' +
            'Please fix the issue. Temporarily, you can run ' +
            'the build without running tests (make build)';

          fail(errorMessage);
        }
      });

    runningChildProcesses.push(sample_service_process);

    // Wait until we get the sample service endpoint from the process stdout
    sample_service_process.stdout.on('data', function(data) {
      var endpoint = data.replace(('Listening at: '), '').trim();
      if (!endpoint.match(/^@.*@$/)) {
        var errorMessage = SAMPLE_GO_SERVICE_BIN + ' did not print the ' +
          'endpoint address on stdout. Expected stdout: ' +
          'Listening at: <VeyronEndPointAddress> but got ' +
          data;

        fail(errorMessage);
      }

      grunt.log.debug('Got this endpoint from sample service: ' + data);

      // Success, set the config vars that tests rely on and return
      var testConfigs = grunt.testConfigs;

      testConfigs['HTTP_PROXY_SERVER_URL'] = 'http://localhost:' +
        HTTP_PROXY_PORT;

      testConfigs['SAMPLE_VEYRON_GO_SERVICE_NAME'] = 'cache';
      testConfigs['SAMPLE_VEYRON_GO_SERVICE_ENDPOINT'] = endpoint;

      // Return with success, allowing sometime for proxy to fully start
      setTimeout(function() { done(true); }, 1000);
    });

  });

  // Kills any running process we started
  var cleanUp = function() {
    cleaningUp = true;
    runningChildProcesses.forEach(function(runningProcess) {
      runningProcess.kill('SIGTERM');
    });
    setTimeout(function(){
      cleaningUp = false;
    }, 500);
  };

  // Fails the task after cleaning up
  var fail = function(message) {
    cleanUp();
    grunt.fail.fatal(message);
    done(false);
  };

  // Cleanup in case Grunt fails or is forced to exit
  process.on('exit', function() {
    cleanUp();
  });

  /**
   * Tears down anything setup in subtask_setupIntegrationTestEnvironment
   * such as killing the http proxy and other services spawned for testing
   */
  grunt.registerTask('subtask_teardownIntegrationTestEnvironment', function() {
    cleanUp();
  });
};
