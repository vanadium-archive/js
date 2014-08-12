/**
 * @fileoverview Tests of the veyron storage client.
 */
var Veyron = require('../../../src/veyron');
var TestHelper = require('../../test_helper');
var streamToArray = function(stream) {
  var results = [];
  stream.on('data', function(val) {
    if (val) {
      results.push(val);
    }
  });

  return new Veyron.Promise(function(resolve, reject) {
    stream.on('end', function() {
      resolve(results);
    });
    stream.on('error', reject);
  });
};

var expectChanges = function(done, stream, expectedChanges) {
  var finish;
  finish = function(err) {
    done(err);
    finish = function() {};
  };
  stream.on('data', function(changeBatch) {
    if (expectedChanges.length === 0) {
      return finish();
    }
    var changes = changeBatch.changes;
    for (var i = 0; i < changes.length; i++) {
      var change = changes[i];
      var expectedChange = expectedChanges.shift();
      expect(expectedChange.name).to.equal(change.name);
      expect(expectedChange.state).to.equal(change.state);
      if (expectedChange.state === Veyron.Watch.State.Exists) {
        expect(expectedChange.value).to.equal(change.value.value);
      }
      if (expectedChanges.length === 0) {
        return finish();
      }
    }
    return null;
  });
  stream.on('end', function() {
    if (expectedChanges.length > 0) {
      return finish('unexpected end of stream');
    }
  });
  stream.on('error', function(err) {
    finish(err);
  });
};

// TODO(sadovsky): Fix JS store API/impl and re-enable this test.
describe.skip('storage/client.js', function() {
  describe('Transaction-less Methods', function() {
    var itemName = 'notx';
    var valToPutRoot = 'AString';
    var valToPut = {};
    var childName = 'x';
    var childVal = 5;
    var itemVeyronName, dirVeyronName, childVeyronName;

    var expectedMapVal = {};
    expectedMapVal[childName] = childVal;

    var store;
    beforeEach(function() {
      var veyron = new Veyron(TestHelper.veyronConfig);
      store = veyron.newStore();
      dirVeyronName = testconfig['STORED_ENDPOINT'] + '/';
      itemVeyronName = dirVeyronName + itemName;
      childVeyronName = itemVeyronName + '/' + childName;
    });

    it('put() root of store', function() {
      var promise = store.bindTo(dirVeyronName).then(function(s) {
        return s.put(null, valToPutRoot);
      });
      return expect(promise).to.eventually.include.keys(
        ['attrs', 'iD', 'mTimeNS']);
    });

    it('put() succeeds', function() {
      var promise = store.bindTo(itemVeyronName).then(function(s) {
        return s.put(null, valToPut);
      });
      return expect(promise).to.eventually.include.keys(
        ['attrs', 'iD', 'mTimeNS']);
    });

    it('put() succeeds', function() {
      var promise = store.bindTo(childVeyronName).then(function(s) {
        return s.put(null, childVal);
      });
      return expect(promise).to.eventually.include.keys(
        ['attrs', 'iD', 'mTimeNS']);
    });

    // 1 Item now exists in the store.

    it('exist() of created item', function() {
      var promise = store.bindTo(itemVeyronName).then(function(s) {
        return s.exists(null);
      });
      return expect(promise).to.eventually.equal(true);
    });

    // TODO(bprosnitz) Fix setAttr().
    /*
    it('setAttr() of created item', function() {
      var promise = store.bindTo(itemVeyronName).then(function(s) {
        return s.setAttr(null, []);
      });
      return expect(promise).to.eventually.be.fulfilled;
    });
    */

    // TODO(bprosnitz) Fix stat().
    /*
    it('stat() succeeds', function() {
      var promise = store.bindTo(itemVeyronName).then(function(s) {
        return s.stat(null);
      });
      return expect(promise).to.eventually.include.keys(
        ['attrs', 'iD', 'mTimeNS']);
    });*/

    it('get() of created item', function() {
      var promise = store.bindTo(itemVeyronName).then(function(s) {
        return s.get(null);
      });
      return expect(promise).to.eventually.have.property('value').
        and.eql(expectedMapVal);
    });

    it('query()', function() {
      var expectedResults = [
        {
          fields: {},
          name: '',
          nestedResult: 0,
          value: valToPutRoot
        },
        {
          fields: {},
          name: itemName,
          nestedResult: 0,
          value: expectedMapVal
        }
      ];
      var promise = store.bindTo(dirVeyronName).then(function(s) {
        return s.query(null, {
          stmt: '*',
        });
      }).then(streamToArray);
      return expect(promise).to.eventually.eql(expectedResults);
    });

    it('globT()', function() {
      var expectedResults = [itemName];
      var promise = store.bindTo(dirVeyronName).then(function(s) {
        return s.globT(null, '*');
      }).then(streamToArray);
      return expect(promise).to.eventually.eql(expectedResults);
    });

    it('glob()', function() {
      var expectedResults = [
        {
          name: itemName,
          servers: [],
        }
      ];
      var promise = store.bindTo(dirVeyronName).then(function(s) {
        return s.glob('*');
      }).then(streamToArray);
      return expect(promise).to.eventually.eql(expectedResults);
    });

    it('remove() of created item', function() {
      var promise = store.bindTo(itemVeyronName).then(function(s) {
        return s.remove(null);
      });
      return expect(promise).to.be.fulfilled;
    });

    // 0 items now exist in the store.

    it('exist() of removed item', function() {
      var promise = store.bindTo(itemVeyronName).then(function(s) {
        return s.exists(null);
      });
      return expect(promise).to.eventually.eql(false);
    });

    it('watchGlob()', function(done) {
      var watchItemName = 'watch';
      var valToPutWatch = 'q';
      var watchItemVeyronName = dirVeyronName + watchItemName;
      store.bindTo(dirVeyronName).then(function(s) {
        return s.watchGlob('*', Veyron.Watch.ResumeMarkers.Now);
      }).then(function(stream) {
        // Put itemName.
        store.bindTo(watchItemVeyronName).then(function(s) {
          s.put(null, valToPutWatch).then(function() {
            s.remove(null);
          });
        });
        // Expect 3 changes. The first announces that the initial state has
        // been skipped, the second updates the item, and the third removes it.
        var expectedChanges = [
          {
            name: '',
            state: Veyron.Watch.State.InitialStateSkipped,
          },
          {
            name: watchItemName,
            state: Veyron.Watch.State.Exists,
            value: valToPutWatch
          },
          {
            name: watchItemName,
            state: Veyron.Watch.State.DoesNotExist
          },
        ];
        expectChanges(done, stream, expectedChanges);
      });
    });

    // TODO(bprosnitz,tilaks) Add watchQuery test once it's possible.
  });


  describe('Methods w/ Transactions', function() {
    var itemName = 'tx';
    var abortedItemName = 'abandoned';
    var valToPutRoot = 'Str';
    var valToPut = [1, 'A'];
    var itemVeyronName;
    var abortedItemVeyronName;
    var dirVeyronName;

    var store;
    beforeEach(function() {
      var veyron = new Veyron(TestHelper.veyronConfig);
      store = veyron.newStore();
      dirVeyronName = testconfig['STORED_ENDPOINT'] + '/';
      itemVeyronName = dirVeyronName + itemName;
      abortedItemVeyronName = dirVeyronName + abortedItemName;
    });


    // Test committing a transaction:
    var trCommit;
    it('committed tr: can create transaction', function() {
      trCommit = Veyron.Transaction();
      expect(trCommit).to.be.not.null;
    });

    it('committed tr: put() root of store', function() {
      var promise = store.bindTo(dirVeyronName).then(function(s) {
        return s.put(trCommit, valToPutRoot);
      });
      return expect(promise).to.eventually.include.keys(
        ['attrs', 'iD', 'mTimeNS']);
    });

    it('committed tr: check item didnt\'t exist() before put', function() {
      var promise = store.bindTo(itemVeyronName).then(function(s) {
        return s.exists(trCommit);
      });
      return expect(promise).to.eventually.equal(false);
    });

    it('committed tr: put() succeeds', function() {
      var promise = store.bindTo(itemVeyronName).then(function(s) {
        return s.put(trCommit, valToPut);
      });
      return expect(promise).to.eventually.include.keys(
        ['attrs', 'iD', 'mTimeNS']);
    });

    // The item now exists in the store in the context of trCommit.
    it('committed tr: exist() of created item in transaction', function() {
      var promise = store.bindTo(itemVeyronName).then(function(s) {
        return s.exists(trCommit);
      });
      return expect(promise).to.eventually.equal(true);
    });

    it('committed tr: commit() succeeds', function() {
      var promise = trCommit.commit();
      return expect(promise).to.eventually.be.fulfilled;
    });

    // The item now is committed to the store.
    it('committed tr: exist() of item created in transaction', function() {
      var promise = store.bindTo(itemVeyronName).then(function(s) {
        return s.exists(null);
      });
      return expect(promise).to.eventually.equal(true);
    });


    // Test aborting a transaction:
    var trAbort;
    it('aborted tr: can create transaction', function() {
      trAbort = Veyron.Transaction();
      expect(trAbort).to.be.not.null;
    });

    it('aborted tr: check item didnt\'t exist() before put', function() {
      var promise = store.bindTo(abortedItemVeyronName).then(function(s) {
        return s.exists(trAbort);
      });
      return expect(promise).to.eventually.equal(false);
    });

    it('aborted tr: put() succeeds', function() {
      var promise = store.bindTo(abortedItemVeyronName).then(function(s) {
        return s.put(trAbort, valToPut);
      });
      return expect(promise).to.eventually.include.keys(
        ['attrs', 'iD', 'mTimeNS']);
    });

    // The item should now exist in the context of trAbort.
    it('aborted tr: exist() of created item in transaction', function() {
      var promise = store.bindTo(abortedItemVeyronName).then(function(s) {
        return s.exists(trAbort);
      });
      return expect(promise).to.eventually.equal(true);
    });

    it('aborted tr: abort() succeeds', function() {
      var promise = trAbort.abort();
      return expect(promise).to.eventually.be.fulfilled;
    });

    it('aborted tr: item created in transaction does not exist', function() {
      var promise = store.bindTo(abortedItemVeyronName).then(function(s) {
        return s.exists(null);
      });
      return expect(promise).to.eventually.equal(false);
    });

    // TODO(bprosnitz) Fix setAttr().
    /*
    it('setAttr() of created item', function() {
      var promise = store.bindTo(itemVeyronName).then(function(s) {
        return s.setAttr(null, []);
      });
      return expect(promise).to.eventually.be.fulfilled;
    });
    */

    // TODO(bprosnitz) Fix stat().
    /*
    it('stat() succeeds', function() {
      var promise = store.bindTo(itemVeyronName).then(function(s) {
        return s.stat(null);
      });
      return expect(promise).to.eventually.include.keys(
        ['attrs', 'iD', 'mTimeNS']);
    });*/

    it('get() of created item', function() {
      var tr = Veyron.Transaction();
      var promise = store.bindTo(itemVeyronName).then(function(s) {
        return s.get(tr);
      });
      return expect(promise).to.eventually.property('value').and.eql(valToPut);
    });

    it('query()', function() {
      var expectedResults = [
        {
          fields: {},
          name: '',
          nestedResult: 0,
          value: valToPutRoot
        },
        {
          fields: {},
          name: itemName,
          nestedResult: 0,
          value: valToPut
        }
      ];
      var tr = Veyron.Transaction();
      var promise = store.bindTo(dirVeyronName).then(function(s) {
        return s.query(tr, {
          stmt: '*',
        });
      }).then(streamToArray);
      return expect(promise).to.eventually.eql(expectedResults);
    });

    it('globT()', function() {
      var tr = Veyron.Transaction();
      var expectedResults = [itemName];
      var promise = store.bindTo(dirVeyronName).then(function(s) {
        return s.globT(tr, '*');
      }).then(streamToArray);
      return expect(promise).to.eventually.eql(expectedResults);
    });

    it('remove() of created item', function() {
      var tr = Veyron.Transaction();
      var promise = store.bindTo(itemVeyronName).then(function(s) {
        return s.remove(tr);
      }).then(function() {
        return tr.commit();
      });
      return expect(promise).to.be.fulfilled;
    });

    // 0 items now exist in the store.

    it('exist() of removed item', function() {
      var tr = Veyron.Transaction();
      var promise = store.bindTo(itemVeyronName).then(function(s) {
        return s.exists(tr);
      });
      return expect(promise).to.eventually.equal(false);
    });
  });

  // TODO(bprosnitz) Add tests of using the store with a number of data types.
});
