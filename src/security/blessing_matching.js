/**
 * @fileoverview blessing pattern matcher
 */
module.exports = blessingMatches;

// A blessing matches if it is a prefix of the pattern or if the pattern ends
// in a '/...' and the pattern is a prefix of the blessing.
function blessingMatches(blessing, pattern) {
  var paths = blessing.split('/');
  var expectedPaths = pattern.split('/');
  for (var i = 0; i < expectedPaths.length; i++) {
    // If there is a '...' at the end of the pattern then
    // we have a match, since the prefix of the pattern
    // was matched by the blessing.
    if (expectedPaths[i] === '...') {
      return i === expectedPaths.length - 1;
    }

    // name is a prefix of pattern
    if (i === paths.length) {
      return true;
    }

    if (paths[i] !== expectedPaths[i]) {
      return false;
    }
  }

  return paths.length === expectedPaths.length;
}

