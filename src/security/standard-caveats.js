var vdlSecurity = require('../gen-vdl/v.io/v23/security');

// Register the default caveats from the security package.
module.exports = {
  registerDefaultCaveats: registerDefaultCaveats
};

function registerDefaultCaveats(registry) {
  registry.register(vdlSecurity.ConstCaveat,
    constCaveatValidator);
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
  return null;
}

function expiryCaveatValidator(secCtx, expiry) {
  var now = Date.now();
  if (now > expiry.getTime()) {
    return new vdlSecurity.ExpiryCaveatValidationError(secCtx.context,
      now, expiry);
  }
  return null;
}

function methodCaveatValidator(secCtx, methods) {
  if (!secCtx.method || methods.length === 0) {
    return null;
  }
  for (var i = 0; i < methods.length; i++) {
    if (secCtx.method === methods[i]) {
      return null;
    }
  }
  return new vdlSecurity.MethodCaveatValidationError(secCtx.context,
    secCtx.method, methods);
}

function publicKeyThirdPartyCaveatValidator(secCtx, value) {
  // TODO(bprosnitz) Intercept this caveat and handle in go.
  return null;
}