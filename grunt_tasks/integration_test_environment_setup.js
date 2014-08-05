var Promise = require('es6-promise').Promise;
var deferred =  require('../src/lib/deferred');
var path = require('path');
var spawn = require('child_process').spawn;
var fs = require('fs');

/**
 * Provides two tasks for setup and tear down of integration tests. For instance
 * processes like wspr can be spawned & then killed in setup and teardown
 * @param {object} grunt the Grunt module
 */
module.exports = function(grunt) {
  // List of processes we have spawned so we can kill them on teardown
  var runningChildProcesses = [];
  var cleaningUp;
  var addListeners = function(runningProcess, resolve, reject) {
    var stderr = '';
    if (resolve) {
      runningProcess.stderr.once('data', function() {
        resolve();
      });
    }
    runningProcess.stderr.on('data', function(d) {
      stderr += d;
      grunt.log.debug(d);
    });
    runningProcess.on('exit', function (code) {
      if (!cleaningUp) {
        reject(runningProcess.title +
          ' crashed before tests finish with code: ' + code +
          ' here is the stderr:\n' + stderr);
      }
    });
  };

  // Constants
  // Binary location of wspr and other processes to run
  var VEYRON_ROOT = process.env.VEYRON_ROOT;

  if (! VEYRON_ROOT) {
    grunt.fail.fatal('Please export $VEYRON_ROOT to proceed');
  }

  var VEYRON_BIN_DIR = path.join(VEYRON_ROOT, 'veyron/go/bin');

  var VEYRON_PROXY_BIN = path.join(VEYRON_BIN_DIR, 'proxyd');
  var MOUNTTABLE_BIN = path.join(VEYRON_BIN_DIR, 'mounttabled')
  var WSPR_BIN = path.join(VEYRON_BIN_DIR, 'wsprd')
  var IDENTITYD_BIN = path.join(VEYRON_BIN_DIR, 'identityd')
  var STORED_BIN = path.join(VEYRON_BIN_DIR, 'stored')
  var SAMPLE_GO_SERVICE_BIN = path.join(VEYRON_BIN_DIR, 'sampled')

  var BINARIES = [VEYRON_PROXY_BIN, MOUNTTABLE_BIN, WSPR_BIN, IDENTITYD_BIN,
   SAMPLE_GO_SERVICE_BIN, STORED_BIN];

  var WSPR_PORT = 3224; // The port for WSPR.
  var IDENTITYD_PORT = 8125; // The port for the identityd server.

  var LOGS_DIR = path.resolve('logs');
  // TODO(bprosnitz) Currently we generate a *.ERROR sym link when there is an
  // error. However this is not removed when the most recent logged version has
  // no errors so it points to stale data.

  /**
   * Starts a process that depends on the mounttable root and returns
   * a handle the process.
   * @param {string} mounttableRoot the veyron endpoint of the mounttable.
   * @param {string} bin the path to the binary.
   * @param {array} extraArgs an array of args that are binary specific. The
   * logging flags will already be set.
   * @return {Process} the process handle for the command.
   */
  var startProcessWithMounttableRoot = function(mounttableRoot, bin, name,
   extraArgs) {
    var envWithMount = {
      VEYRON_IDENTITY: process.env.IDENTITY_FILE,
      NAMESPACE_ROOT: mounttableRoot,
    };
    var args = ['-v=3', '-vv=3', '-log_dir=' + LOGS_DIR];
    args = args.concat(extraArgs);
    // Run process
    var runningProcess = spawn(bin, args, { env: envWithMount});
    runningProcess.title = name;
    runningChildProcesses.push(runningProcess);
    return runningProcess;
  };

  /**
   * Starts a process that depends on the mounttable root and returns
   * a promise that will be resolved when the process has started.
   * @param {string} mounttableRoot the veyron endpoint of the mounttable.
   * @param {string} bin the path to the binary.
   * @param {array} extraArgs an array of args that are binary specific. The
   * logging flags will already be set.
   * @return {Promise} a promise that will be resolved when the process has
   * been started.
   */
  var startProcessWithMounttableAndAddHandlers = function(mounttableRoot, bin,
   name, extraArgs) {
    var process = startProcessWithMounttableRoot(mounttableRoot, bin, name,
     extraArgs);
    var def = new deferred();
    addListeners(process, def.resolve, def.reject);
    return def.promise;
  };

  // Starts WSPR taking in the mounttable root and returns a promise that
  // will be resolved when WSPR is ready to accept requests.
  var startWSPR = function(mounttable) {
    grunt.testConfigs['WSPR_SERVER_URL'] = 'http://localhost:' +
        WSPR_PORT;
    return startProcessWithMounttableAndAddHandlers(
      mounttable, WSPR_BIN,
      'WSPR', ['-port=' + WSPR_PORT, '-vproxy=test/proxy']);
  };

  // Starts the Veyron Proxy taking in the mounttable root and returns
  // a promise that will be resolved when the proxy. is ready to accept requests.
  var startProxy = function(mounttable) {
    return startProcessWithMounttableAndAddHandlers(
      mounttable, VEYRON_PROXY_BIN, 'Veyron Proxy',
      ['-address=127.0.0.1:0', '-name=test/proxy']);
  };

  var startStored = function(mounttable) {
    var storePath = 'dist/test/store_integration';
    grunt.file.delete(storePath);
    var process = startProcessWithMounttableRoot(
      mounttable, STORED_BIN, 'stored', ['--address=127.0.0.1:0',
      '--db=' + storePath]);
    var def = new deferred();
    addListeners(process, null, def.reject);
    // Wait until we get the stored service endpoint from the process stdout
    // TODO(bprosnitz) Talk to storage people about STDOUT/STDERR output.
    process.stderr.on('data', function(data) {
      var mountMatch = /Mounting store on (.*?), endpoint/g.exec(
        data.toString());
      if (mountMatch) {
        var endpoint = mountMatch[1];
        grunt.testConfigs['STORED_ENDPOINT'] = endpoint;
        def.resolve();
      }
      // TODO(bprosnitz) Add timeout and error if not found.
    });
    return def.promise;
  };

  // Starts sampled taking in the mounttable root and returns a ppromise
  // that will resolved when sampled is up and running.
  var startSampled = function(mounttable) {
    var process =  startProcessWithMounttableRoot(
      mounttable, SAMPLE_GO_SERVICE_BIN, 'Sampled', []);
    var def = new deferred();
    addListeners(process, null, def.reject);
    // Wait until we get the sample service endpoint from the process stdout
    process.stdout.on('data', function(data) {
      var endpoint = data.toString().replace('Listening at: ', '').trim();
      if (!endpoint.match(/^@.*@$/)) {
        var errorMessage = SAMPLE_GO_SERVICE_BIN + ' did not print the ' +
          'endpoint address on stdout. Expected stdout: ' +
          'Listening at: <VeyronEndPointAddress> but got ' +
          data;

        fail(errorMessage);
      }

      // Success, set the config vars that tests rely on and return
      grunt.testConfigs['SAMPLE_VEYRON_GO_SERVICE_ENDPOINT'] = endpoint;
      def.resolve();
    });
    return def.promise;
  };

  var startMounttable = function() {
    var mounttableDef = new deferred();
    var mounttablePromise = mounttableDef.promise;

    var mounttable_process = spawn(MOUNTTABLE_BIN,
      ['-log_dir=' + LOGS_DIR, '-address=127.0.0.1:0'], {
        env: {
          VEYRON_IDENTITY: process.env.IDENTITY_FILE
        }
      });
    mounttable_process.title = 'MountTable';
    var endpointRe = /@.*@@\S*/;
    var mounttableEndpoint = '';
    mounttable_process.stderr.on('data', function(data) {
      var string = data.toString();
      if (mounttableEndpoint !== '') {
        return;
      }
      var match = string.match(endpointRe);
      if (!match) {
	console.log('Did not find a match');
        return
      }
      mounttableEndpoint = match[0];
      mounttableDef.resolve('/' + mounttableEndpoint);
    });

    runningChildProcesses.push(mounttable_process);
    addListeners(mounttable_process, null, mounttableDef.reject);
    return mounttablePromise;
  };

  var startIdentityd = function() {
    var identityd_process = spawn(IDENTITYD_BIN, ['-httpaddr=localhost:' + IDENTITYD_PORT], {
      env: {
          VEYRON_IDENTITY: process.env.IDENTITY_FILE
        }
    });
    identityd_process.title = 'Identity Server';
    runningChildProcesses.push(identityd_process);
    var identityDef = new deferred();
    addListeners(identityd_process, identityDef.resolve, identityDef.reject);
    grunt.testConfigs['IDENTITY_SERVER_URL'] = 'http://localhost:' +
        IDENTITYD_PORT + '/random/';
    return identityDef.promise;
  };
  /**
   * Setups the required environment for integration testing such as
   * running wspr and sample Veyron services written in Go that are
   * expected in the integration tests.
   */
  grunt.registerTask('subtask_setupIntegrationTestEnvironment', function() {
    // Indicate this is a async grunt task
    var done = this.async();

    // Reset state
    runningChildProcesses = [];
    cleaningUp = false;

    // Ensure binaries exist
    BINARIES.forEach(function(bin) {
      if (!fs.existsSync(bin)) {
        var errorMessage = 'Veyron binaries not found. Ensure "veyron" and ' +
        '"veyron2" are built and installed in ' + VEYRON_BIN_DIR + ' by ' +
        'running go-amd64 install\n The following binaries are needed:\n' +
        BINARIES.join('\n');
        fail(errorMessage);
      }
    });

    var basicEnv = {
      VEYRON_IDENTITY: process.env.IDENTITY_FILE
    };

    var servicePromises = [];
    var mounttablePromise = startMounttable();
    servicePromises.push(mounttablePromise);

    servicePromises.push(startIdentityd());

    servicePromises.push(mounttablePromise.then(startWSPR));

    servicePromises.push(mounttablePromise.then(startProxy));

    servicePromises.push(mounttablePromise.then(startSampled));

    servicePromises.push(mounttablePromise.then(startStored));

    Promise.all(servicePromises).then(function() {
      if (BINARIES.length != runningChildProcesses.length) {
        fail('Not all binaries were started');
        done(false);
      } else {
        done(true);
      }
    }).catch(function(err) {
      fail(err);
      done(false);
    });
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
