(function() {

var veyron = new Veyron(veyronConfig);

/**
 * encapsulates all the logic to play the rock-paper-scissors game.
 * @constructor
 */
function RPSGame() {
  var self = this;
  this._busy = false;
  this._client = veyron.newClient();

  // TODO(rthellend): The JS Namespace implementation doesn't yet support
  // glob(). We have to talk to the mounttable server directly for now.
  this._client.bindTo(veyronConfig.mounttableRoot).then(function bindMt(mt) {
    self._mt = mt;
    self._reset();
  }).catch(function bindMtFail(err) {
    self._fatal('bindTo(' + veyronConfig.mounttableRoot + '):', err);
  });

  this._startServer();
}

/**
 * resets the internal state such that a new game can be started.
 * @private
 */
RPSGame.prototype._reset = function () {
  UI.resetGame();
  this._busy = false;
  this._initParticipants();
};

/**
 * used to report a fatal error.
 * @param {string} msg A description of the context of the error.
 * @param {object} err The error.
 * @private
 */
RPSGame.prototype._fatal = function(msg, err) {
  console.error('FATAL:', msg, err);
  UI.debug('FATAL:' + msg + err);
  this._reset();
};

/**
 * starts the process of retrieving the list of judges and players.
 * @private
 */
RPSGame.prototype._initParticipants = function() {
  this._findParticipants('judge');
  this._findParticipants('player');
};

/**
 * retrieves a list of judges or players from the mounttable.
 * @param {string} type The type of participant, e.g. 'judge' or 'player'.
 * @param {Element} elem The element to update.
 * @private
 */
RPSGame.prototype._findParticipants = function(type, elem) {
  var promise = this._mt.glob('rps/' + type + '/*');
  var stream = promise.stream;

  var self = this;
  var participants = [];
  stream.on('data', function ondata(mountEntry) {
    var name = mountEntry.name.replace(/^.*[/]/, '')
    if (name !== self._publishedName) {
      participants.push({name: name, server: mountEntry.name});
    }
  });

  promise.then(function globResult() {
    // We have all the results.
    participants.sort(function(a, b) {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
    UI.updateParticipants(type, participants);
  });
};

/**
 * starts a server that implements the Player and ScoreKeeper interfaces.
 * @private
 */
RPSGame.prototype._startServer = function() {
  if (this._server) {
    console.error('server is already running');
    return;
  }
  var self = this;
  var service = {
    // Player interface
    challenge: function serviceChallenge(addr, gameId, gameOpts) { return self._challenge(addr, gameId, gameOpts); },
    // ScoreKeeper interface
    record: function serviceRecord(a) { return UI.displayScoreCard(a); }
  };
  this._server = veyron.newServer();
  this._server.addIDL(window.vdls['veyron/examples/rockpaperscissors']);

  // TODO(rthellend): Find a better way to get a unique-ish ID.
  this._publishedName = 'browser-' + Math.floor(Math.random() * 90000 + 10000);

  Promise.all([
    this._server.serve('rps/player/' + this._publishedName, service, ['veyron/examples/rockpaperscissors.Player', 'veyron/examples/rockpaperscissors.ScoreKeeper']),
    this._server.serve('rps/scorekeeper/' + this._publishedName, service, ['veyron/examples/rockpaperscissors.Player', 'veyron/examples/rockpaperscissors.ScoreKeeper'])
  ]).then(function published() {
    console.log('published successfully');
  }).catch(function publishFail(err) {
    self._fatal('publish:', err);
  });
};

/**
 * receives a Challenge RPC (Player interface).
 * @param {string} addr The address of the judge hosting the game.
 * @param {<GameID>} id The GameID.
 * @param {<GameOptions>} opts The GameOptions.
 * @return {<Error>}
 * @private
 */
RPSGame.prototype._challenge = function(addr, id, opts) {
  console.info('challenge received:', addr, id, opts);
  if (this._busy) {
    console.log('BUSY - Auto-decline');
    return Promise.reject(new Error('player is busy'));
  }
  this._busy = true;
  var self = this;

  var p = UI.challengePrompt(opts);
  p.then(function() {
    UI.startGame();
    self._playGame(addr, id);
  });
  p.catch(function() {
    self._busy = false;
  });
  return p;
};

/**
 * initiates a new game on behalf of the user.
 *
 * First, we contact the selected judge to create a new game. Then, we send a
 * challenge to the selected opponent. When the challenge is accepted, we play
 * the game.
 */
RPSGame.prototype.initiateGame = function() {
  UI.startGame();
  this._busy = true;
  var settings = UI.getSettings();

  var self = this;

  var judge = null;
  var opponent = null;
  var gameId = null;
  var opts = {NumRounds: settings.numRounds, GameType: settings.gameType};

  // Get stubs for judgeAddr and opponentAddr.
  Promise.all([
    this._client.bindTo(settings.judgeAddr),
    this._client.bindTo(settings.opponentAddr)
  ]).then(function bindDone(stubs) {
    judge = stubs[0];
    opponent = stubs[1];
    console.info('sending createGame:', opts);
    return judge.createGame(opts);
  }).then(function createGameDone(id) {
    gameId = id;
    console.info('createGame returned GameID:', gameId);
    console.info('sending challenge:', settings.judgeAddr, gameId, opts);
    return opponent.challenge(settings.judgeAddr, gameId, opts);
  }).then(function challengeDone(result) {
    console.info('challenge accepted:', result);
    self._playGame(settings.judgeAddr, gameId);
  }).catch(function(err) {
    self._fatal('initiateGame:', err);
  });
};

/**
 * joins a game that was already set up.
 * @param {string} judgeAddr The veyron address of the judge.
 * @param {<GameID>} gameId The game id of the game to join.
 * @private
 */
RPSGame.prototype._playGame = function(judgeAddr, gameId) {
  var self = this;
  this._client.bindTo(judgeAddr).then(function bindJudge(judge) {
    console.info('sending play:', gameId);
    var promise = judge.play(gameId);
    var stream = promise.stream;

    stream.on('data', function ondata(serverAction) {
      if (serverAction.playerNum > 0) {
        console.info('You are player ', serverAction.playerNum);
        UI.showPlayerNum(serverAction.playerNum);
      }
      if (serverAction.opponentName !== '') {
        console.info('The name of your opponent is ', serverAction.opponentName);
        UI.showOpponentName(serverAction.opponentName);
      }
      if (serverAction.moveOptions.length > 0) {
        console.info('Move options:', serverAction.moveOptions);
        UI.selectMove(serverAction.moveOptions).then(function(move) {
          console.info('Move:', move);
          stream.write({Move: move});
        });
      }
      if (serverAction.roundResult.moves[0] !== '') {
        console.info('Last round:', serverAction.roundResult);
        UI.showRoundResult(serverAction.roundResult);
      }
      if (serverAction.score.judge !== '') {
        console.info('Game Scorecard:', serverAction.score);
        UI.showFinalScorecard(serverAction.score);
      }
    });

    stream.on('end', function playResult(result) {
      console.log('play end', result);
    });

    stream.on('error', function playResult(err) {
      self._fatal('play stream error:', err);
    });

    promise.then(function playResult(result) {
      console.info('GAME OVER', result);
      UI.gameOverPrompt(function() { self._reset(); });
    }, function(err) {
      self._fatal('play error:', err);
    });
  });
};

var game = new RPSGame();
document.querySelector('#playButton').addEventListener('click', game.initiateGame.bind(game));
})();
