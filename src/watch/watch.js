var State = {
  // The entity exists and its full value is included in Value.
  Exists: 0,
  // The entity does not exist.
  DoesNotExist: 1,
  // The root entity and its children may or may not exist. Used only
  // for initial state delivery when the client is not interested in
  // fetching the initial state. See the "Initial State" section
  // above.
  InitialStateSkipped: 2
};

var ResumeMarkers = {
  // UTF-8 encoding of "now".
  Now: [110, 111, 119]
};

module.exports = {};
module.exports.State = State;
module.exports.ResumeMarkers = ResumeMarkers;