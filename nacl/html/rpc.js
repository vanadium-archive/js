var vom = require('vom');

module.exports = RpcChannel;

function uint8ArrayToArrayBuffer(arr) {
    return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.length);
}

var requestType = {
    kind: vom.Kind.STRUCT,
    name: 'veyron.io/wspr/veyron/services/wsprd/channel.Request',
    fields: [
        {
            name: 'Type',
            type: vom.Types.STRING
        },
        {
            name: 'Seq',
            type: vom.Types.UINT64
        },
        {
            name: 'Body',
            type: vom.Types.ANY
        }
    ]
};

var responseType = {
    kind: vom.Kind.STRUCT,
    name: 'veyron.io/wspr/veyron/services/wsprd/channel.Response',
    fields: [
        {
            name: 'ReqSeq',
            type: vom.Types.UINT64
        },
        {
            name: 'Err',
            type: vom.Types.STRING // should be error
        },
        {
            name: 'Body',
            type: vom.Types.ANY
        }
    ]
};

function RpcChannel(wspr) {
    this.wspr = wspr;
    this.lastSeq = 0;
    this.handlers = {};
    this.pendingCallbacks = {};
}

RpcChannel.prototype.registerRpcHandler = function(type, func) {
    this.handlers[type] = func;
};

RpcChannel.prototype.performRpc = function(type, val, callback) {
    var seq = ++this.lastSeq;
    this.pendingCallbacks[seq] = callback;

    var request = {
        _type: requestType,
        Type: type,
        Seq: seq,
        Body: val
    };
    this._sendVomEncodedMessage(request);
};

RpcChannel.prototype._sendVomEncodedMessage = function(msg) {
    var writer = new vom.ByteArrayMessageWriter();
    var enc = new vom.Encoder(writer);
    enc.encode(msg);
    var encodedBytes = writer.getBytes();
    this._postMessage(uint8ArrayToArrayBuffer(encodedBytes));
};

RpcChannel.prototype._handleRequest = function(req) {
    var type = req.Type;
    var handler = this.handlers[type];
    if (handler === undefined) {
        throw new Error('Undefined handler for type \'' + type + '\'');
    }
    var result;
    var err;
    try {
        result = handler(req.Body);
    } catch (e) {
        err = e.message;
        // TODO(bprosnitz) Nil is not handled yet in VOM2.
        // Remove this when it is implemented.
        result = 'ResultMessageToBeRemovedWhenVOM2IsComplete';
    }

    var response = {
        _type: responseType,
        ReqSeq: req.Seq,
        Err: err || '',
        Body: result
    };
    this._sendVomEncodedMessage(response);
};

RpcChannel.prototype._handleResponse = function(resp) {
    var seq = resp.ReqSeq;
    var cb = this.pendingCallbacks[seq];
    delete this.pendingCallbacks[seq];
    if (cb === undefined) {
        throw new Error('Received response with no matching sequence number '+
            JSON.stringify(resp));
    }
    var err = resp.Err;
    if (resp.Err === '') {
        err = null;
    } else {
        err = new Error(resp.Err);
    }
    cb(err, resp.Body);
};

RpcChannel.prototype._handleMessage = function(msg) {
    var msgBytes = new Uint8Array(msg);
    var reader = new vom.ByteArrayMessageReader(msgBytes);
    var dec = new vom.Decoder(reader);
    var jsMsg = dec.decode();
    if (jsMsg._type.name === requestType.name) {
        this._handleRequest(jsMsg);
    } else if (jsMsg._type.name === responseType.name) {
        this._handleResponse(jsMsg);
    } else {
        throw new Error('Message does not appear to be a request or response ' +
            JSON.stringify(jsMsg));
    }
};

RpcChannel.prototype._postMessage = function(msg) {
    this.wspr.postMessage({
        type: 'rpcMessage',
        body: msg,
    });
};