/**
 * Grunt modules
 * @param {object} grunt the Grunt module
 */

var merge = require('merge');

module.exports = function(grunt) {

  // Any key, value in this object will be available to all test files.
  // Values can be added dynamically from other tasks also.
  grunt.testConfigs = {
    "LOG_LEVEL": 4 // Level for outputting JavaScript logs. Set to highest level
  },

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // Directory variables
    dirs: {
      temp: 'temp',
      tempBrowserify: '<%= dirs.temp %>/browserify',
      dist: 'dist',
      logs: 'logs',
      distTest: '<%= dirs.dist %>/test'
    },

    // Make out temp and output directories
    mkdir: {
      all: {
        options: {
          create: [
            '<%= dirs.temp %>',
            '<%= dirs.tempBrowserify %>',
            '<%= dirs.dist %>',
            '<%= dirs.distTest %>',
            '<%= dirs.logs %>'
          ]
        }
      }
    },

    // Clean tasks
    clean: {
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
      // Delete node-specific files before browsifying
      browserify: [
        // Deletes node_only files
        '<%= dirs.tempBrowserify %>/**/*node_only*',

        // Delete *.browseroverride.js files after they have been copied over
        '<%= dirs.tempBrowserify %>/**/*.browseroverride.js'
      ]
    },

    jshint: {
      node: {
        files: {
          src: ['src/**/*.js', 'test/**/*.js']
        },
        options: {
          jshintrc: 'jshintrc.json',
          ignores: ['src/**/browser_only/**',
                    'src/**/*browseroverride.js',
                    'test/**/browser_only/**']
        }
      },
      browser_only: {
        files: {
          src: ['src/**/browser_only/**/*.js',
                'src/**/*.browseroverride.js',
                'test/**/browser_only/**/*.js']
        },
        options: merge({}, require('./jshintrc.json'), {
          browser: true
        })
      }
    },

    // Copy tasks
    copy: {
      // Copies source files into temp folder to be browserified
      browserify: {
        files: [
          {
            expand: true,
            src: ['src/**', 'test/**'],
            dest: '<%= dirs.tempBrowserify %>'
          }
        ]
      },
      // Rename *.browseroverrides.js to override same-named NodeJS files
      browserify_overrides: {
        files: [
          {
            expand: true,
            cwd: '<%= dirs.tempBrowserify %>',
            src: ['**/*.js'],
            dest: '<%= dirs.tempBrowserify %>',
            rename: function(dest, src) {
              return dest + '/' + src.replace('.browseroverride', '');
            }
          }
        ]
      }
    },

    browserify: {
      source: {
        src: ['<%= dirs.tempBrowserify %>/src/**/*.js'],
        dest: '<%= dirs.dist %>/veyron.browserify.js',
        alias: {
          src: '<%= dirs.tempBrowserify %>/src/veyron.js',
          name: 'veyron'
        },
        detectExternalNodeModules: true
      },
      tests: {
        src: ['<%= dirs.tempBrowserify %>/test/specs/**/*.js'],
        dest: '<%= dirs.dist %>/test/veyron.test.specs.browserify.js'
      }
    },

    // Combine files and add closure around the Veyron
    concat: {
      // Wraps the browserified veyron js code in a closure and exposes
      // the ./veyron modules as a single global which is the entry
      // point to Veyron API. We wrap in closure so we don't leak anything
      // to global namespace and also to keep private modules, private. Only
      // veyron.* is exposed as the public API and accessible.
      wrap_in_closure: {
        options: {
          banner: '(function(g){\n',
          footer: '\ng.Veyron=require(\'veyron\');})(window);'
        },
        src: ['<%= dirs.dist %>/veyron.browserify.js'],
        dest: '<%= dirs.dist %>/veyron.js'
      },
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

    // Server-side testing in NodeJS
    reporter: 'spec',
    nodeTest: {
      // Spec tests
      options: {
        reporter: '<%= reporter %>',
        clearRequireCache: true,
        require: [
          'test/node_init.js',
          '<%= dirs.dist %>/test/veyron.test.config.js'
        ]
      },
      specs: {
        options: {
          captureFile: '<%= dirs.dist %>/test/test_results_node_spec.out',
        },
        src: ['test/specs/both/**/*.js', 'test/specs/node_only/**/*.js']
      },
      // Integration tests
      integration: {
        options: {
          captureFile: '<%= dirs.dist %>/test/test_results_node_integration.out',
        },
        src: ['test/integration/**/*.js']
      }
    },

    // Client-side testing in the Browser

    // Whether Karma closes browsers immediately. Keeping open enables debugging
    browserTestSingleRun: true,
    browserTest: {
      options: {
        singleRun: '<%= browserTestSingleRun %>',
        browsers: ['Chrome'],
        reporters: ['spec','junit'],
        frameworks: ['mocha', 'chai', 'chai-as-promised'],
        basePath: '',
        mocha: {
          ui: 'tdd'
        }
      },
      // Spec tests
      specs: {
        options: {
          junitReporter: {
            outputFile: '<%= dirs.dist %>/test/test_results_browser_spec.out'
          },
          files: [
            '<%= dirs.dist %>/test/veyron.test.config.js',
            '<%= dirs.dist %>/test/veyron.test.specs.browserify.js'
          ]
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
            '<%= dirs.dist %>/test/veyron.test.config.js',
            '<%= dirs.dist %>/test/veyron.test.integration.js'
          ]
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
  grunt.registerTask('subtask_runSpecTests', [
    'subtask_writeTestConfigFile',
    'nodeTest:specs',
    'browserTest:specs'
  ]);

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

  // Browser and node integration tests do their own setup and tear down
  // otherwise states would be shared
  grunt.registerTask('subtask_runIntegrationTests', [
    'subtask_runNodeIntegrationTests',
    'subtask_runBrowserIntegrationTests'
  ]);

  grunt.registerTask('subtask_buildForBrowser', [
    'copy:browserify',
    'copy:browserify_overrides',
    'clean:browserify',
    'browserify',
    'concat',
    'uglify'
  ]);

  // Main tasks, to be run from "make" (e.g. make debug )
  // or directly with Grunt. ( e.g. grunt test )
  grunt.registerTask(
    'build',
    ['clean', 'jshint', 'mkdir:all', 'subtask_buildForBrowser', 'clean:temp']
  );

  grunt.registerTask(
    'test',
    ['build', 'subtask_runSpecTests', 'subtask_runIntegrationTests']
  );

  grunt.registerTask(
    'default',
    ['test']
  );

  grunt.task.registerTask(
    'debug', 'Runs Karma in continuous mode so it can be debugged', function() {
      grunt.config.set('browserTestSingleRun', false);
      grunt.task.run('test');
    }
  );

  grunt.task.registerTask(
    'jenkins', 'Runs the tests outputting xml test results that jenkins can understand', function(testType) {
      grunt.config.set('reporter', 'xunit');
      // Set to no logging since logs interfere with xUnit result output
      grunt.testConfigs['LOG_LEVEL'] = 0

      var testsToRun = ['subtask_runSpecTests', 'subtask_runIntegrationTests'];
      if (testType === 'specs') {
        testsToRun = ['subtask_runSpecTests']
      } else if (testType === 'integration') {
        testsToRun = ['subtask_runIntegrationTests']
      }
      grunt.task.run(testsToRun);
    }
  );

};
