var test = require('prova');

var config = require('./default-config');
var vanadium = require('../../');
var verror = vanadium.errors;

function end(t, rt, err) {
  t.error(err);
  rt.close(t.end);
}

test('Test passing valid options to client.callOption()', function(t) {
  vanadium.init(config, function(err, rt) {
    if (err) {
      return t.end(err);
    }

    var client = rt.newClient();

    var opts = client.callOptions({ });
    t.ok(opts, 'with no options should succeed');

    opts = client.callOptions({
      allowedServersPolicy: ['foo']
    });
    t.ok(opts, 'with allowedOptions should succeed');

    end(t, rt);
  });
});

test('Test passing invalid options to client.callOption()', function(t) {
  vanadium.init(config, function(err, rt) {
    if (err) {
      return t.end(err);
    }

    var client = rt.newClient();

    t.throws(function() {
      client.callOptions({
        invalid: 'key'
      });
    },
    verror.BadArgError,
    ' with one invalid option should throw BadArgError');

    t.throws(function() {
      client.callOptions({
        allowedServersPolicy: ['foo'],
        'invalid': 'key'
      });
    },
    verror.BadArgError,
    'with one valid and one invalid option should throw BadArgError');

    end(t, rt);
  });
});

test('Test passing allowedServersPolicy that matches server blessings',
  function(t) {
  vanadium.init(config, function(err, rt) {
    if (err) {
      return t.end(err);
    }

    var ctx = rt.getContext();
    var client = rt.newClient();

    client.bindTo(ctx, 'test_service/cache', function(err, cache) {
      if (err) {
        return end(t, rt, err);
      }

      var callOpts = client.callOptions({
        allowedServersPolicy: ['test']
      });

      cache.set(ctx, 'foo', 'bar', callOpts, function(err) {
        end(t, rt, err);
      });
    });
  });
});

test('Test passing allowedServersPolicy that does not match server blessings',
  function(t) {
  vanadium.init(config, function(err, rt) {
    if (err) {
      return t.end(err);
    }

    var ctx = rt.getContext();
    var client = rt.newClient();

    client.bindTo(ctx, 'test_service/cache', function(err, cache) {
      if (err) {
        return end(t, rt, err);
      }

      var callOpts = client.callOptions({
        allowedServersPolicy: ['bad/blessings']
      });

      cache.set(ctx, 'foo', 'bar', callOpts, function(err) {
        t.ok(err, 'should error');
        end(t, rt);
      });
    });
  });
});
