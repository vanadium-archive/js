var Deferred = require('../../src/lib/deferred');

module.exports = {
  cacheMap: {},
  set: function(key, value) {
    this.cacheMap[key] = value;
  },
  get: function(key) {
    var def = new Deferred();
    var val = this.cacheMap[key];
    if (val === undefined) {
      def.reject('unknown key');
    } else {
      def.resolve(val);
    }
    return def.promise;
  } ,
  multiGet: function($stream) {
    var def = new Deferred();
    $stream.on('end', function() {
      def.resolve();
    });

    $stream.on('error', function(e) {
      def.reject(e);
    });
    var self = this;
    $stream.on('data', function(key) {
      if (key !== null) {
        var val = self.cacheMap[key];
        if (val === undefined) {
          def.reject('unknown key');
        }
        $stream.write(val);
      }
    });
    $stream.read();
    return def.promise;
  }
};
