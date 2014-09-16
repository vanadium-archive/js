/**
 * Grunt modules
 * @param {object} grunt the Grunt module
 *
 * Options:
 * --tests=node_unit,browser_integration,... - run specific tests (default: all)
 * --grep=test_name - run the tests matching the specified pattern
 */

module.exports = function(grunt) {

  // Any key, value in this object will be available to all test files.
  // Values can be added dynamically from other tasks also.
  grunt.testConfigs = {
    "LOG_LEVEL": 1 // Level for outputting JavaScript logs. Set to error level
  },

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // Server-side testing in NodeJS
    nodeReporter: 'spec',
    testTimeout: 4000,
    nodeTest: {
      // Spec tests
      options: {
        timeout: '<%= testTimeout %>',
        reporter: '<%= nodeReporter %>',
        grep: grunt.option('grep'), // only run tests matching pattern
        clearRequireCache: true,
        require: [
          'xunit-file',
          'test/node_init.js',
          'test_out/veyron.test.config.js'
        ]
      },
      specs: {
        src: ['test/specs/both/**/*.js', 'test/specs/node_only/**/*.js']
      },
      // Integration tests
      integration: {
        src: [
          'test/integration/client/*.js',
          'test/integration/proxy/*.js',
          'test/integration/security/*.js',
          'test/integration/server/*.js'
        ]
      }
    },

    // Client-side testing in the Browser

    // Whether Karma closes browsers immediately. Keeping open enables debugging
    browserTestSingleRun: true,
    browserName: 'Chrome',
    browserTest: {
      options: {
        singleRun: '<%= browserTestSingleRun %>',
        browsers: ['<%= browserName %>'],
        reporters: ['spec','junit','coverage'],
        frameworks: ['mocha', 'chai', 'chai-as-promised'],
        basePath: '',
        mocha: {
          ui: 'tdd',
          timeout: '<%= testTimeout %>',
          grep: grunt.option('grep') // only run tests matching pattern
        }
      },
      // Spec tests
      specs: {
        options: {
          junitReporter: {
            outputFile: 'test_out/test_results_browser_spec.out'
          },
          files: [
            'test_out/veyron.test.config.js',
            'test_out/veyron.test.specs.js'
          ],
          preprocessors: {
            'test_out/veyron.test.specs.browserify.js': ['coverage']
          },
          coverageReporter: {
              reporters: [
              { type: 'html', dir: 'test_out/coverage/unit' },
              { type: 'cobertura', dir: 'test_out/coverage/unit' }
            ]
          }
        }
      },
      // Integration tests
      integration: {
        options: {
          junitReporter: {
            outputFile: 'test_out/test_results_browser_integration.out'
          },
          files: [
            'test_out/veyron.test.config.js',
            'test_out/veyron.test.integration.js'
          ],
          preprocessors: {
            'dist/veyron.js': ['coverage']
          },
          coverageReporter: {
              reporters: [
              { type: 'html', dir: 'test_out/coverage/integration' },
              { type: 'cobertura', dir: 'test_out/coverage/integration' }
            ]
          }
        }
      }
    }

  });

  /**
   * Loading all the grunt npm tasks in bulk using a plugin.
   * This is a nicer alternative to calling loadNpmTasks for each one separately
   */
  require('load-grunt-tasks')(grunt);

  // Load our own custom tasks
  grunt.task.loadTasks('./grunt_tasks');

  /**
   * Renaming some tasks for better readability
   */
  // mochaTest is a module for testing server-side JavaScript in NodeJS
  grunt.renameTask('mochaTest', 'nodeTest');
  // Karma is a module for testing client-side JS in browsers
  grunt.renameTask('karma', 'browserTest');

  /**
   * Registering our targets
   */

  // Helper tasks, not to be run directly. Only referenced from Main tasks
  grunt.registerTask('subtask_runNodeIntegrationTests', [
    'subtask_setupIntegrationTestEnvironment',
    'subtask_writeTestConfigFile',
    'nodeTest:integration',
    'subtask_teardownIntegrationTestEnvironment'
  ]);

  grunt.registerTask('subtask_runBrowserIntegrationTests', [
    'subtask_setupIntegrationTestEnvironment',
    'subtask_writeTestConfigFile',
    'browserTest:integration',
    'subtask_teardownIntegrationTestEnvironment'
  ]);

  grunt.registerTask('test', 'Runs the tests', function() {
      var allTests = ['node_unit', 'browser_unit', 'node_integration',
      'browser_integration'];

      var testStr = grunt.option('tests');

      var hasSubstrMatch = function(testNames, toMatch) {
        for (var testIndex in testNames) {
          if (toMatch.indexOf(testNames[testIndex]) !== -1) {
            return true;
          }
        }
        return false;
      }

      var tests = allTests;
      if (testStr !== undefined) {
        tests = testStr.split(',');
        var foundMatch = false;
        for (var atIndex in allTests) {
          if (hasSubstrMatch(tests, allTests[atIndex])) {
            foundMatch = true;
            break;
          }
        }
        if (!foundMatch) {
          grunt.fail.warn('Tasks did not match any of: ' + allTests);
        }
      }

      if (hasSubstrMatch(tests, 'node_unit')) {
        process.env.XUNIT_FILE =
          'test_out/test_results_node_spec.out';
        grunt.task.run('subtask_writeTestConfigFile');
        grunt.task.run('nodeTest:specs');
      }
      if (hasSubstrMatch(tests, 'browser_unit')) {
        grunt.task.run('subtask_writeTestConfigFile');
        grunt.task.run('browserTest:specs');
      }
      if (hasSubstrMatch(tests, 'node_integration')) {
        process.env.XUNIT_FILE =
          'test_out/test_results_node_integration.out';
        grunt.task.run('subtask_runNodeIntegrationTests');
      }
      if (hasSubstrMatch(tests, 'browser_integration')) {
        grunt.task.run('subtask_runBrowserIntegrationTests');
      }
    }
  );

  grunt.registerTask(
    'default',
    ['test']
  );

  grunt.registerTask('debug_browser',
    'Runs tests in a browser window that remains open for debugging',
    function() {
      grunt.config.set('browserTestSingleRun', false);
      grunt.config.set('browserTest.specs.options.preprocessors', []);
      grunt.config.set('browserTest.integration.options.preprocessors', []);
      grunt.task.run('test');
  });

  grunt.registerTask('debug_browser_integration',
      'Runs the integration test in a browsesr window that remains open for debugging',
      function() {
        grunt.config.set('browserTestSingleRun', false);
        grunt.task.run('subtask_runBrowserIntegrationTests');
  });

  grunt.task.registerTask(
    'jenkins_tests', 'Runs the tests outputting xml test results that jenkins can understand', function(testType) {
      grunt.config.set('nodeReporter', 'xunit-file');

      grunt.task.run('test');
    }
  );

};
