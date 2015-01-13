
var minimatch = require('minimatch');
module.exports = Glob;

var minimatchOptions = {
  nobrace: true,
  noext: true,
  nonegate: true,
};

function Glob(pattern) {
  if (typeof pattern !== 'string') {
    throw new Error('pattern needs to be a string, not a ' +
                    (typeof pattern));
  }
  if (!(this instanceof Glob)) {
    return new Glob(pattern);
  }

  this.elems = [];
  this.recursive = false;
  this.restricted = false;
  if (pattern !== '') {
    this.elems = pattern.split('/');
    var lastIndex = this.elems.length - 1;
    if (this.elems[lastIndex] === '...') {
      this.recursive = true;
      this.elems = this.elems.slice(0, lastIndex);
    } else if (this.elems[lastIndex] === '***') {
      this.recursive = true;
      this.restricted = true;
      this.elems = this.elems.slice(0, lastIndex);
    }
  }
  // TODO(bjornick): Make sure that the glob input is actually valid.
  // We don't need to do this now, but we do need to do it once we move
  // more of the ipc implementation to JS.
  this.patterns = this.elems.map(function(elem) {
    return minimatch.makeRe(elem, minimatchOptions);
  });
}

Glob.prototype.length = function() {
  return this.elems.length;
};

Glob.prototype.finished = function() {
  return this.length() === 0 && !this.recursive;
};

Glob.prototype.matchInitialSegment = function(elem) {
  if (this.length() === 0) {
    if (!this.recursive) {
      return { match: false, remainder: null};
    }
    return {match: true, remainder: this};
  }

  if (this.patterns[0].test(elem)) {
    return { match: true, remainder: stripFirstPath(this)};
  }

  return { match: false };
};

Glob.prototype.toString = function() {
  var pat = this.elems.join('/');
  if (this.recursive) {
    if (pat !== '') {
      pat += '/';
    }
    pat += '...';
  }
  return pat;
};

function stripFirstPath(glob) {
  var g = new Glob('');
  g.elems = glob.elems.slice(1);
  g.patterns = glob.patterns.slice(1);
  g.recursive = glob.recursive;
  return g;
}
