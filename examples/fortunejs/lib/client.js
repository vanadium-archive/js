var veyron = require('../../../src/veyron');
var veyronConfig = require('./config');

var isBrowser = (typeof window === 'object');

// In NodeJS, parse the command line argument to see if we are adding or
// requesting a fortune.
var argv;
if (!isBrowser) {
  argv = require('optimist').argv;
  if (!argv.add) {
    console.log('To add a new fortune use with --add "new fortune text" arguments\n');
  }
}

console.log('***Welcome to FortuneJS - Client***');

/**
 * Bind to the fortune server.
 */

// Create a Veyron runtime using the configuration defined in config.js.
veyron.init(veyronConfig).then(function(rt){
  var fortuneServiceName = 'bakery/cookie/fortune';
  var fortuneService = rt.bindTo(fortuneServiceName);

  // Bind to the service. Bind returns a Promise object. When fortune object is
  // bound, use it like a regular JavaScript object.
  fortuneService.then(function(fortuneService) {

    // Get a new Fortune to display.
    function getFortune() {
      fortuneService.getRandomFortune().then(function(fortune) {
        // Display is different for Browser and NodeJS.
        if (isBrowser) {
          // Browser should display the fortune in the #fortuneText div.
          document.querySelector('#fortuneText').textContent = fortune;
        } else {
          // Node should just console.log the fortune and exit.
          console.log('Your fortune:', fortune);
          process.exit(0);
        }
      }).catch(function(err) {
          console.error('Better days lay ahead! Sorry, we encountered an error :(', err);
      });
    }

    function addNewFortune() {
      var fortune;
      if (isBrowser) {
        // Read fortune from input value.
        fortune = document.querySelector('#fortuneInput').value;
        document.querySelector('#fortuneInput').value = '';
      } else {
        // Fortune comes from command line argument.
        fortune = argv.add;
      }

      fortuneService.addNewFortune(fortune).then(function() {
        console.info('New fortune successfully added');
        if (!isBrowser) { process.exit(0); }
      }).catch(function(err) {
        console.error('Failed to add new fortune because: ', err);
        if (!isBrowser) { process.exit(1); }
      });
    }

    if (isBrowser) {
      // Load JS to handle browser client style.
      require('./client-style');

      // Hook up browser click events.
      document.querySelector('#newFortune').addEventListener('click', getFortune);
      document.querySelector('#saveFortune').addEventListener('click', addNewFortune);
    }

    // If we are adding a fortune, add it, otherwise get a new fortune.
    if (argv && argv.add) {
      addNewFortune();
    } else {
      getFortune();
    }
  });
}).catch(function(err) {
  console.error('Failed to use the fortune service because:', err);
});
