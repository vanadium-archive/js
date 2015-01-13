var blessingMatches = require('./blessing-matching');
var vError = require('./../lib/verror');
var errNoAuth = new vError.NoAccessError('authorization failed');

module.exports = authorizer;

function authorizer(ctx) {
  if (ctx.localBlessings.publicKey === ctx.remoteBlessings.publicKey) {
    return null;
  }
  var matchesLocal = ctx.localBlessingStrings.some(function(l) {
    return blessingMatches(l, ctx.remoteBlessingStrings);
  });
  if (matchesLocal) {
    return null;
  }

  var matchesRemote = ctx.remoteBlessingStrings.some(function(l) {
    return blessingMatches(l, ctx.localBlessingStrings);
  });
  if (matchesRemote) {
    return null;
  }
  return errNoAuth;
}
