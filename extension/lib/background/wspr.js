var request = require('superagent');

module.exports = WSPR;

// Module for interacting with the WSPR proxy.
function WSPR(url) {
  if (!(this instanceof WSPR)) {
    return new WSPR();
  }
  this.url = url;

  this.rootAccount = null;
}

// Create an account on WSPR with a blessing derived from an access token.
// Currently this is implemented by POSTing to WSPR with the body:
// { access_token: <access_token> }
// Returns the name of the new account.
WSPR.prototype.createAccount = function(accessToken, callback) {
  var wspr = this;
  request.post(this.url + '/create-account')
    .send({
      'access_token': accessToken
    })
    .end(function(err, res) {
      if (err) {
        return callback(wspr.handleNetworkError(err));
      }
      if (res.error) {
        return callback(httpResponseToError(res));
      }
      if (!res.body || !res.body.account) {
        return callback(
          new Error('createAccount got invalid response from WSPR: ' +
            'missing "account".'));
      }
      // TODO(nlacasse): assert res.body
      callback(null, res.body.account);
    });
};

// Associate an account with an origin on WSPR.  The account must have been
// previously created with createAccount(...).  Input is an account name to use:
// { account: <account name> }
// Response will be 200 OK if association is successful.
WSPR.prototype.assocAccount = function(account, origin, caveats, callback) {
  var wspr = this;
  request.post(this.url + '/assoc-account')
    .send({
      account: account,
      origin: origin,
      caveats: caveats
    }).end(function(err, res) {
      if (err) {
        return callback(wspr.handleNetworkError(err));
      }
      if (res.error) {
        return callback(httpResponseToError(res));
      }
      // TODO(ataly,nlacasse,suharshs): Why do we send account in this callback?
      callback(null, account);
    });
};

// Detects if network error was caused by a missing or unresponsive WSPR, and
// creates a more helpful error message on those cases.  The original error will
// be a CORS error since WSPR is not responding to the preflight OPTIONS
// request.
WSPR.prototype.handleNetworkError = function(err) {
  if (err.crossDomain) {
    return new Error('Cannot connect to WSPR at: ' + this.url);
  }
  return err;
};

// If an XHR gets a 4XX or 5XX HTTP error, then res.error will be an Error
// object with message corresponding to the HTTP status code (e.g. "Bad
// Request"), which is not so helpful.  This function creates an Error object
// with message set to the actual response text from the server, and status set
// to the HTTP status code.
function httpResponseToError(res) {
  var err = new Error(res.text);
  err.status = res.status;
  return err;
}
