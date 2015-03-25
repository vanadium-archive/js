// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Generator of typeless service signature from JavaScript object.
 * @private
 */

module.exports = ReflectSignature;

var ArgInspector = require('../lib/arg-inspector');
var isPublicMethod = require('../lib/service-reflection').isPublicMethod;
var vdlUtil = require('./util');
var format = require('format');

/**
  * Create a signature for a service by inspecting the service object.
  * @private
  * @param {Service} service The service.
  * @constructor
  */
function ReflectSignature(service) {
  if (!(this instanceof ReflectSignature)) {
    return new ReflectSignature(service);
  }

  var signature = this;

  signature.methods = [];

  // NOTE: service.hasOwnProperty(key) is intentionally omitted so that
  // methods defined on the prototype chain are mapped into the signature
  // correctly. This supports services defined using constructors:
  //
  //     function Service() {
  //
  //     }
  //
  //     Service.prototype.method = function() {
  //
  //     }
  //
  // TODO(jasoncampbell): At some point we should try to avoid inherited
  // properties so we don't unintentionally publish a service's internal
  // implementation where inheritence has been used (event emitters etc.).
  //
  // SEE: http://git.io/mi6jDg
  // SEE: veyron/release-issues#657
  for (var key in service) { // jshint ignore:line
    if (!isPublicMethod(key, service)) {
      continue;
    }

    var method = service[key];
    var methodSignature = {
      name: vdlUtil.capitalize(key),
      streaming: false
    };

    var argInspector = new ArgInspector(method);

    if (!argInspector.hasContext()) {
      var message = format('Service method "%s" is missing the required ' +
        '`context` object as the first argument in its definition. ' +
        'Args were: %s',
          key, argInspector.names);
      throw new Error(message);
    }

    methodSignature.inArgs = argInspector.filteredNames.map(function(name) {
      return { name: name };
    });

    methodSignature.streaming = argInspector.contains('$stream');

    // Add this method's signature to it's service signature
    signature.methods.push(methodSignature);
  }
}
