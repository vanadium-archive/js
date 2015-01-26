// matches: {:_}, {2}, {3:}
var substitutionRe = /{(:?)(\d+|_)(:?)}/g;
var numberedRegexp = /{:?(\d+):?}/g;
var digitsRe = /\d+/;
var underscoreRe = /{:?_:?}/g;

/**
 *  <p>Formats the args passed into using fmtString.  The format string has
 *  placeholders for substitutions of the form {1}, where 1 means the first
 *  argument in the argument list.  If the number is preceded by a ':' it means
 *  emit a ': ' before the argument if the argument is non-empty. For
 *  instance:</p>
 *
 *  formatParams('foo{:1}', ['bar']) -> 'foo: bar'
 *  formatParams('foo{:1}', ['']) -> 'foo'
 *
 *
 *  <p>If the number if followed by a ':' then we emit a ':' after the argument
 *  if it is non-empty.  For instance:</p>
 *
 *  formatParams('{1:}foo', ['bar']) -> 'bar:foo'
 *  formatParams('{1:}foo', ['']) -> 'foo'
 *
 *  <p>If {_} exists in the format string any unused arguments are emitted at
 *  that point.  If any of the arguments are missing, then a '?' is emitted.</p>
 *  @private
 */
function formatParams(fmtString, args) {
  var matches = fmtString.match(numberedRegexp);
  var allArgsUsed = [];
  if (matches) {
    allArgsUsed = matches.map(function(s) {
      // We subtract one from the index because the indices in the format
      // string are 1-based.
      return parseInt(digitsRe.exec(s)[0] - 1);
    });
  }

  var unusedArgs = args.filter(function(s, idx) {
    return allArgsUsed.indexOf(idx) === -1;
  }).join(' ');

  // We count the number of underscores seen because we only perform the
  // substitution on the last underscore and we need to know which
  // instance to replace.
  var underscoreMatches = fmtString.match(underscoreRe);
  var underscoreCount = underscoreMatches ? underscoreMatches.length : 0;
  var underscoresSeen = 0;
  return fmtString.replace(substitutionRe, function(s, p1, p2, p3) {
    var value = '';
    if (p2 !== '_') {
      // We subtract one from the index because the indices in the format
      // string are 1-based.
      value = args[parseInt(p2) - 1];
      if (value === undefined) {
        value = '?';
      }
    } else {
      underscoresSeen++;
      if (underscoresSeen === underscoreCount) {
        value = unusedArgs;
      }
    }
    if (value === '') {
      return '';
    }

    var prefix = p1 === ':' ? ': ' : '';
    return prefix + value + p3;
  });
}
module.exports = formatParams;
