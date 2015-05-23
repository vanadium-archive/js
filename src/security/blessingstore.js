// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Blessing store stub for vanadium blessing stores
 * @private
 */

 var Deferred = require('../lib/deferred');
 var Blessings = require('./blessings');
 var verror = require('../gen-vdl/v.io/v23/verror');

 module.exports = BlessingStore;

/**
  * A callback that is called with either an error or a
  * [Blessings]{@link module:vanadium.security~Blessings} object.
  * @callback module:vanadium.security.BlessingStore~blessingsCb
  * @param {Error} err If set, the error that occured.
  * @param {module:vanadium.security~Blessings} blessings The blessings result.
  */
/**
  * A callback that is called with either an error or a
  * map from [BlessingsPattern]{@link module:vanadium.security~BlessingsPattern}
  * to [Blessings]{@link module:vanadium.security~Blessings}.
  * @callback module:vanadium.security.BlessingStore~peerBlessingsCb
  * @param {Error} err If set, the error that occured.
  * @param {Map<module:vanadium.security~BlessingsPattern,
  * module:vanadium.security~Blessings>} peerBlessings The peer blessings.
  */
/**
  * A callback that is called with either an error or a
  * [string] object.
  * @callback module:vanadium.security.BlessingStore~stringCb
  * @param {Error} err If set, the error that occured.
  * @param {string} str The string result.
  */
/**
  * A callback that has an error argument that may be falsy.
  * @callback module:vanadium.security.BlessingStore~onlyErrCb
  * @param {Error} err If set, the error that occured.
  */
 /**
  * @summary BlessingStore is a mapping between remote blessing string and
  * local blessing.
  * @description BlessingStore is the interface for storing blessings bound to
  * a principal and managing the subset of blessings to be presented to
  * particular peers.
  * This constructor should not be called directly. The BlessingStore can be
  * obtained from the principal object.
  * @constructor
  * @inner
  * @memberof module:vanadium.security
  */
 function BlessingStore(controller) {
   this._controller = controller;
 }

 /**
  * Sets an entry in the blessing store.
  * @param {module:vanadium.context.Context} ctx The context.
  * @param {module:vanadium.security~Blessings} blessings The blessings object.
  * @param {string} pattern The blessing match pattern.
  * @param {module:vanadium.security.BlessingStore~blessingsCb} cb An optional
  * callback that will return the blessing.
  * @return {Promise<module:vanadium.security~Blessings>} A promise that will
  * be resolved with the blessing.
  */
 BlessingStore.prototype.set = function(
   ctx, blessings, pattern, cb) {
   var def = new Deferred(cb);
   if (blessings === undefined) {
     def.reject(new verror.BadArgError(ctx,
       'Blessings handle not specified'));
     return def.promise;
   }
   if (pattern === undefined) {
     def.reject(new verror.BadArgError(ctx,
       'Pattern not specified'));
     return def.promise;
   }

   return this._controller.blessingStoreSet(ctx, blessings._id, pattern, cb);
 };

 /**
  * forPeer gets the set of blessings that have been previously
  * added to the store with an intent of being shared with peers
  * that have at least one of the provided blessings.
  * @param {module:vanadium.context.Context} ctx The context.
  * @param {...string} blessingNames The names of the blessings.
  * @param {module:vanadium.security.BlessingStore~blessingsCb} cb An optional
  * callback that will return the blessing.
  * @return {Promise<module:vanadium.security~Blessings>} A promise that will
  * be resolved with the blessing.
  */
 BlessingStore.prototype.forPeer = function(
   ctx/*, blessingName1, blessingName2, ..., cb */) {

   var args = Array.prototype.slice.call(arguments);
   args.shift(); // remove ctx

   var cb;
   if (args.length > 0 && typeof args[args.length - 1] === 'function') {
     cb = args.pop();
   }

   var blessingNames = args;
   return this._controller.blessingStoreForPeer(ctx, blessingNames, cb);
 };

 /**
  * setDefault sets up the Blessings made available on a subsequent call
  * to getDefault.
  * <br>
  * It is an error to call setDefault with a blessings whose public key
  * does not match the PublicKey of the principal for which this store
  * hosts blessings.
  * @param {module:vanadium.context.Context} ctx The context.
  * @param {module:vanadium.security~Blessings} blessings The blessings object.
  * @param {module:vanadium~voidCb} cb An optional callback that has no output
  * value.
  * @return {Promise} A promise that will be resolved without an output
  * value.
  */
 BlessingStore.prototype.setDefault = function(
   ctx, blessings, cb) {
   if (blessings === undefined) {
     var def = new Deferred(cb);
     def.reject(new verror.BadArgError(ctx,
       'Blessings handle not specified'));
     return def.promise;
   }

   return this._controller.blessingStoreSetDefault(ctx, blessings._id, cb);
 };

 /**
  * getDefault returns the blessings to be shared with peers for which
  * no other information is available in order to select blessings
  * from the store.
  * <br>
  * For example, getDefault can be used by servers to identify themselves
  * to clients before the client has identified itself.
  * @param {module:vanadium.context.Context} ctx The context.
  * @param {module:vanadium.security.BlessingStore~blessingsCb} cb An optional
  * callback that will return the blessing.
  * @return {Promise<module:vanadium.security~Blessings>} A promise that will
  * be resolved with the blessing.
  */
 BlessingStore.prototype.getDefault = function(
   ctx, cb) {
   return this._controller.blessingStoreDefault(ctx, cb);
 };

 /**
  * getPublicKey returns the public key of the Principal for which
  * this store hosts blessings.
  * @param {module:vanadium.context.Context} ctx The context.
  * @param {module:vanadium.security.BlessingStore~stringCb} cb An optional
  * callback that will return the public key as a string.
  * @return {Promise<string>} A promise that will
  * be resolved with the public key as a string.
  */
 BlessingStore.prototype.getPublicKey = function(
   ctx, cb) {
   return this._controller.blessingStorePublicKey(ctx, cb);
 };

 /**
  * getPeerBlessings returns all the blessings that the BlessingStore
  * currently holds for various peers.
  * @param {module:vanadium.context.Context} ctx The context.
  * @param {module:vanadium.security.BlessingStore~peerBlessingsCb} cb An
  * optional callback that will return the public key as a string.
  * @return {Promise<Map<module:vanadium.security~BlessingsPattern,
  * module:vanadium.security~Blessings>>} A promise that will
  * be resolved with the peer blessings.
  */
 BlessingStore.prototype.getPeerBlessings = function(
   ctx, cb) {
   var def = new Deferred(cb);
   var controller = this._controller;
   controller.blessingStorePeerBlessings(ctx)
   .then(function(peerBlessings) {
     var outPeerBlessings = new Map();
     peerBlessings.forEach(function(jsBlessings, pattern) {
       var blessingObj = new Blessings(
         jsBlessings.handle,
         jsBlessings.publicKey,
         controller);
       outPeerBlessings.set(pattern, blessingObj);
     });
     def.resolve(outPeerBlessings);
   }).catch(function(err) {
     def.reject(err);
   });
   return def.promise;
 };

 /**
  * getDebugString return a human-readable string description of the store.
  * @param {module:vanadium.context.Context} ctx The context.
  * @param {module:vanadium.security.BlessingStore~stringCb} cb An optional
  * callback that will return the debug string.
  * @return {Promise<string>} A promise that will
  * be resolved with the debug string.
  */
 BlessingStore.prototype.getDebugString = function(
   ctx, cb) {
   return this._controller.blessingStoreDebugString(ctx, cb);
 };
