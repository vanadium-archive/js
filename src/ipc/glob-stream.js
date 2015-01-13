var Transform = require('stream').Transform;
var inherits = require('util').inherits;

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
