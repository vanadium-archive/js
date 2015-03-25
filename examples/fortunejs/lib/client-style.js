// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * This file only contains *styling code* unrelated to Veyron and can be ignored.
 */


/*
 * Add back and front containers to flipper cards
 */
var allFlipperCards = document.querySelectorAll('.card.flipper');
for(var i = 0; i < allFlipperCards.length; i++) {
  var el = allFlipperCards[i];
  var frontEl = document.createElement('div');
  frontEl.className = 'front';
  var backEl = document.createElement('div');
  backEl.className = 'back';
  for(var j = 0; i < el.childNodes.length; j++) {
    frontEl.appendChild(el.childNodes[i]);
  }
  el.appendChild(frontEl);
  el.appendChild(backEl);
}

/*
 * Event handlers
 */
document.querySelector('#cancelFortune').addEventListener(
  'click', finishAddingFortune);
document.querySelector('#saveFortune').addEventListener(
  'click', finishAddingFortune);
document.querySelector('#newFortune').addEventListener('click', function() {
  flip(
      document.querySelector('#fortuneCard'),
      document.querySelector('#fortuneText')
  );
});
document.querySelector('#addFortune').addEventListener('click', function() {
  // make it visible and flip the card
  var inputEl = document.querySelector('#fortuneInput');
  inputEl.classList.remove('hidden');

  // flip the card
  flip(document.querySelector('#fortuneCard'), inputEl, true);

  inputEl.focus();

  toggleActions(false);
});

/*
 * Flips the card and shows the given elToShow on the back of the card
 */
function flip(card, toShowEl, ignoreCloning) {

  var isFlipped = card.classList.contains('flipped')
  var frontEl = card.querySelector('.front');
  var backEl = card.querySelector('.back');
  var curEl = frontEl.firstElementChild;
  var targetEl = frontEl;
  var sourceEl = backEl;
  if(isFlipped) {
    curEl = backEl.firstElementChild;
    targetEl = backEl;
    sourceEl = frontEl;
  }
  if(!ignoreCloning) {
    var curEl = curEl.cloneNode(true);
    curEl.id = '';
  }
  sourceEl.innerHTML = '';
  sourceEl.appendChild(toShowEl);
  if(!ignoreCloning) {
    targetEl.innerHTML = '';
    targetEl.appendChild(curEl);
  }

  // Run flip animation
  card.classList.toggle("flipped");
};

/*
 * Toggles visibility of actions
 */
function toggleActions( backToMain ) {
  document.querySelector('.main-actions').classList.toggle(
    'hidden', !backToMain);
  document.querySelector('.add-actions').classList.toggle(
    'hidden', backToMain);
}

/*
 * Resets view back to main
 */
function finishAddingFortune() {
  // Move the input element and flip the card
  var inputEl = document.querySelector('#fortuneInput');

  // Flip the card
  flip(
      document.querySelector('#fortuneCard'),
      document.querySelector('#fortuneText')

  );
  inputEl.classList.add('hidden');
  document.body.appendChild(inputEl);
  toggleActions(true);
}
