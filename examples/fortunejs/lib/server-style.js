// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * This file only contains *styling code* unrelated to Veyron and can be ignored.
 */

module.exports = {
  refreshStats: refreshStats,
  error: showError,
  info: showInfo
};

var prevNumFortunesServed = 0;
var prevTotalNumFortunes = 0;
function refreshStats(numFortunesServed, totalNumFortunes) {

  if(numFortunesServed !== prevNumFortunesServed) {
    document.querySelector('#numServed').textContent = numFortunesServed;
    animateBall('green-ball');
  }

  if(totalNumFortunes !== prevTotalNumFortunes) {
    document.querySelector('#numTotal').textContent = totalNumFortunes;
    animateBall('blue-ball');
  }

  prevNumFortunesServed = numFortunesServed;
  prevTotalNumFortunes = totalNumFortunes;

}

function animateBall(className) {

  var ball = document.createElement('div');
  ball.className = 'fortune-ball';

  document.querySelector('.factory').appendChild(ball);

  var removeBall = function() {
    ball.parentNode.removeChild(ball);
  };

  ball.addEventListener("animationend", removeBall, false);
  ball.addEventListener("webkitAnimationEnd", removeBall, false);

  setTimeout(function() {
     ball.classList.add(className);
  });
};

function showError(err) {
  document.querySelector('#error').textContent = err;
}

function showInfo(message) {
  document.querySelector('#info').textContent = message;
}

var UI = {
  refreshStats: refreshStats,
  showError: showError,
  showInfo: showInfo
};
