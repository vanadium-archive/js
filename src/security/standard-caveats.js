var vdlSecurity = require('../v.io/v23/security');

// Register the default caveats from the security package.
module.exports = {
  registerDefaultCaveats: registerDefaultCaveats
};

function registerDefaultCaveats(registry) {
  registry.register(vdlSecurity.ConstCaveat,
    constCaveatValidator);
  registry.register(vdlSecurity.UnixTimeExpiryCaveatX,
    unixTimeExpiryCaveatValidator);
  registry.register(vdlSecurity.ExpiryCaveatX,
    expiryCaveatValidator);
  registry.register(vdlSecurity.MethodCaveatX,
    methodCaveatValidator);
  registry.register(vdlSecurity.PublicKeyThirdPartyCaveatX,
    publicKeyThirdPartyCaveatValidator);
}


function constCaveatValidator(secCtx, value) {
  if (!value) {
    return new vdlSecurity.ConstCaveatValidationError(secCtx.context);
  }
}

function unixTimeExpiryCaveatValidator(secCtx, value) {
  // TEMP will be removed soon so just validate always
}

function expiryCaveatValidator(secCtx, expiry) {
  var now = Date.now();
  if (now > expiry.getTime()) {
    return new vdlSecurity.ExpiryCaveatValidationError(secCtx.context,
      now, expiry);
  }
}

function methodCaveatValidator(secCtx, methods) {
  if (!secCtx.method || methods.length === 0) {
    return;
  }
  for (var i = 0; i < methods.length; i++) {
    if (secCtx.method === methods[i]) {
      return;
    }
  }
  return new vdlSecurity.MethodCaveatValidationError(secCtx.context,
    secCtx.method, methods);
}

function publicKeyThirdPartyCaveatValidator(secCtx, value) {
  // TODO(bprosnitz) Intercept this caveat and handle in go.
}
