var request = require('superagent');

module.exports = WSPR;

// Module for interacting with the WSPR proxy.
function WSPR(){
  if(!(this instanceof WSPR)){
    return new WSPR();
  }
}

// Get the WSPR url out of the settings.
WSPR.prototype.getUrl = function() {
  var state = require('../state');
  var settings = state.settings().collection;
  var _ = require('lodash');

  var wsprSetting = _.find(settings, function(setting) {
    return (setting.key === 'wspr');
  });

  return wsprSetting.value;
};

// Create an account on WSPR with a blessing derived from an access token.
// Currently this is implemented by POSTing to WSPR with the body:
// { access_token: <access_token> }
// Returns the names of the new account in an array.
WSPR.prototype.createAccount = function(accessToken, callback) {
  var that = this;
  request.post(this.getUrl() + '/create-account')
    .send({ 'access_token': accessToken })
    .end(function(err, res) {
      if (err) {
        return callback(that.handleNetworkError(err));
      }
      if (res.error) {
        return callback(httpResponseToError(res));
      }
      if (!res.body || !res.body.names) {
        return callback(new Error('createAccount got invalid response from WSPR: missing "names".'));
      }
      // TODO(nlacasse): assert res.body
      callback(null, res.body.names);
    });
};

// Associate an account with an origin on WSPR.  The account must have been
// previously created with createAccount(...).  Input is an account name to use:
// { name: <account name> }
// Response will be 200 OK if association is successful.
WSPR.prototype.assocAccount = function (name, origin, callback) {
  var that = this;
  request.post(this.getUrl() + '/assoc-account')
    .send({
      name: name,
      origin: origin
    }).end(function(err, res) {
      if (err) {
        return callback(that.handleNetworkError(err));
      }
      if (res.error) {
        return callback(httpResponseToError(res));
      }
      callback(null, name);
    });
};

// Helper method that creates the account and associates it with the origin.
WSPR.prototype.createAndAssocAccount = function(accessToken, origin, callback) {
  var wspr = this;
  this.createAccount(accessToken, function(err, names) {
    if (err) {
      return callback(err);
    }
    // Assoc with first name.
    // TODO(ataly, nlacasse): How do we decide which account name to associate with
    // the origin?
    wspr.assocAccount(names[0], origin, callback);
  });
};

// Detects if network error was caused by a missing or unresponsive WSPR, and
// creates a more helpful error message on those cases.  The original error will
// be a CORS error since WSPR is not responding to the preflight OPTIONS
// request.
WSPR.prototype.handleNetworkError = function(err) {
  if (err.crossDomain) {
    return new Error('Cannot connect to WSPR at: ' + this.getUrl());
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
