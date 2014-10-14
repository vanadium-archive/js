
module.exports = {
  cacheMap: {},
  set: function(key, value) {
    this.cacheMap[key] = value;
  },
  get: function(key, $cb) {
    var val = this.cacheMap[key];
    if (val === undefined) {
      $cb('unknown key');
    } else {
      $cb(null, val);
    }
  } ,
  multiGet: function($cb, $stream) {
    $stream.on('end', function close() {
      $cb(null);
    });
    $stream.on('error', function error(e) {
      $cb(e);
    });
    var self = this;
    $stream.on('data', function(key) {
      if (key !== null) {
        var val = self.cacheMap[key];
        if (val === undefined) {
          $cb(new Error('unknown key'));
        }
        $stream.write(val);
      }
    });
    $stream.read();
  }
};
