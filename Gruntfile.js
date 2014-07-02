/**
 * Grunt modules
 * @param {object} grunt the Grunt module
 *
 * Options:
 * --tests=node_unit,browser_integration,... - run specific tests (default: all)
 * --grep=test_name - run the tests matching the specified pattern
 */

var merge = require('merge');

module.exports = function(grunt) {

  // Any key, value in this object will be available to all test files.
  // Values can be added dynamically from other tasks also.
  grunt.testConfigs = {
    "LOG_LEVEL": 1 // Level for outputting JavaScript logs. Set to error level
  },

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // Directory variables
    dirs: {
      temp: 'temp',
      dist: 'dist',
      docs: 'docs',
      logs: 'logs',
      distTest: '<%= dirs.dist %>/test'
    },

    // Make out temp and output directories
    mkdir: {
      all: {
        options: {
          create: [
            '<%= dirs.temp %>',
            '<%= dirs.dist %>',
            '<%= dirs.distTest %>',
            '<%= dirs.logs %>'
          ]
        }
      }
    },

    // Clean tasks
    clean: {
      build: {
        // Clean build artifacts
        temp: [
          '<%= dirs.temp %>'
        ],
        // Clean dist
        dist: [
          '<%= dirs.dist %>'
        ],
        // Clean logs
        logs: [
          '<%= dirs.logs %>'
        ],
      },
      // Clean docs
      docs: [
        '<%= dirs.docs %>'
      ],
      // Clean node modules
      mode_modules: [
        'node_modules'
      ],
    },

    jshint: {
      node: {
        files: {
          src: ['src/**/*.js', 'test/**/*.js']
        },
        options: {
          jshintrc: 'jshintrc.json',
          ignores: ['src/**/browser_only/**',
                    'test/**/browser_only/**']
        }
      },
      browser_only: {
        files: {
          src: ['src/**/browser_only/**/*.js',
                'test/**/browser_only/**/*.js']
        },
        options: merge({}, require('./jshintrc.json'), {
          browser: true
        })
      }
    },

    browserify: {
      source: {
        src: ['src/veyron.js'],
        dest: '<%= dirs.dist %>/veyron.js',
        standalone: 'Veyron',
        detectExternalNodeModules: true
      },
      tests: {
        src: ['test/specs/both/**/*.js', 'test/specs/browser_only/**/*.js'],
        dest: '<%= dirs.dist %>/test/veyron.test.specs.browserify.js'
      }
    },

    // Combine files and add closure around the Veyron
    concat: {
      // concats all the integration files together
      integration_tests: {
        src: ['test/integration/**/*.js', '!test/integration/node_globals.js'],
        dest: '<%= dirs.dist %>/test/veyron.test.integration.js'
      }
    },

    // Compress and uglify
    uglify: {
      dist: {
        files: {
          '<%= dirs.dist %>/veyron.min.js': ['<%= dirs.dist %>/veyron.js']
        },
        options: {
          sourceMap: true
        }
      }
    },

    // JSDoc
    jsdoc: {
      dist: {
        src: ['src/**/*.js'],
        options: {
          destination: '<%= dirs.docs %>',
          template: 'node_modules/ink-docstrap/template'
        }
      }
    },

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
          '<%= dirs.dist %>/test/veyron.test.config.js',
          'test/test_helper.js'
        ]
      },
      specs: {
        src: ['test/specs/both/**/*.js', 'test/specs/node_only/**/*.js']
      },
      // Integration tests
      integration: {
        src: ['test/integration/**/*.js']
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
            outputFile: '<%= dirs.dist %>/test/test_results_browser_spec.out'
          },
          files: [
            '<%= dirs.distTest %>/veyron.test.config.js',
            'test/test_helper.js',
            '<%= dirs.distTest %>/veyron.test.specs.browserify.js'
          ],
          preprocessors: {
            'dist/test/veyron.test.specs.browserify.js': ['coverage']
          },
          coverageReporter: {
              reporters: [
              { type: 'html', dir: '<%= dirs.distTest %>/coverage/unit' },
              { type: 'cobertura', dir: '<%= dirs.distTest %>/coverage/unit' }
            ]
          }
        }
      },
      // Integration tests
      integration: {
        options: {
          junitReporter: {
            outputFile: '<%= dirs.dist %>/test/test_results_browser_integration.out'
          },
          files: [
            '<%= dirs.dist %>/veyron.js',
            '<%= dirs.distTest %>/veyron.test.config.js',
            'test/test_helper.js',
            '<%= dirs.distTest %>/veyron.test.integration.js'
          ],
          preprocessors: {
            'dist/veyron.js': ['coverage']
          },
          coverageReporter: {
              reporters: [
              { type: 'html', dir: '<%= dirs.distTest %>/coverage/integration' },
              { type: 'cobertura', dir: '<%= dirs.distTest %>/coverage/integration' }
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

  grunt.registerTask('subtask_buildForBrowser', [
    'browserify',
    'concat',
    'uglify'
  ]);

  // Main tasks, to be run from "make" (e.g. make debug )
  // or directly with Grunt. ( e.g. grunt test )
  grunt.registerTask(
    'build',
    ['clean:build', 'jshint', 'mkdir:all', 'subtask_buildForBrowser',
    'clean:build:temp']
  );

  grunt.registerTask('test', 'Runs the tests', function() {
      grunt.task.run('build');

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
          'dist/test/test_results_node_spec.out';
        grunt.task.run('subtask_writeTestConfigFile');
        grunt.task.run('nodeTest:specs');
      }
      if (hasSubstrMatch(tests, 'browser_unit')) {
        grunt.task.run('subtask_writeTestConfigFile');
        grunt.task.run('browserTest:specs');
      }
      if (hasSubstrMatch(tests, 'node_integration')) {
        process.env.XUNIT_FILE =
          'dist/test/test_results_node_integration.out';
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
