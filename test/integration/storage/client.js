/**
 * @fileoverview Tests of the veyron storage client.
 */
'use strict';

var streamToArray = function(stream) {
  var results = [];
  stream.on('readable', function() {
    var val = stream.read();
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

describe('storage/client.js', function() {
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
          'fields': {},
          'name': '',
          'nestedResult': 0,
          'value': valToPutRoot
        },
        {
          'fields': {},
          'name': itemName,
          'nestedResult': 0,
          'value': expectedMapVal
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
          'name': itemName,
          'servers': [],
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

    // TODO(bprosnitz) Add watch test once it's possible.
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
          'fields': {},
          'name': '',
          'nestedResult': 0,
          'value': valToPutRoot
        },
        {
          'fields': {},
          'name': itemName,
          'nestedResult': 0,
          'value': valToPut
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