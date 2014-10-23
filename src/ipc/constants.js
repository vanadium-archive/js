/**
 * @fileoverview Constants related to ipc.
 */

module.exports = {
  // NO_TIMEOUT is a special value sent over the wire to indicate
  // that the call should have no timeout.  It is:
  // (2^63 - 1) / 1000000.  The (2^63 - 1) is the equivalant constant in Go
  // and the 1000000 is a conversion from ns to ms.
  NO_TIMEOUT: 9223372036854
};
