var veyron = require('../../../src/veyron');
var veyronConfig = require('./config');

/**
 * Create a Veyron runtime using the configuration defined in config.js,
 * and bind it to the bakery/cookie/fortune service.
 */
veyron.init(veyronConfig).then(function(rt){
  var client = rt.newClient();
  var ctx = rt.getContext();
  client.bindTo(ctx, 'bakery/cookie/fortune').then(function(fortuneService) {
    function getFortune() {
      fortuneService.getRandomFortune(ctx).then(function(fortune) {
        platform.handleGetSuccess(fortune);
      }).catch(function(err) {
        platform.handleGetFailure(err);
      });
    }

    function addFortune() {
      fortuneService.addNewFortune(ctx, platform.getFortuneToAdd()).then(function() {
        platform.handleAddSuccess();
      }).catch(function(err) {
        platform.handleAddFailure(err);
      });
    }

    var browserPlatform = {
      start: function() {
        // Load JS to handle browser client style.
        require('./client-style');
        // Hook up browser click events.
        window.document.querySelector(
            '#newFortune').addEventListener('click', getFortune);
        window.document.querySelector(
            '#saveFortune').addEventListener('click', addFortune);
        // Browser should start by doing a 'get'.
        getFortune();
      },
      getFortuneToAdd: function() {
        var text = window.document.querySelector('#fortuneInput').value;
        window.document.querySelector('#fortuneInput').value = '';
        return text;
      },
      handleGetSuccess: function(text) {
        window.document.querySelector('#fortuneText').textContent = text;
      },
      // TODO: Errors should show up in the web page.
      handleGetFailure: function(err) {
        console.error('Get failure: ', err);
      },
      handleAddSuccess: function() {
        console.info('New fortune successfully added.');
      },
      handleAddFailure: function(err) {
        console.error('Add failure: ', err);
      }
    };

    var nodePlatform = {
      fortuneText: '',
      start: function() {
        // Parse command line to see if this is an add or a get.
        var argv = require('minimist')(process.argv.slice(2));
        if (argv.add) {
          this.fortuneText = argv.add;
          addFortune();
          return;
        }
        console.log('To add a fortune, run with:  --add "new fortune text"\n');
        getFortune();
      },
      getFortuneToAdd: function() {
        return this.fortuneText;
      },
      handleGetSuccess: function(text) {
        console.log(text);
        process.exit(0);
      },
      handleGetFailure: function(err) {
        console.error('Get failure: ', err);
        process.exit(1);
      },
      handleAddSuccess: function() {
        console.info('New fortune successfully added.');
        process.exit(0);
      },
      handleAddFailure: function(err) {
        console.error('Add failure: ', err);
        process.exit(1);
      }
    };

    console.log('*** Welcome to FortuneJS - Client ***');
    var platform = (typeof window === 'object') ? browserPlatform : nodePlatform;
    platform.start();
  });
}).catch(function(err) {
  console.error('Failed to use the fortune service because:', err);
});
