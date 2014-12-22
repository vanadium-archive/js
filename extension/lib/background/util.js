module.exports = {
  getOrigin: getOrigin
};

// Parse a url and return the origin.
function getOrigin(url) {
  var URL = require('url');
  var parsed = URL.parse(url);
  return parsed.protocol + '//' + parsed.host;
}
