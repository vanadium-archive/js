// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var vlog = require('./vlog');

module.exports = emitStreamError;

/*
 * Emits an error event on an stream object.
 * NOTE: nodejs streams throw an exception on emit(error) if stream does
 * not have at least one error handler attached to it.
 * Therefore we won't emit error if there is no handler and show a warn message.
 * See http://goo.gl/4hnDCh for details.
 */
function emitStreamError(stream, err) {
  if (!stream) {
    return;
  }
  if(stream.listeners('error').length === 0) {
    vlog.logger.warn('Error received on a stream but there are no error ' +
          'handlers attached to the stream', err);
  } else {
    stream.emit('error', err);
  }
}
