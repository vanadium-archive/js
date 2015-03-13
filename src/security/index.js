var extend = require('xtend');

module.exports = extend(
  require('../gen-vdl/v.io/v23/security'),
  require('../gen-vdl/v.io/v23/services/security/access'), {
  aclAuthorizer: require('./acl-authorizer')
});
