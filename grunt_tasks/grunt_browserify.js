 /**
 * Uses the browserify library to transpile for NodeJS style JS for the browser.
 * Transpile mainly makes var x = require('./xModule') work in the browser.
 * Due to limitations of the grunt-browserify, we are writing this ourselves.
 * @param {object} grunt the Grunt module
 */
module.exports = function(grunt) {

  // List of modules in node_modules that we allow to be browserified.
  // If a module that's not in this list is referenced, the build will fail
  var builtinExceptions = [
    'browserify', // We allow browerify itself
    'es6-promise' // A polyfill for ES6 Promise by Jake Archibald (Googler)
  ];

  grunt.registerMultiTask(
    'browserify',
    'Uses Browserify library to transpile JavaScript for the browser',
    function() {

      // Require dependencies
      var browserify = require('browserify');
      var fs = require('fs');
      var path = require('path');
      var through = require('through');

      // Indicate this is a asyn grunt task
      var done = this.async();

      // Destination bundle file
      var dest = this.data.dest;

      var options = {
        builtins: true,  // We browserify builtins for stream support.
        entries: [] // Files to transpile, will be populated later
      };

      // Map source files to entries array
      this.files.forEach(function(file) {
          grunt.file.expand(
            {filter: 'isFile'},
            file.src
          ).forEach(function(file) {
            options.entries.push(path.resolve(file));
          });
      });

      // Create a browsifier
      var b = new browserify(options);

      // We don't want to allow anything from node_modules in common
      // or browser only code. We use the transform event proved by Browserify
      // to inspect the loaded modules and throw error if we find one that
      // is referenced from third-party node_modules.
      if (this.data.detectExternalNodeModules) {
        var transformOptions = {
          global: true
        };

        b.transform(transformOptions, function(file) {

          // Do not allow anything from node_modules (except builtinExceptions)
          if (file.indexOf(path.resolve('node_modules')) === 0) {

            // Allow exceptions
            var excepted = false;
            builtinExceptions.every(function(exception) {
              if (file.indexOf(exception) >= 0) {
                excepted = true;
                return false;
              }
              return true;
            });

            if (!excepted) {
               var errorMessage = 'Node-Only module detected in common code: ' +
              'module in ' + file + ' can not be used. Please refactor into ' +
              'node_only folder and provide a compatible browser override';
              grunt.fail.fatal(errorMessage);
              done(false);
            }
          }
          return through();
        });
      }

      var bundleOptions = {
        detectGlobals: false, // Do not include globals like "process"
        insertGlobals: false,
        standalone: this.data.standalone,
        insertGlobalVars: ['none']
      };

      // Start the bundle
      b.bundle(bundleOptions, function(err, content) {
        if (err) {
          grunt.fail.fatal(err.toString());
          done(false);
        } else {
          grunt.file.write(dest, content);
          done();
        }
      });
  });
};
