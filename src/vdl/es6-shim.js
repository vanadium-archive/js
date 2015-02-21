if (typeof Map === 'undefined' || typeof Set === 'undefined') {
  // Make this require an expression, so browserify won't include it.
  require('es6-' + 'shim');
}
