var domready = require('domready');
var EE = require('events').EventEmitter;
var inherits = require('inherits');

var Channel = require('./channel');
var QueuedRpcChannelWrapper = require('./queued_channel');
var state = require('../state');

module.exports = Nacl;

function Nacl() {
  if (!(this instanceof Nacl)) {
    return new Nacl();
  }

  EE.call(this);

  this._queuedMessages = [];

  // Wait until the dom is ready, then add 'load' and 'message' listeners on the
  // nacl plugin that will trigger events on this object.
  var nacl = this;
  domready(function(){
    nacl._naclElt = _createNaclElement();
    document.body.appendChild(nacl._naclElt);

    // 'load' listener must have useCapture argument set to 'true'.
    nacl._naclElt.addEventListener('load', nacl.emit.bind(nacl, 'load'), true);
    nacl._naclElt.addEventListener('crash', nacl.emit.bind(nacl, 'crash', null),
      true);
    nacl._naclElt.addEventListener('message', function(e) {
      var msg = e.data;
      if (msg instanceof ArrayBuffer) {
        // Message is response from a channel RPC.
        return nacl._directChannel.handleMessage(msg);
      }
      nacl.emit('message', msg);
    });

    // Channel for bi-directional RPCs.
    nacl._directChannel = new Channel(nacl._naclElt.postMessage.bind(nacl));
    nacl.channel = new QueuedRpcChannelWrapper(nacl._directChannel);

    // Send a signal to initialize the nacl plug-in.
    nacl._start();
  });
}

inherits(Nacl, EE);

// Create an embed tag that will contain the nacl plugin.
function _createNaclElement() {
  var naclElt = document.createElement('embed');

  var idAttr = document.createAttribute('id');
  idAttr.value = 'nacl';
  naclElt.setAttributeNode(idAttr);

  var srcAttr = document.createAttribute('src');
  srcAttr.value = '/nacl/main.nmf';
  naclElt.setAttributeNode(srcAttr);

  var typeAttr = document.createAttribute('type');
  typeAttr.value = 'application/x-nacl';
  naclElt.setAttributeNode(typeAttr);

  return naclElt;
}

// Send message from content script to Nacl.
Nacl.prototype.sendMessage = function(msg) {
  if (!this._initialized) {
    this._queuedMessages.push(msg);
    return;
  }
  this._naclElt.postMessage(msg);
};

Nacl.prototype._start = function() {
  var nacl = this;
  var settings = state.settings();
  console.log(settings);

  this.getBlessingRoot(settings.identitydBlessingUrl.value,
    function(err, identityBlessingRoot) {
      if (err) {
        return nacl.emit('crash', err.message);
      }

      var body = {
        identitydBlessingRoot: identityBlessingRoot,
        identityd: settings.identityd.value,
        namespaceRoot: settings.namespaceRoot.value,
        proxy: settings.proxy.value,
        logLevel: parseInt(settings.logLevel.value) || 0,
        logModule: settings.logModule.value || ''
      };

      nacl._directChannel.performRpc('start', body, function(err) {
        if (err) {
          return nacl.emit('crash', err.message);
        }

        nacl._initialized = true;
        nacl._sendQueuedMessages();
        nacl.channel.ready();
      });
    });
};

Nacl.prototype._sendQueuedMessages = function() {
  var nacl = this;
  this._queuedMessages.forEach(function(msg) {
    nacl._naclElt.postMessage(msg);
  });
  this._queuedMessages = [];
  console.log('Sent queued messages');
};

Nacl.prototype.getBlessingRoot = function(url, cb) {
  // TODO(nlacasse): Currently the identity server has a self-signed cert, so we
  // can't make an XHR to it to request the identity root.  Hence, I've just
  // hard-coded the root value for hostnames that match "v.io".  Once we have a
  // real cert for the identity server, this should go away, and the superagent
  // code below should be used for every url.
  var hostname = require('url').parse(url).hostname;
  if ((/v\.io$/).test(hostname)) {
    console.log('Using hard-coded blessing root to connect to ' + url);
    var vanadiumTestRoot = {
      names: ['dev.v.io/root'],
      publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE9iRjaFDoGJI9tarUwWqIW31' +
        'ti72krThkYByn1v9Lf89D9VA0Mg2oUL7FDDM7qxjZcVM1ktM_W4tBfMVuRZmVCA=='
    };

    return process.nextTick(cb.bind(null, null, vanadiumTestRoot));
  }

  console.log('Requesting blessing root from ' + url);
  var request = require('superagent');
  request
      .get(url)
      .accept('application/json')
      .end(function(err, res) {
        if (err) {
          cb(err);
        } else if (res.error) {
          cb(new Error('' + res.status + ': ' + res.message));
        } else {
          cb(null, res.body);
        }
      });
};

Nacl.prototype.cleanupInstance = function(instanceId, cb) {
  this.channel.performRpc('cleanup', {
    instanceId: instanceId
  }, cb);
};

// Destroy state associated with this Nacl instance.
// In particular, this removed the added embed tag.
Nacl.prototype.destroy = function() {
  this._naclElt.parentNode.removeChild(this._naclElt);
  this._naclElt = null;
};
