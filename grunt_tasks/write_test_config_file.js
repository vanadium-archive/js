 /**
  * Writes out key, value pairs added to the "testConfigs" dictionary in Grunt
  * to a JavaScript file making them available to the test files in both NodeJS
  * and browser for both integration and spec tests.
  * veyron.test.config.js is the name of output file and is loaded by the
  * test runners. In the browser it's loaded in runner.html files, for NodeJS
  * it is included by the "require" option (see nodeTest target in Gruntfile)
  * @param {object} grunt the Grunt module
 */
module.exports = function(grunt) {

  grunt.registerTask('subtask_writeTestConfigFile', function() {

    // Write out everything added to testConfigs in Grunt.
    var fileContent = 'var testconfig = JSON.parse(\'' +
        JSON.stringify(grunt.testConfigs) + '\');';

    // Export for NodeJS as a global
    fileContent += 'if(global) { global.testconfig = testconfig; }';

    var dirs = grunt.config.get('dirs');
    var filePath = dirs.dist + '/test/veyron.test.config.js';
    grunt.file.write(filePath, fileContent);

  });

};
