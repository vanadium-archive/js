(function() {

function htmlEscape(s) {
  s = new String(s);
  s = s.replace(/&/g, '&amp;');
  s = s.replace(/>/g, '&gt;');
  s = s.replace(/</g, '&lt;');
  s = s.replace(/\"/g, '&quot;');
  s = s.replace(/\'/g, '&apos;');
return s;
}

function scrollDown() {
  var max = ('scrollMaxY' in window)? window.scrollMaxY : document.documentElement.scrollHeight;
  window.scrollTo(0, max);
}

var debugText = '';

function debug(s) {
  debugText += htmlEscape(s) + '<br>';
  document.querySelector('#debugSection').classList.remove('hidden');
  document.querySelector('#debugText').innerHTML = debugText;
}

function startGame() {
  document.querySelector('#settingsSection').classList.add('hidden');
  document.querySelector('#playSection').classList.remove('hidden');
  var div = document.createElement('div');
  div.innerHTML = 'Joining game . . .<br>';
  document.querySelector('#playSection').appendChild(div);
  document.querySelector('#playSection').classList.add('wait');
  scrollDown();
}

function resetGame () {
  document.querySelector('#settingsSection').classList.remove('hidden');
  document.querySelector('#playSection').classList.add('hidden');
  document.querySelector('#playSection').classList.remove('wait');
}

function getSettings() {
  return {
    judgeAddr: document.querySelector('#judgeInput').value,
    opponentAddr: document.querySelector('#playerInput').value,
    gameType: document.querySelector('#gameType').value,
    numRounds: document.querySelector('#numRounds').value
  }
}

function updateParticipants (type, items) {
  var elem = document.querySelector('#' + type + 'Input');
  elem.options.length = 0;
  for (var i = 0; i < items.length; i++) {
    var opt = document.createElement('option');
    opt.text = items[i].name;
    opt.value = items[i].server;
    elem.options[i] = opt;
  }
  elem.selectedIndex = Math.floor(Math.random() * items.length);
}

function selectMove(moves) {
  var div = document.createElement('div');
  var msg = document.createElement('div');
  msg.className = 'prompt';
  msg.textContent = 'CHOOSE YOUR WEAPON';
  div.appendChild(msg);

  var p = new Promise(function(resolve) {
    for (var x = 0; x < moves.length; x++) {
      var s = document.createElement('span');
      s.className = 'move-button';
      s.textContent = moves[x];
      s.addEventListener('click', moveButtonCallback(resolve, moves[x]));
      div.appendChild(s);
    }
    showPopup(div);
  });
  return p;
}

function moveButtonCallback(callback, move) {
  return function() { hidePopup(); callback(move); };
}

var playerNum = 0;
function showPlayerNum(n) {
  playerNum = n;
}

var opponentName = '';
function showOpponentName(name) {
  opponentName = name;
  var div = document.createElement('div');
  div.innerHTML = 'Your opponent is ' + htmlEscape(opponentName) + '<br>';
  document.querySelector('#playSection').appendChild(div);
  document.querySelector('#playSection').classList.remove('wait');
  scrollDown();
}

function showRoundResult(roundResult) {
  var div = document.createElement('div');
  var winner;
  if (roundResult.winner == 0)
    winner = '&gt; It\'s a draw';
  else if (roundResult.winner == playerNum)
    winner = '&gt; You win this round';
  else
    winner = '&gt; You lose this round';

  div.innerHTML = 'You played <b>' + htmlEscape(roundResult.moves[playerNum-1]) +
          '</b>. Your opponent played <b>' + htmlEscape(roundResult.moves[2-playerNum]) +
          '</b>. ' + htmlEscape(roundResult.comment) + '<br>' + winner + '<br>';
  document.querySelector('#playSection').appendChild(div);
  scrollDown();
}

function showFinalScorecard(score) {
  var card = '<table class="scorecard"><tr><th>Round</th><th>' +
          htmlEscape(score.players[playerNum-1]) + '</th><th>' +
          htmlEscape(score.players[2-playerNum]) + '</th></tr>';
  for (var x = 0; x < score.rounds.length; x++) {
    card += '<tr><td>' + (x+1) + '</td>';
    card += '<td>' + htmlEscape(score.rounds[x].moves[playerNum-1]) + '</td>';
    card += '<td>' + htmlEscape(score.rounds[x].moves[2-playerNum]) + '</td>';
    card += '<td>' + htmlEscape(score.rounds[x].comment) + '</td>';
    card += '</tr>';
  }
  card += '</table>';
  if (score.winner === playerNum)
    card += '<p>You won the game! :)</p>';
  else
    card += '<p>You lost the game :(</p>';
  card += '<hr>';
  var div = document.createElement('div');
  div.innerHTML = card;
  document.querySelector('#playSection').appendChild(div);
  scrollDown();
}

function challengePrompt(opts) {
  var div = document.createElement('div');
  var msg = document.createElement('div');
  msg.className = 'prompt';
  var type = opts.gameType == 0 ? 'Classic' : 'LizardSpock';
  msg.textContent = 'You received a challenge for a ' + htmlEscape(opts.numRounds) + '-round ' + type + ' Game';
  div.appendChild(msg);

  var p = new Promise(function(accepted, declined) {
    var s = document.createElement('span');
    s.className = 'move-button';
    s.textContent = 'Accept';
    s.addEventListener('click', function() { hidePopup(); accepted(); });
    div.appendChild(s);

    s = document.createElement('span');
    s.className = 'move-button';
    s.textContent = 'Decline';
    s.addEventListener('click', function() { hidePopup(); declined(new Error('player declined')); });
    div.appendChild(s);

    showPopup(div);
  });

  return p;
}

function gameOverPrompt(callback) {
  var div = document.createElement('div');
  var msg = document.createElement('div');
  msg.className = 'prompt';
  msg.textContent = 'Game Over';
  div.appendChild(msg);

  var s = document.createElement('span');
  s.className = 'move-button';
  s.textContent = 'Play Again?';
  s.addEventListener('click', function() { hidePopup(); callback(); });
  div.appendChild(s);

  showPopup(div);
}

function showPopup(div) {
  var popup = document.querySelector('#popupDiv');
  if (popup === null) {
    popup = document.createElement('div');
    popup.id = 'popupDiv';
    popup.className = 'popup hidden';
    document.getElementsByTagName('body')[0].appendChild(popup);
  }
  var first = popup.firstChild;
  if (first) {
    popup.replaceChild(div, first);
  } else {
    popup.appendChild(div);
  }
  popup.classList.remove('hidden');
  popup.style.marginLeft = -Math.floor(popup.clientWidth / 2) + 'px';
}

function hidePopup() {
  document.querySelector('#popupDiv').classList.add('hidden');
}

var tickerText = '';
function displayScoreCard(card) {
  if (tickerText.length > 500) {
    // scorecards are coming in too fast.
    return;
  }
  var t = 'BREAKING NEWS: ' + htmlEscape(card.players[card.winner-1]) + ' beat '
          + htmlEscape(card.players[2-card.winner]) + ' in ' +
          card.rounds.length + ' rounds. ';
  tickerText += t;
}

function tick() {
  if (tickerText.length > 0) {
    tickerText = tickerText.substr(1);
  }
  document.querySelector('#ticker').innerHTML = tickerText;
};
window.setInterval(tick, 75);

window.UI = {
  debug: debug,
  startGame: startGame,
  resetGame: resetGame,
  getSettings: getSettings,
  updateParticipants: updateParticipants,
  selectMove: selectMove,
  showPlayerNum: showPlayerNum,
  showOpponentName: showOpponentName,
  showRoundResult: showRoundResult,
  showFinalScorecard: showFinalScorecard,
  challengePrompt: challengePrompt,
  gameOverPrompt: gameOverPrompt,
  displayScoreCard: displayScoreCard
};

})();
