/**
 * @fileoverview Integration test for a JS server and a JS client communication
 *
 * Grunt's subtask_setupIntegrationTestEnvironment should spawn these servers
 * before running the tests. See Gruntfile's test target for details.
 *
 * Runs in both browser and NodeJS.
 *
 * Only the public "veyron" module is available for integration tests.
 * All globals (veyron, expect, testconfig) are injected by test runners.
 */

describe('Server and client in JS', function() {
  var client;
  var cacheServiceClient;
  var cacheServiceClientUsingEndpoint;
  before(function(done) {

    // Our cache service
    var cache = {
      cacheMap: {},
      Set: function(key, value) {
        this.cacheMap[key] = value;
      },
      Get: function(key) {
        var def = new Veyron.Deferred();
        var val = this.cacheMap[key];
        if (val === undefined) {
          def.reject('unknown key');
        } else {
          def.resolve(val);
        }
        return def.promise;
      } ,
      MultiGet: function($stream) {
        var def = new Veyron.Deferred();
        $stream.promise.then(function() {
          def.resolve();
        }).catch (function(e) {
          def.reject(e);
        });
        var self = this;
        $stream.onmessage = function(key) {
          var val = self.cacheMap[key];
          if (val === undefined) {
            def.reject('unknown key');
          }
          $stream.send(val);
        };

        return def.promise;
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
      expect(endpoint).to.have.string('@1@tcp@127.0.0.1');

      // Create a client to the returned endpoint
      client = veyron.newClient();

      var cacheServiceClientPromise = client.bind(
          'myCache/Cache');

      var cacheServiceClientUsingEndpointPromise = client.bind(
          '/' + endpoint + '/Cache');

      Veyron.Promise.all([cacheServiceClientPromise,
        cacheServiceClientUsingEndpointPromise]).then(function(results) {
        cacheServiceClient = results[0];
        cacheServiceClientUsingEndpoint = results[1];
        done();
      }).catch (done);

    }).catch (function(e) {
      done(e);
    });

  });

  it('Should be able to invoke methods after the service is published ' +
     'using published name', function() {
        var result = cacheServiceClient.Set('foo', 'bar').then(function() {
          return cacheServiceClient.Get('foo');
        });

        return expect(result).to.eventually.become('bar');
      });

  it('Should be able to use objects as arguments and returns', function() {
      var expected = { a: 'foo', b: 2 };
      var result = cacheServiceClient.Set('objkey', expected).then(function() {
        return cacheServiceClient.Get('objkey');
      });

      return expect(result).to.eventually.become(expected);
    });

  it('Should be able to invoke streaming methods after the service is ' +
      'published', function(done) {
        var promise = cacheServiceClient.Set('foo', 'bar');
        var thenGenerator = function(i) {
          return function() {
            cacheServiceClient.Set('' + i, '' + (i + 1));
          };
        };

        for (var i = 0; i < 10; i++) {
          promise = promise.then(thenGenerator(i));
        }

        var nextNumber = 1;
        promise.then(function() {
          return cacheServiceClient.MultiGet();
        }).then(function(stream) {
          stream.onmessage = function(value) {
            expect(value).to.equal('' + nextNumber);
            nextNumber += 2;
          };

          // Now let's send some requests.
          for (var i = 0; i < 10; i += 2) {
            stream.send('' + i);
          }

          stream.close();
          return stream.promise;
        }).then(function() {
          expect(nextNumber).to.equal(11);
          done();
        }).catch (done);
      });

  it('Should be able to return errors', function() {
    var result = cacheServiceClient.Get('bar');
    return expect(result).to.eventually.be.rejected;
  });

  it('Should get an exception calling non-existing methods', function() {
    var fn = function() {
      cacheServiceClient.SomeNonExistingMethod('bar');
    };

    expect(fn).to.throw();
  });

  it('Should be able to invoke methods after the service is published ' +
      'using the endpoint name', function() {
        var result = cacheServiceClientUsingEndpoint.Set('foo', 'bar')
            .then(function() {
              return cacheServiceClientUsingEndpoint.Get('foo');
            });

        return expect(result).to.eventually.equal('bar');

      });

  it('Should fail to bind to the wrong name', function() {
    var service = client.bind('nonexisting/name');
    return expect(service).to.eventually.be.rejected;
  });

  // TODO(aghassemi) tests and implementation for:
  // When JS service returns error
  // Ensure communication fails when service stops
  // Publishing to one proxy and calling to a different one

});
