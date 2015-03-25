// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var logLevels = require('../../../src/veyron').logLevels;

/*
 * Optional configuration to be used to create the Veyron object.
 * It specifies location of services that Veyron depends on such as identity
 * server and proxy daemons.
 *
 * If not specified, public Google-hosted daemons will be used.
 * TODO(aghassemi) Use Vonery and remove this before release
 */
veyronConfig = {
  // Log severity, INFO means log anything equal or more severe than INFO
  // One of NOLOG, ERROR, WARNING, DEBUG, INFO
  'logLevel': logLevels.ERROR,

  // Daemon that handles JavaScript communication with the rest of Veyron
  'wspr': 'http://localhost:8124'
};

module.exports = veyronConfig;
