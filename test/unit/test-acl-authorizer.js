
var test = require('prova');
var aclAuthorizer = require('../../src/security/acl-authorizer');
var verror = require('../../src/v.io/core/veyron2/verror2/verror2');
var Labels = require('../../src/security/labels');

test('allow same public key access with no other acls', function(assert) {
  var ctx = {
    localBlessings: {
      publicKey: 'me',
    },
    remoteBlessings: {
      publicKey: 'me',
    },
  };

  var auth = aclAuthorizer({});
  for (var l in Labels) {
    if (!Labels.hasOwnProperty(l)) {
      continue;
    }
    ctx.label = Labels[l];
    assert.equal(auth(ctx), null);
  }

  assert.end();
});

test('full suite of go tests', function(assert) {
  var acl = {
    in: {
      '...': [Labels.READ],
      'server/alice/...': [Labels.WRITE, Labels.READ],
      'server/alice': [Labels.ADMIN, Labels.DEBUG, Labels.MONITORING],
      'server/bob': [Labels.DEBUG, Labels.MONITORING],
      'server/che/...': [Labels.WRITE, Labels.READ],
      'server/che/': [Labels.WRITE, Labels.READ],
    },
    notIn: {
      'server/che/friend': [Labels.WRITE],
    }
  };

  var auth = aclAuthorizer(acl);
  var expectations = {
    'alice': [Labels.READ],
    'bob': [Labels.READ],
    'che': [Labels.READ],
    'server/alice': [Labels.READ, Labels.WRITE, Labels.ADMIN, Labels.DEBUG,
      Labels.MONITORING],
    'server/bob': [Labels.READ, Labels.DEBUG, Labels.MONITORING],
    'server/alice/friend': [Labels.READ, Labels.WRITE],
    'server/che': [Labels.READ, Labels.WRITE],
    'server/che/friend': [Labels.READ],
    '': [Labels.READ],
  };

  for (var name in expectations) {
    if (!expectations.hasOwnProperty(name)) {
      continue;
    }
    var ctx = {
      localBlessings: {
        publicKey: 'me',
      },
      remoteBlessings: {
        publicKey: 'otherkey',
      },
      remoteBlessingStrings: [name],
    };
    var exp = expectations[name];

    for (var l in Labels) {
      if (!Labels.hasOwnProperty(l)) {
        continue;
      }
      var shouldErr = exp.indexOf(Labels[l]) === -1;
      ctx.label = Labels[l];
      var err = auth(ctx);
      if (shouldErr) {
        assert.ok(err !== null, 'name: ' + name + ', l: ' + l);
        assert.ok(err instanceof verror.NoAccessError);
      } else {
        assert.equal(err, null, 'name ' + name + ', l:' + l);
      }
    }
  }
  assert.end();
});
