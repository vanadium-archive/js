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
}


function constCaveatValidator(call, callSide, value) {
  if (!value) {
    return new vdlSecurity.ConstCaveatValidationError(call.context);
  }
  return null;
}

function expiryCaveatValidator(call, callSide, expiry) {
  var now = Date.now();
  if (now > expiry.getTime()) {
    return new vdlSecurity.ExpiryCaveatValidationError(call.context,
      now, expiry);
  }
  return null;
}

function methodCaveatValidator(call, callSide, methods) {
  if (!call.method || methods.length === 0) {
    return null;
  }
  for (var i = 0; i < methods.length; i++) {
    if (call.method === methods[i]) {
      return null;
    }
  }
  return new vdlSecurity.MethodCaveatValidationError(call.context,
    call.method, methods);
}
