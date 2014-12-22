// This file is necessary because browspr has a different default blessing name
// than wspr when started through the servicerunner.

if (require('is-browser')) {
  // Browspr has this string hard-coded.
  module.exports = 'unauthenticated-dummy-account';
} else {
  // Servicerunner starts child processes (including wspr) with this blessing
  // name.
  module.exports = 'test/child';
}
