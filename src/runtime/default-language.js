// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = normalize(detectLanguage());
function detectLanguage() {
  if (typeof this.navigator !== 'undefined') {
    return this.navigator.languages[0];
  }

  if (process.env.LANGUAGE) {
    return process.env.LANGUAGE.split(':')[0];
  }

  if (process.env.LC_ALL) {
    return process.env.LC_ALL.split('-')[0];
  }
  if (process.env.LANG) {
    return process.env.LANG.split('-')[0];
  }
  return 'en-US';
}

function normalize(l) {
  return l.replace('_', '-').split('.')[0];
}
