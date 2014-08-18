var veyron = require('../../../src/veyron');
var veyronConfig = require('./config');
// Use more verbose logging for server
veyronConfig.logLevel = veyron.logLevels.INFO;

var isBrowser = (typeof window === 'object');

// In NodeJS, 'ui' will be the console.  In browsers it will have function to
// update the text in dom nodes.
var ui;

if (isBrowser) {
  // Use custom UI display in the browser.
  ui = require('./server-style');
} else {
  // Just use the console in node.
  ui = console;
}


console.log('***Welcome to FortuneJS - Server***');

/**
 * 1) Implement a simple fortune service
 */

var fortuneService = {
  // List of fortunes
  fortunes: [],

  numFortunesServed: 0,

  // Gets a random fortune
  getRandomFortune: function() {
    var numExistingfortunes = this.fortunes.length;
    if(numExistingfortunes === 0) {
      throw new Error('Sorry! No fortune available :(');
    }
    var randomIndex = Math.floor(Math.random() * numExistingfortunes);
    var fortune = this.fortunes[randomIndex];
    this.numFortunesServed++;
    console.info('Serving:', fortune);
    return fortune;
  },

  // Adds a new fortune
  addNewFortune: function(fortune) {
    console.log('in here');
    if(!fortune || fortune.trim() === '') {
      throw new Error('Sorry! Can\'t add empty or null fortune!');
    }
    console.info('Adding:', fortune);
    this.fortunes.push(fortune);
  }
};

/**
 * 2) Publish the fortune service
 */

// Create a Veyron runtime using the configuration
veyron.init(veyronConfig).then(function(rt){
  // Serve the fortune server under a name. Serve returns a Promise object
  rt.serve('bakery/cookie/fortune', fortuneService).then(function() {
    ui.info('Fortune server serving under: bakery/cookie/fortune \n');
  }).catch(function(err) {
    ui.error('Failed to serve the Fortune server because: \n', err);
  });

  if (isBrowser) {
    // Update the number of fortunes served and total number of fortunes in the browser UI.
    setInterval(function() {
      ui.refreshStats(fortuneService.numFortunesServed, fortuneService.fortunes.length);
    }, 100);
  }
}).catch(function(err) {
  ui.error('Failed to start the fortune server because:', err);
});

// Let's add a few fortunes to start with
fortuneService.addNewFortune('The fortune you seek is in another cookie.');
fortuneService.addNewFortune('Everything will now come your way.');
fortuneService.addNewFortune('Conquer your fears or they will conquer you.');
