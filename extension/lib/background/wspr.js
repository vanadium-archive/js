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

// Create an account on WSPR with an identity derived from an access token.
// Currently this is implemented by POSTing to WSPR with the body:
// { access_token: <access_token> }
// Returns the names of the new account in an array.
WSPR.prototype.createAccount = function(accessToken, callback) {
  request.post(this.getUrl() + '/create-account')
    .send({ 'access_token': accessToken })
    .end(function(err, res) {
      if (err) {
        return callback(err);
      }
      if (res.error) {
        return callback(res.error);
      }
      if (!res.body || !res.body.names) {
        return callback(new Error('Invalid response: missing "names".'));
      }
      // TODO(nlacasse): assert res.body
      callback(null, res.body.names);
    });
};

// Associate an account with an origin on WSPR.  The account must have been
// previously created with createAccount(...).  Input is the name of the account
// to use:
// { name: <account name> }
// Response will be 200 OK if association is successful.
WSPR.prototype.assocAccount = function (name, origin, callback) {
  request.post(this.getUrl() + '/assoc-account')
    .send({ name: name })
    .end(function(err, res) {
      if (err) {
        return callback(err);
      }
      if (res.error) {
        return callback(res.error);
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
    // Assoc with the first name.
    wspr.assocAccount(names[0], origin, callback);
  });
};
