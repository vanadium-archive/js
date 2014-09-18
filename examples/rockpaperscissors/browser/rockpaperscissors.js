// This file was auto-generatead by the veyron vdl tool.
(function (name, context, definition) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = definition();
  } else {
    context.vdls = context.vdls || {};
    context.vdls[name] = definition();
  }
})('veyron/examples/rockpaperscissors', this, function() {
  var services = {
    package: 'veyron/examples/rockpaperscissors',
    Judge: {
      createGame: {
	    numInArgs: 1,
	    numOutArgs: 1,
	    inputStreaming: false,
	    outputStreaming: false
      },
      play: {
	    numInArgs: 1,
	    numOutArgs: 1,
	    inputStreaming: true,
	    outputStreaming: true
      },
  
    },
    Player: {
      challenge: {
	    numInArgs: 3,
	    numOutArgs: 0,
	    inputStreaming: false,
	    outputStreaming: false
      },
  
    },
    ScoreKeeper: {
      record: {
	    numInArgs: 1,
	    numOutArgs: 0,
	    inputStreaming: false,
	    outputStreaming: false
      },
  
    },
    RockPaperScissors: {
      createGame: {
	    numInArgs: 1,
	    numOutArgs: 1,
	    inputStreaming: false,
	    outputStreaming: false
      },
      play: {
	    numInArgs: 1,
	    numOutArgs: 1,
	    inputStreaming: true,
	    outputStreaming: true
      },
      challenge: {
	    numInArgs: 3,
	    numOutArgs: 0,
	    inputStreaming: false,
	    outputStreaming: false
      },
      record: {
	    numInArgs: 1,
	    numOutArgs: 0,
	    inputStreaming: false,
	    outputStreaming: false
      },
  
    },
  
  };
  return services;
});