// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * Represents the action expected to be performed by a typical client receiving
 * an error that perhaps it does not understand.
 * @namespace actions
 * @memberof module:vanadium.verror
 */
module.exports = {
  /**
   * Do not retry.
   * @const
   * @memberof module:vanadium.verror.actions
   */
  NO_RETRY: 'NoRetry',
  /**
   * Renew high-level connection/context.
   * @const
   * @memberof module:vanadium.verror.actions
   */
  RETRY_CONNECTION: 'RetryConnection',
  /**
   * Refetch and retry (e.g., out of date HTTP ETag).
   * @const
   * @memberof module:vanadium.verror.actions
   */
  RETRY_REFETCH: 'RetryRefetch',
  /**
   * Backoff and retry a finite number of times.
   * @const
   * @memberof module:vanadium.verror.actions
   */
  RETRY_BACKOFF: 'RetryBackoff'
};