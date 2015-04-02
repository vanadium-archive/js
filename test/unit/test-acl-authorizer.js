// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.


var test = require('prova');
var aclAuthorizer = require('../../src/security/acl-authorizer');
var access = require('../../src/gen-vdl/v.io/v23/security/access');
var unwrap = require('../../src/vdl/type-util').unwrap;
var createConstructor = require('../../src/vdl/create-constructor');
var kind = require('../../src/vdl/kind');

require('es6-shim');

var allTags = [
  access.Admin, access.Debug, access.Read, access.Write, access.Resolve];
test('allow same public key access with no other acls', function(assert) {
  var ctx = {
    localBlessings: {
      publicKey: 'me',
    },
    remoteBlessings: {
      publicKey: 'me',
    },
  };

  var auth = aclAuthorizer({}, access.Tag);
  allTags.forEach(function(t) {
    ctx.methodTags = [t];
    assert.equal(auth(ctx), null);
  });

  assert.end();
});

test('full suite of go tests', function(assert) {
  var acl = new Map();
  acl.set(unwrap(access.Read), {
    in: ['server/alice', 'server/che/$', '...'],
    notIn: []
  });

  acl.set(unwrap(access.Write), {
    in: ['server/alice', 'server/che/$', 'server/che'],
    notIn: [ 'server/che/friend' ]
  });

  acl.set(unwrap(access.Admin), {
    in: ['server/alice/$'],
    notIn: []
  });

  acl.set(unwrap(access.Debug), {
    in: ['server/alice/$', 'server/bob'],
    notIn: []
  });

  var auth = aclAuthorizer(acl, access.Tag);
  var expectations = {
    'alice': [access.Read],
    'bob': [access.Read],
    'che': [access.Read],
    'server/alice': [access.Read, access.Write, access.Admin, access.Debug],
    'server/bob': [access.Read, access.Debug],
    'server/alice/friend': [access.Read, access.Write],
    'server/che': [access.Read, access.Write],
    'server/che/friend': [access.Read],
    '': [access.Read],
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

    for (var j = 0; j < allTags.length; j++) {
      var tag = allTags[j];
      var shouldErr = exp.indexOf(tag) === -1;
      ctx.methodTags = [tag];
      var err = auth(ctx);
      if (shouldErr) {
        assert.ok(err !== null, 'name: ' + name + ', tag: ' + tag);
        assert.ok(err instanceof access.NoPermissionsError);
      } else {
        assert.equal(err, null, 'name ' + name + ', tag:' + tag);
      }
    }
  }
  assert.end();
});

test('tags of different types', function(assert) {
  var MyTag = createConstructor({
    kind: kind.STRING,
    name: 'MyTag'
  });
  var myAdmin = new MyTag('Admin');
  var ctx = {
    localBlessings: {
      publicKey: 'me',
    },
    remoteBlessings: {
      publicKey: 'otherkey',
    },
    remoteBlessingStrings: ['server/alice', 'server/bob/friend'],
  };

  var acl = new Map();
  acl.set('Admin', {
    in: ['server/alice'],
    notIn: []
  });
  var tagAuthorizer = aclAuthorizer(acl, access.Tag);
  ctx.methodTags = [myAdmin, access.Resolve];
  var err = tagAuthorizer(ctx);
  assert.ok(err !== null);
  assert.ok(err instanceof access.NoPermissionsError);
  var myTagAuthorizer = aclAuthorizer(acl, MyTag);
  assert.equal(myTagAuthorizer(ctx), null);
  assert.end();
});

test('no tags of a type', function(assert) {
  var MyTag = createConstructor({
    kind: kind.STRING,
    name: 'MyTag'
  });
  var myAdmin = new MyTag('Admin');
  var ctx = {
    localBlessings: {
      publicKey: 'me',
    },
    remoteBlessings: {
      publicKey: 'otherkey',
    },
    remoteBlessingStrings: ['server/alice', 'server/bob/friend'],
  };

  var acl = new Map();
  acl.set('Admin', {
    in: ['server/alice'],
    notIn: []
  });
  var tagAuthorizer = aclAuthorizer(acl, access.Tag);
  ctx.methodTags = [myAdmin];
  var err = tagAuthorizer(ctx);
  assert.ok(err !== null);
  assert.equal(err.id, 'v.io/v23/security/access.errNoMethodTags');
  assert.end();
});

test('multiple tags of a type', function(assert) {
  var ctx = {
    localBlessings: {
      publicKey: 'me',
    },
    remoteBlessings: {
      publicKey: 'otherkey',
    },
    remoteBlessingStrings: ['server/alice', 'server/bob/friend'],
  };

  var acl = new Map();
  acl.set('Admin', {
    in: ['server/alice'],
    notIn: []
  });
  var tagAuthorizer = aclAuthorizer(acl, access.Tag);
  ctx.methodTags = [access.Resolve, access.Debug];
  var err = tagAuthorizer(ctx);
  assert.ok(err !== null);
  assert.equal(err.id, 'v.io/v23/security/access.errMultipleMethodTags');
  assert.end();
});
