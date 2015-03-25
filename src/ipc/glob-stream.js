// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var Transform = require('stream').Transform;
var inherits = require('inherits');

module.exports = GlobStream;

function GlobStream() {
  if (!(this instanceof GlobStream)) {
    return new GlobStream();
  }
  Transform.call(this, { objectMode: true});
}

inherits(GlobStream, Transform);


GlobStream.prototype._transform = function(data, encoding, callback) {
  callback(null, data);
};
