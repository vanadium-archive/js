/**
 * @fileoverview Integration test for a JS server and a JS client communication,
 * where the server uses callbacks.
 *
 * Grunt's subtask_setupIntegrationTestEnvironment should spawn these servers
 * before running the tests. See Gruntfile's test target for details.
 *
 * Runs in both browser and NodeJS.
 *
 * Only the public "veyron" module is available for integration tests.
 * All globals (veyron, expect, testconfig) are injected by test runners.
 */

describe('Server and client in JS w/ callback', function() {
  var client;
  var cacheServiceClient;
  before(function(done) {

    // Our cache service
    var cache = {
      cacheMap: {},
      set: function(key, value) {
        this.cacheMap[key] = value;
      },
      get: function(key, $callback) {
        var val = this.cacheMap[key];
        if (val === undefined) {
          $callback('unknown key');
        } else {
          $callback(null, val);
        }
      } ,
      multiGet: function($callback, $stream) {
        $stream.promise.then(function() {
          $callback(null);
        }).catch (function(e) {
          $callback(e);
        });
        var self = this;
        $stream.onmessage = function(key) {
          var val = self.cacheMap[key];
          if (val === undefined) {
            $callback(new Error('unknown key'));
          }
          $stream.send(val);
        };
      }
    };

    var veyronConfig = {
      'proxy': testconfig['WSPR_SERVER_URL'],
      'identityServer': testconfig['IDENTITY_SERVER_URL'],
      'logLevel': testconfig['LOG_LEVEL']
    };

    var veyron = new Veyron(veyronConfig);
    // Create server object and publish the service
    var server = veyron.newServer();

    server.register('Cache', cache).then(function() {
      return server.publish('myCache');
    }).then(function(endpoint) {
      expect(endpoint).to.exist;
      expect(endpoint).to.be.a('string');
      expect(endpoint).to.have.string('@2@tcp@127.0.0.1');

      // Create a client to the returned endpoint
      client = veyron.newClient();

      var cacheServiceClientPromise = client.bind(
          'myCache/Cache');

      cacheServiceClientPromise.then(function(result) {
        cacheServiceClient = result;
        done();
      }).catch (done);

    }).catch (function(e) {
      done(e);
    });

  });

  it('Should be able to invoke methods after the service is published ' +
     'using published name', function() {
        var result = cacheServiceClient.set('foo', 'bar').then(function() {
          return cacheServiceClient.get('foo');
        });

        return expect(result).to.eventually.become('bar');
      });

  it('Should be able to invoke streaming methods after the service is ' +
      'published', function(done) {
        var promise = cacheServiceClient.set('foo', 'bar');
        var thenGenerator = function(i) {
          return function() {
            cacheServiceClient.set('' + i, '' + (i + 1));
          };
        };

        for (var i = 0; i < 6; i++) {
          promise = promise.then(thenGenerator(i));
        }

        var nextNumber = 1;
        promise.then(function() {
          var stream = cacheServiceClient.multiGet();
          stream.onmessage = function(value) {
            expect(value).to.equal('' + nextNumber);
            nextNumber += 2;
          };

          // Now let's send some requests.
          for (var i = 0; i < 6; i += 2) {
            stream.send('' + i);
          }

          stream.close();
          return stream.promise;
        }).then(function() {
          expect(nextNumber).to.equal(7);
          done();
        }).catch (done);
      });

  it('Should be able to return errors', function() {
    var result = cacheServiceClient.get('bar');
    return expect(result).to.eventually.be.rejected;
  });

  // TODO(aghassemi) tests and implementation for:
  // Ensure communication fails when service stops
  // Publishing to one proxy and calling to a different one

});
