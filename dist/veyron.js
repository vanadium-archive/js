(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
var TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Find the length
  var length
  if (type === 'number')
    length = subject > 0 ? subject >>> 0 : 0
  else if (type === 'string') {
    if (encoding === 'base64')
      subject = base64clean(subject)
    length = Buffer.byteLength(subject, encoding)
  } else if (type === 'object' && subject !== null) { // assume object is array-like
    if (subject.type === 'Buffer' && isArray(subject.data))
      subject = subject.data
    length = +subject.length > 0 ? Math.floor(+subject.length) : 0
  } else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (TYPED_ARRAY_SUPPORT) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (TYPED_ARRAY_SUPPORT && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++)
        buf[i] = subject.readUInt8(i)
    } else {
      for (i = 0; i < length; i++)
        buf[i] = ((subject[i] % 256) + 256) % 256
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !TYPED_ARRAY_SUPPORT && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str.toString()
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list[, length])')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.compare = function (a, b) {
  assert(Buffer.isBuffer(a) && Buffer.isBuffer(b), 'Arguments must be Buffers')
  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) {
    return -1
  }
  if (y < x) {
    return 1
  }
  return 0
}

// BUFFER INSTANCE METHODS
// =======================

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end === undefined) ? self.length : Number(end)

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = asciiSlice(self, start, end)
      break
    case 'binary':
      ret = binarySlice(self, start, end)
      break
    case 'base64':
      ret = base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

Buffer.prototype.equals = function (b) {
  assert(Buffer.isBuffer(b), 'Argument must be a Buffer')
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.compare = function (b) {
  assert(Buffer.isBuffer(b), 'Argument must be a Buffer')
  return Buffer.compare(this, b)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function binarySlice (buf, start, end) {
  return asciiSlice(buf, start, end)
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len;
    if (start < 0)
      start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0)
      end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start)
    end = start

  if (TYPED_ARRAY_SUPPORT) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return readUInt16(this, offset, false, noAssert)
}

function readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return readInt16(this, offset, false, noAssert)
}

function readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return readInt32(this, offset, false, noAssert)
}

function readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return readFloat(this, offset, false, noAssert)
}

function readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
  return offset + 1
}

function writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
  return offset + 2
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  return writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  return writeUInt16(this, value, offset, false, noAssert)
}

function writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
  return offset + 4
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  return writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  return writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
  return offset + 1
}

function writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
  return offset + 2
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  return writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  return writeInt16(this, value, offset, false, noAssert)
}

function writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
  return offset + 4
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  return writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  return writeInt32(this, value, offset, false, noAssert)
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-z]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F) {
      byteArray.push(b)
    } else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++) {
        byteArray.push(parseInt(h[j], 16))
      }
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":2,"ieee754":3}],2:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],3:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],4:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],5:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],6:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],7:[function(require,module,exports){
module.exports = require("./lib/_stream_duplex.js")

},{"./lib/_stream_duplex.js":8}],8:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

module.exports = Duplex;

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}
/*</replacement>*/


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

forEach(objectKeys(Writable.prototype), function(method) {
  if (!Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
});

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(this.end.bind(this));
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

}).call(this,require("FWaASH"))
},{"./_stream_readable":10,"./_stream_writable":12,"FWaASH":6,"core-util-is":13,"inherits":5}],9:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};

},{"./_stream_transform":11,"core-util-is":13,"inherits":5}],10:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = require('events').EventEmitter;

/*<replacement>*/
if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

var Stream = require('stream');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var StringDecoder;

util.inherits(Readable, Stream);

function ReadableState(options, stream) {
  options = options || {};

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = false;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // In streams that never have any data, and do push(null) right away,
  // the consumer can miss the 'end' event if they do some I/O before
  // consuming the stream.  So, we don't emit('end') until some reading
  // happens.
  this.calledRead = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;


  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (typeof chunk === 'string' && !state.objectMode) {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null || chunk === undefined) {
    state.reading = false;
    if (!state.ended)
      onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      // update the buffer info.
      state.length += state.objectMode ? 1 : chunk.length;
      if (addToFront) {
        state.buffer.unshift(chunk);
      } else {
        state.reading = false;
        state.buffer.push(chunk);
      }

      if (state.needReadable)
        emitReadable(stream);

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (n === null || isNaN(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else
      return state.length;
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  var state = this._readableState;
  state.calledRead = true;
  var nOrig = n;
  var ret;

  if (typeof n !== 'number' || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    ret = null;

    // In cases where the decoder did not receive enough data
    // to produce a full chunk, then immediately received an
    // EOF, state.buffer will contain [<Buffer >, <Buffer 00 ...>].
    // howMuchToRead will see this and coerce the amount to
    // read to zero (because it's looking at the length of the
    // first <Buffer > in state.buffer), and we'll end up here.
    //
    // This can only happen via state.decoder -- no other venue
    // exists for pushing a zero-length chunk into state.buffer
    // and triggering this behavior. In this case, we return our
    // remaining data and end the stream, if appropriate.
    if (state.length > 0 && state.decoder) {
      ret = fromList(n, state);
      state.length -= ret.length;
    }

    if (state.length === 0)
      endReadable(this);

    return ret;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;

  // if we currently have less than the highWaterMark, then also read some
  if (state.length - n <= state.highWaterMark)
    doRead = true;

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading)
    doRead = false;

  if (doRead) {
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read called its callback synchronously, then `reading`
  // will be false, and we need to re-evaluate how much data we
  // can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we happened to read() exactly the remaining amount in the
  // buffer, and the EOF has been seen at this point, then make sure
  // that we emit 'end' on the very next tick.
  if (state.ended && !state.endEmitted && state.length === 0)
    endReadable(this);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.decoder && !state.ended) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // if we've ended and we have some data left, then emit
  // 'readable' now to make sure it gets picked up.
  if (state.length > 0)
    emitReadable(stream);
  else
    endReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (state.emittedReadable)
    return;

  state.emittedReadable = true;
  if (state.sync)
    process.nextTick(function() {
      emitReadable_(stream);
    });
  else
    emitReadable_(stream);
}

function emitReadable_(stream) {
  stream.emit('readable');
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(function() {
      maybeReadMore_(stream, state);
    });
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    process.nextTick(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    if (readable !== src) return;
    cleanup();
  }

  function onend() {
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (!dest._writableState || dest._writableState.needDrain)
      ondrain();
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    unpipe();
    dest.removeListener('error', onerror);
    if (EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error)
    dest.on('error', onerror);
  else if (isArray(dest._events.error))
    dest._events.error.unshift(onerror);
  else
    dest._events.error = [onerror, dest._events.error];



  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    // the handler that waits for readable events after all
    // the data gets sucked out in flow.
    // This would be easier to follow with a .once() handler
    // in flow(), but that is too slow.
    this.on('readable', pipeOnReadable);

    state.flowing = true;
    process.nextTick(function() {
      flow(src);
    });
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var dest = this;
    var state = src._readableState;
    state.awaitDrain--;
    if (state.awaitDrain === 0)
      flow(src);
  };
}

function flow(src) {
  var state = src._readableState;
  var chunk;
  state.awaitDrain = 0;

  function write(dest, i, list) {
    var written = dest.write(chunk);
    if (false === written) {
      state.awaitDrain++;
    }
  }

  while (state.pipesCount && null !== (chunk = src.read())) {

    if (state.pipesCount === 1)
      write(state.pipes, 0, null);
    else
      forEach(state.pipes, write);

    src.emit('data', chunk);

    // if anyone needs a drain, then we have to wait for that.
    if (state.awaitDrain > 0)
      return;
  }

  // if every destination was unpiped, either before entering this
  // function, or in the while loop, then stop flowing.
  //
  // NB: This is a pretty rare edge case.
  if (state.pipesCount === 0) {
    state.flowing = false;

    // if there were data event listeners added, then switch to old mode.
    if (EE.listenerCount(src, 'data') > 0)
      emitDataEvents(src);
    return;
  }

  // at this point, no one needed a drain, so we just ran out of data
  // on the next readable event, start it over again.
  state.ranOut = true;
}

function pipeOnReadable() {
  if (this._readableState.ranOut) {
    this._readableState.ranOut = false;
    flow(this);
  }
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data' && !this._readableState.flowing)
    emitDataEvents(this);

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        this.read(0);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  emitDataEvents(this);
  this.read(0);
  this.emit('resume');
};

Readable.prototype.pause = function() {
  emitDataEvents(this, true);
  this.emit('pause');
};

function emitDataEvents(stream, startPaused) {
  var state = stream._readableState;

  if (state.flowing) {
    // https://github.com/isaacs/readable-stream/issues/16
    throw new Error('Cannot switch to old mode now.');
  }

  var paused = startPaused || false;
  var readable = false;

  // convert to an old-style stream.
  stream.readable = true;
  stream.pipe = Stream.prototype.pipe;
  stream.on = stream.addListener = Stream.prototype.on;

  stream.on('readable', function() {
    readable = true;

    var c;
    while (!paused && (null !== (c = stream.read())))
      stream.emit('data', c);

    if (c === null) {
      readable = false;
      stream._readableState.needReadable = true;
    }
  });

  stream.pause = function() {
    paused = true;
    this.emit('pause');
  };

  stream.resume = function() {
    paused = false;
    if (readable)
      process.nextTick(function() {
        stream.emit('readable');
      });
    else
      this.read(0);
    this.emit('resume');
  };

  // now make it start, just in case it hadn't already.
  stream.emit('readable');
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    if (state.decoder)
      chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    //if (state.objectMode && util.isNullOrUndefined(chunk))
    if (state.objectMode && (chunk === null || chunk === undefined))
      return;
    else if (!state.objectMode && (!chunk || !chunk.length))
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (typeof stream[i] === 'function' &&
        typeof this[i] === 'undefined') {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted && state.calledRead) {
    state.ended = true;
    process.nextTick(function() {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    });
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

}).call(this,require("FWaASH"))
},{"FWaASH":6,"buffer":1,"core-util-is":13,"events":4,"inherits":5,"isarray":14,"stream":20,"string_decoder/":15}],11:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);


function TransformState(options, stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined)
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  var ts = this._transformState = new TransformState(options, this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  this.once('finish', function() {
    if ('function' === typeof this._flush)
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var rs = stream._readableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

},{"./_stream_duplex":8,"core-util-is":13,"inherits":5}],12:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

module.exports = Writable;

/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Stream = require('stream');

util.inherits(Writable, Stream);

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
}

function WritableState(options, stream) {
  options = options || {};

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.buffer = [];

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;
}

function Writable(options) {
  var Duplex = require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, state, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  process.nextTick(function() {
    cb(er);
  });
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    process.nextTick(function() {
      cb(er);
    });
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (typeof cb !== 'function')
    cb = function() {};

  if (state.ended)
    writeAfterEnd(this, state, cb);
  else if (validChunk(this, state, chunk, cb))
    ret = writeOrBuffer(this, state, chunk, encoding, cb);

  return ret;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      typeof chunk === 'string') {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);
  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret)
    state.needDrain = true;

  if (state.writing)
    state.buffer.push(new WriteReq(chunk, encoding, cb));
  else
    doWrite(stream, state, len, chunk, encoding, cb);

  return ret;
}

function doWrite(stream, state, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  if (sync)
    process.nextTick(function() {
      cb(er);
    });
  else
    cb(er);

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(stream, state);

    if (!finished && !state.bufferProcessing && state.buffer.length)
      clearBuffer(stream, state);

    if (sync) {
      process.nextTick(function() {
        afterWrite(stream, state, finished, cb);
      });
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  cb();
  if (finished)
    finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;

  for (var c = 0; c < state.buffer.length; c++) {
    var entry = state.buffer[c];
    var chunk = entry.chunk;
    var encoding = entry.encoding;
    var cb = entry.callback;
    var len = state.objectMode ? 1 : chunk.length;

    doWrite(stream, state, len, chunk, encoding, cb);

    // if we didn't call the onwrite immediately, then
    // it means that we need to wait until it does.
    // also, that means that the chunk and cb are currently
    // being processed, so move the buffer counter past them.
    if (state.writing) {
      c++;
      break;
    }
  }

  state.bufferProcessing = false;
  if (c < state.buffer.length)
    state.buffer = state.buffer.slice(c);
  else
    state.buffer.length = 0;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (typeof chunk !== 'undefined' && chunk !== null)
    this.write(chunk, encoding);

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(stream, state) {
  return (state.ending &&
          state.length === 0 &&
          !state.finished &&
          !state.writing);
}

function finishMaybe(stream, state) {
  var need = needFinish(stream, state);
  if (need) {
    state.finished = true;
    stream.emit('finish');
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      process.nextTick(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

}).call(this,require("FWaASH"))
},{"./_stream_duplex":8,"FWaASH":6,"buffer":1,"core-util-is":13,"inherits":5,"stream":20}],13:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return Buffer.isBuffer(arg);
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}
}).call(this,require("buffer").Buffer)
},{"buffer":1}],14:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],15:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer').Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters. CESU-8 is handled as part of the UTF-8 encoding.
//
// @TODO Handling all encodings inside a single object makes it very difficult
// to reason about this code, so it should be split up in the future.
// @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
// points as used by CESU-8.
var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  // Enough space to store all bytes of a single character. UTF-8 needs 4
  // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
  this.charBuffer = new Buffer(6);
  // Number of bytes received for the current incomplete multi-byte character.
  this.charReceived = 0;
  // Number of bytes expected for the current incomplete multi-byte character.
  this.charLength = 0;
};


// write decodes the given buffer and returns it as JS string that is
// guaranteed to not contain any partial multi-byte characters. Any partial
// character found at the end of the buffer is buffered up, and will be
// returned when calling write again with the remaining bytes.
//
// Note: Converting a Buffer containing an orphan surrogate to a String
// currently works, but converting a String to a Buffer (via `new Buffer`, or
// Buffer#write) will replace incomplete surrogates with the unicode
// replacement character. See https://codereview.chromium.org/121173009/ .
StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var available = (buffer.length >= this.charLength - this.charReceived) ?
        this.charLength - this.charReceived :
        buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, 0, available);
    this.charReceived += available;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // remove bytes belonging to the current character from the buffer
    buffer = buffer.slice(available, buffer.length);

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (buffer.length === 0) {
      return charStr;
    }
    break;
  }

  // determine and set charLength / charReceived
  this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
    end -= this.charReceived;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    buffer.copy(this.charBuffer, 0, 0, size);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

// detectIncompleteChar determines if there is an incomplete UTF-8 character at
// the end of the given buffer. If so, it sets this.charLength to the byte
// length that character, and sets this.charReceived to the number of bytes
// that are available for this character.
StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }
  this.charReceived = i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 2;
  this.charLength = this.charReceived ? 2 : 0;
}

function base64DetectIncompleteChar(buffer) {
  this.charReceived = buffer.length % 3;
  this.charLength = this.charReceived ? 3 : 0;
}

},{"buffer":1}],16:[function(require,module,exports){
module.exports = require("./lib/_stream_passthrough.js")

},{"./lib/_stream_passthrough.js":9}],17:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":8,"./lib/_stream_passthrough.js":9,"./lib/_stream_readable.js":10,"./lib/_stream_transform.js":11,"./lib/_stream_writable.js":12}],18:[function(require,module,exports){
module.exports = require("./lib/_stream_transform.js")

},{"./lib/_stream_transform.js":11}],19:[function(require,module,exports){
module.exports = require("./lib/_stream_writable.js")

},{"./lib/_stream_writable.js":12}],20:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":4,"inherits":5,"readable-stream/duplex.js":7,"readable-stream/passthrough.js":16,"readable-stream/readable.js":17,"readable-stream/transform.js":18,"readable-stream/writable.js":19}],21:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],22:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require("FWaASH"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":21,"FWaASH":6,"inherits":5}],23:[function(require,module,exports){
"use strict";
var Promise = require("./promise/promise").Promise;
var polyfill = require("./promise/polyfill").polyfill;
exports.Promise = Promise;
exports.polyfill = polyfill;
},{"./promise/polyfill":27,"./promise/promise":28}],24:[function(require,module,exports){
"use strict";
/* global toString */

var isArray = require("./utils").isArray;
var isFunction = require("./utils").isFunction;

/**
  Returns a promise that is fulfilled when all the given promises have been
  fulfilled, or rejected if any of them become rejected. The return promise
  is fulfilled with an array that gives all the values in the order they were
  passed in the `promises` array argument.

  Example:

  ```javascript
  var promise1 = RSVP.resolve(1);
  var promise2 = RSVP.resolve(2);
  var promise3 = RSVP.resolve(3);
  var promises = [ promise1, promise2, promise3 ];

  RSVP.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `RSVP.all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  var promise1 = RSVP.resolve(1);
  var promise2 = RSVP.reject(new Error("2"));
  var promise3 = RSVP.reject(new Error("3"));
  var promises = [ promise1, promise2, promise3 ];

  RSVP.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @for RSVP
  @param {Array} promises
  @param {String} label
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
*/
function all(promises) {
  /*jshint validthis:true */
  var Promise = this;

  if (!isArray(promises)) {
    throw new TypeError('You must pass an array to all.');
  }

  return new Promise(function(resolve, reject) {
    var results = [], remaining = promises.length,
    promise;

    if (remaining === 0) {
      resolve([]);
    }

    function resolver(index) {
      return function(value) {
        resolveAll(index, value);
      };
    }

    function resolveAll(index, value) {
      results[index] = value;
      if (--remaining === 0) {
        resolve(results);
      }
    }

    for (var i = 0; i < promises.length; i++) {
      promise = promises[i];

      if (promise && isFunction(promise.then)) {
        promise.then(resolver(i), reject);
      } else {
        resolveAll(i, promise);
      }
    }
  });
}

exports.all = all;
},{"./utils":32}],25:[function(require,module,exports){
(function (process,global){
"use strict";
var browserGlobal = (typeof window !== 'undefined') ? window : {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var local = (typeof global !== 'undefined') ? global : (this === undefined? window:this);

// node
function useNextTick() {
  return function() {
    process.nextTick(flush);
  };
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function() {
    node.data = (iterations = ++iterations % 2);
  };
}

function useSetTimeout() {
  return function() {
    local.setTimeout(flush, 1);
  };
}

var queue = [];
function flush() {
  for (var i = 0; i < queue.length; i++) {
    var tuple = queue[i];
    var callback = tuple[0], arg = tuple[1];
    callback(arg);
  }
  queue = [];
}

var scheduleFlush;

// Decide what async method to use to triggering processing of queued callbacks:
if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else {
  scheduleFlush = useSetTimeout();
}

function asap(callback, arg) {
  var length = queue.push([callback, arg]);
  if (length === 1) {
    // If length is 1, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    scheduleFlush();
  }
}

exports.asap = asap;
}).call(this,require("FWaASH"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"FWaASH":6}],26:[function(require,module,exports){
"use strict";
var config = {
  instrument: false
};

function configure(name, value) {
  if (arguments.length === 2) {
    config[name] = value;
  } else {
    return config[name];
  }
}

exports.config = config;
exports.configure = configure;
},{}],27:[function(require,module,exports){
(function (global){
"use strict";
/*global self*/
var RSVPPromise = require("./promise").Promise;
var isFunction = require("./utils").isFunction;

function polyfill() {
  var local;

  if (typeof global !== 'undefined') {
    local = global;
  } else if (typeof window !== 'undefined' && window.document) {
    local = window;
  } else {
    local = self;
  }

  var es6PromiseSupport = 
    "Promise" in local &&
    // Some of these methods are missing from
    // Firefox/Chrome experimental implementations
    "resolve" in local.Promise &&
    "reject" in local.Promise &&
    "all" in local.Promise &&
    "race" in local.Promise &&
    // Older version of the spec had a resolver object
    // as the arg rather than a function
    (function() {
      var resolve;
      new local.Promise(function(r) { resolve = r; });
      return isFunction(resolve);
    }());

  if (!es6PromiseSupport) {
    local.Promise = RSVPPromise;
  }
}

exports.polyfill = polyfill;
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./promise":28,"./utils":32}],28:[function(require,module,exports){
"use strict";
var config = require("./config").config;
var configure = require("./config").configure;
var objectOrFunction = require("./utils").objectOrFunction;
var isFunction = require("./utils").isFunction;
var now = require("./utils").now;
var all = require("./all").all;
var race = require("./race").race;
var staticResolve = require("./resolve").resolve;
var staticReject = require("./reject").reject;
var asap = require("./asap").asap;

var counter = 0;

config.async = asap; // default async is asap;

function Promise(resolver) {
  if (!isFunction(resolver)) {
    throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
  }

  if (!(this instanceof Promise)) {
    throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
  }

  this._subscribers = [];

  invokeResolver(resolver, this);
}

function invokeResolver(resolver, promise) {
  function resolvePromise(value) {
    resolve(promise, value);
  }

  function rejectPromise(reason) {
    reject(promise, reason);
  }

  try {
    resolver(resolvePromise, rejectPromise);
  } catch(e) {
    rejectPromise(e);
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value, error, succeeded, failed;

  if (hasCallback) {
    try {
      value = callback(detail);
      succeeded = true;
    } catch(e) {
      failed = true;
      error = e;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (handleThenable(promise, value)) {
    return;
  } else if (hasCallback && succeeded) {
    resolve(promise, value);
  } else if (failed) {
    reject(promise, error);
  } else if (settled === FULFILLED) {
    resolve(promise, value);
  } else if (settled === REJECTED) {
    reject(promise, value);
  }
}

var PENDING   = void 0;
var SEALED    = 0;
var FULFILLED = 1;
var REJECTED  = 2;

function subscribe(parent, child, onFulfillment, onRejection) {
  var subscribers = parent._subscribers;
  var length = subscribers.length;

  subscribers[length] = child;
  subscribers[length + FULFILLED] = onFulfillment;
  subscribers[length + REJECTED]  = onRejection;
}

function publish(promise, settled) {
  var child, callback, subscribers = promise._subscribers, detail = promise._detail;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    invokeCallback(settled, child, callback, detail);
  }

  promise._subscribers = null;
}

Promise.prototype = {
  constructor: Promise,

  _state: undefined,
  _detail: undefined,
  _subscribers: undefined,

  then: function(onFulfillment, onRejection) {
    var promise = this;

    var thenPromise = new this.constructor(function() {});

    if (this._state) {
      var callbacks = arguments;
      config.async(function invokePromiseCallback() {
        invokeCallback(promise._state, thenPromise, callbacks[promise._state - 1], promise._detail);
      });
    } else {
      subscribe(this, thenPromise, onFulfillment, onRejection);
    }

    return thenPromise;
  },

  'catch': function(onRejection) {
    return this.then(null, onRejection);
  }
};

Promise.all = all;
Promise.race = race;
Promise.resolve = staticResolve;
Promise.reject = staticReject;

function handleThenable(promise, value) {
  var then = null,
  resolved;

  try {
    if (promise === value) {
      throw new TypeError("A promises callback cannot return that same promise.");
    }

    if (objectOrFunction(value)) {
      then = value.then;

      if (isFunction(then)) {
        then.call(value, function(val) {
          if (resolved) { return true; }
          resolved = true;

          if (value !== val) {
            resolve(promise, val);
          } else {
            fulfill(promise, val);
          }
        }, function(val) {
          if (resolved) { return true; }
          resolved = true;

          reject(promise, val);
        });

        return true;
      }
    }
  } catch (error) {
    if (resolved) { return true; }
    reject(promise, error);
    return true;
  }

  return false;
}

function resolve(promise, value) {
  if (promise === value) {
    fulfill(promise, value);
  } else if (!handleThenable(promise, value)) {
    fulfill(promise, value);
  }
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) { return; }
  promise._state = SEALED;
  promise._detail = value;

  config.async(publishFulfillment, promise);
}

function reject(promise, reason) {
  if (promise._state !== PENDING) { return; }
  promise._state = SEALED;
  promise._detail = reason;

  config.async(publishRejection, promise);
}

function publishFulfillment(promise) {
  publish(promise, promise._state = FULFILLED);
}

function publishRejection(promise) {
  publish(promise, promise._state = REJECTED);
}

exports.Promise = Promise;
},{"./all":24,"./asap":25,"./config":26,"./race":29,"./reject":30,"./resolve":31,"./utils":32}],29:[function(require,module,exports){
"use strict";
/* global toString */
var isArray = require("./utils").isArray;

/**
  `RSVP.race` allows you to watch a series of promises and act as soon as the
  first promise given to the `promises` argument fulfills or rejects.

  Example:

  ```javascript
  var promise1 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      resolve("promise 1");
    }, 200);
  });

  var promise2 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      resolve("promise 2");
    }, 100);
  });

  RSVP.race([promise1, promise2]).then(function(result){
    // result === "promise 2" because it was resolved before promise1
    // was resolved.
  });
  ```

  `RSVP.race` is deterministic in that only the state of the first completed
  promise matters. For example, even if other promises given to the `promises`
  array argument are resolved, but the first completed promise has become
  rejected before the other promises became fulfilled, the returned promise
  will become rejected:

  ```javascript
  var promise1 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      resolve("promise 1");
    }, 200);
  });

  var promise2 = new RSVP.Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error("promise 2"));
    }, 100);
  });

  RSVP.race([promise1, promise2]).then(function(result){
    // Code here never runs because there are rejected promises!
  }, function(reason){
    // reason.message === "promise2" because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  @method race
  @for RSVP
  @param {Array} promises array of promises to observe
  @param {String} label optional string for describing the promise returned.
  Useful for tooling.
  @return {Promise} a promise that becomes fulfilled with the value the first
  completed promises is resolved with if the first completed promise was
  fulfilled, or rejected with the reason that the first completed promise
  was rejected with.
*/
function race(promises) {
  /*jshint validthis:true */
  var Promise = this;

  if (!isArray(promises)) {
    throw new TypeError('You must pass an array to race.');
  }
  return new Promise(function(resolve, reject) {
    var results = [], promise;

    for (var i = 0; i < promises.length; i++) {
      promise = promises[i];

      if (promise && typeof promise.then === 'function') {
        promise.then(resolve, reject);
      } else {
        resolve(promise);
      }
    }
  });
}

exports.race = race;
},{"./utils":32}],30:[function(require,module,exports){
"use strict";
/**
  `RSVP.reject` returns a promise that will become rejected with the passed
  `reason`. `RSVP.reject` is essentially shorthand for the following:

  ```javascript
  var promise = new RSVP.Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  var promise = RSVP.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @for RSVP
  @param {Any} reason value that the returned promise will be rejected with.
  @param {String} label optional string for identifying the returned promise.
  Useful for tooling.
  @return {Promise} a promise that will become rejected with the given
  `reason`.
*/
function reject(reason) {
  /*jshint validthis:true */
  var Promise = this;

  return new Promise(function (resolve, reject) {
    reject(reason);
  });
}

exports.reject = reject;
},{}],31:[function(require,module,exports){
"use strict";
function resolve(value) {
  /*jshint validthis:true */
  if (value && typeof value === 'object' && value.constructor === this) {
    return value;
  }

  var Promise = this;

  return new Promise(function(resolve) {
    resolve(value);
  });
}

exports.resolve = resolve;
},{}],32:[function(require,module,exports){
"use strict";
function objectOrFunction(x) {
  return isFunction(x) || (typeof x === "object" && x !== null);
}

function isFunction(x) {
  return typeof x === "function";
}

function isArray(x) {
  return Object.prototype.toString.call(x) === "[object Array]";
}

// Date.now is not available in browsers < IE9
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now#Compatibility
var now = Date.now || function() { return new Date().getTime(); };


exports.objectOrFunction = objectOrFunction;
exports.isFunction = isFunction;
exports.isArray = isArray;
exports.now = now;
},{}],33:[function(require,module,exports){
// Generated by CoffeeScript 1.6.3
(function() {
  var EventEmitter, Postie,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  EventEmitter = require('events').EventEmitter;

  Postie = (function(_super) {
    __extends(Postie, _super);

    Postie.prototype.target = null;

    Postie.prototype.origin = null;

    function Postie(target, origin) {
      if (origin == null) {
        origin = '*';
      }
      this.handleMessage = __bind(this.handleMessage, this);
      if (!(this instanceof Postie)) {
        return new Postie(target, origin);
      }
      Postie.__super__.constructor.call(this);
      this.target = target;
      this.origin = origin;
      this.listen();
    }

    /*
    Sends a package over channel.
    
    - `channel` (String): The channel to send the package over
    - `pkg...` (Array...): The package to send. It will take any arguments after the first,
      stick them in a JSON array and then on the other end call the callback
      with those arguments applied to the callback.
    
    Returns the result of the postMessage call.
    */


    Postie.prototype.post = function() {
      var channel, packed, pkg;
      channel = arguments[0], pkg = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      packed = this.pack(channel, pkg);
      return this.target.postMessage(packed, this.origin);
    };

    /*
    Sets up the postMessage handler
    */


    Postie.prototype.listen = function() {
      if (window.addEventListener) {
        return window.addEventListener('message', this.handleMessage);
      } else {
        return window.attachEvent('onmessage', this.handleMessage);
      }
    };

    /*
    Handles a postmessage event. Attempt to unpack it, and if we can emit an
    event.
    
    - `event` (Event): The event to handle.
    */


    Postie.prototype.handleMessage = function(event) {
      var unpackaged;
      if (unpackaged = this.unpack(event.data)) {
        return this.emit.apply(this, [unpackaged.channel].concat(__slice.call(unpackaged["package"])));
      }
    };

    /*
    Takes a string from a postmessage event and tries to unpack it. If it is
    successful it will return the unpacked object, otherwise it will return
    false.
    
    - `data` (String): The data to attempt to unpack.
    
    Returns the unpacked data as an Object, or `false`.
    */


    Postie.prototype.unpack = function(data) {
      var error, pkg;
      try {
        pkg = JSON.parse(data);
        return {
          channel: pkg._postie.channel,
          "package": pkg._postie["package"]
        };
      } catch (_error) {
        error = _error;
        return false;
      }
    };

    /*
    Packs a channel string and a package to send into a String that we can send
    over postMessage to be unpacked on the other side.
    
    - `channel` (String): The channel the package is being sent on.
    - `pkg` (Mixed): The package to pack with the channel into the string.
    
    Returns a String which can be unpacked into its old representation via
    `@unpack()`.
    */


    Postie.prototype.pack = function(channel, pkg) {
      return JSON.stringify({
        _postie: {
          channel: channel,
          "package": pkg
        }
      });
    };

    return Postie;

  })(EventEmitter);

  module.exports = Postie;

}).call(this);

},{"events":4}],34:[function(require,module,exports){

/**
 * Module dependencies.
 */

var global = (function() { return this; })();

/**
 * WebSocket constructor.
 */

var WebSocket = global.WebSocket || global.MozWebSocket;

/**
 * Module exports.
 */

module.exports = WebSocket ? ws : null;

/**
 * WebSocket constructor.
 *
 * The third `opts` options object gets ignored in web browsers, since it's
 * non-standard, and throws a TypeError if passed to the constructor.
 * See: https://github.com/einaros/ws/issues/227
 *
 * @param {String} uri
 * @param {Array} protocols (optional)
 * @param {Object) opts (optional)
 * @api public
 */

function ws(uri, protocols, opts) {
  var instance;
  if (protocols) {
    instance = new WebSocket(uri, protocols);
  } else {
    instance = new WebSocket(uri);
  }
  return instance;
}

if (WebSocket) ws.prototype = WebSocket.prototype;

},{}],35:[function(require,module,exports){
/**
 * @fileoverview Parses the Veyron IDL
 */

var vError = require('../lib/verror');
var idlHelper = {};

/**
 * Generates an IDL wire description for a given service by iterating over the
 * methods in the service object.
 * Method names beginning with '_' are considered private and skipped.
 * Arg names beginning with '$' are not part of the idl and are filled in by
 * the veyron libraries (e.g. $context).
 * @param {object} service a description of the service. This is a map from
 * method name to method description.
 * @return {object} a representation of the idl. This must match the format of
 * JSONServiceSignature in Veyron's go code.
 */
idlHelper.generateIdlWireDescription = function(service) {
  var idlWire = {};
  var metadata = service.metadata;
  for (var methodName in metadata) {
    if (metadata.hasOwnProperty(methodName)) {
      var methodMetadata = metadata[methodName];

      var params = methodMetadata.params;
      var inArgs = [];
      for (var i = 0; i < params.length; i++) {
        var param = params[i];
        if (param[0] !== '$') {
          inArgs.push(param);
        }
      }

      idlWire[methodName] = {
        InArgs: inArgs,
        NumOutArgs: methodMetadata.numOutArgs + 1,
        IsStreaming: methodMetadata.injections['$stream'] !== undefined
      };
    }
  }

  return idlWire;
};

/**
 * Returns an array of parameter names for a function.
 * from go/fypon (stack overflow) and based on angularjs's implementation
 * @param {function} func the function object
 * @return {string[]} list of the parameters
 */
var getParamNames = function(func) {
  // represent the function as a string and strip comments
  var fnStr = func.toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, '');
  // get the arguments from the string
  var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).
      match(/([^\s,]+)/g);
  if (result === null) {
    result = [];
  }
  return result;
};

/**
 * Wraps a Service with annotations for each exported function.
 * @constructor
 * @param {object} service the service that is being exported.
 * @param {object} extraMetadata if provided, adds extra metadata for
 * the functions exported (such as number of return values).
 */
idlHelper.ServiceWrapper = function(service, extraMetadata) {
  this.object = service;
  this.metadata = {};
  extraMetadata = extraMetadata || {};

  for (var methodName in service) {
    if (service.hasOwnProperty(methodName) &&
        methodName.length > 0 && methodName[0] !== '_') {
      if (methodName[0] >= 'A' && methodName[0] <= 'Z') {
        var camelCaseName = methodName.charAt(0).toLowerCase() +
          methodName.slice(1);
        throw new Error('Method names must be camel case. Perhaps rename \'' +
          methodName + '\' to \'' + camelCaseName + '\'');
      }
      var method = service[methodName];
      if (typeof method === 'function') {
        var params = getParamNames(method);
        var injections = {};
        for (var i = 0; i < params.length; i++) {
          var name = params[i];
          if (name[0] === '$') {
            injections[name] = i;
          }
        }
        var metadata = {
          params: params,
          injections: injections,
          numOutArgs: 1
        };

        // We only want to copy over the accepted metadata options.
        if (extraMetadata[methodName]) {
          var extra = extraMetadata[methodName];
          if (extra.numOutArgs !== undefined) {
            metadata.numOutArgs = extra.numOutArgs;
          }
        }

        this.metadata[methodName] = metadata;
      }
    }
  }
};

idlHelper.ServiceWrapper.prototype.validate = function(definition) {
  for (var name in definition) {
    if (definition.hasOwnProperty(name)) {
      var metadata = this.metadata[name];
      if (!metadata) {
        return new vError.BadArgError('Missing method: ' + name);
      }
      var expected = definition[name];
      var inputArgs = metadata.params.length -
          Object.keys(metadata.injections).length;
      if (inputArgs !== expected.numInArgs) {
        return new vError.BadArgError('Wrong number of input args for ' +
            name + ', got: ' + inputArgs + ', expected: ' +
            expected.numInArgs);
      }

      if (metadata.numOutArgs !== expected.numOutArgs) {
        return new vError.BadArgError('Wrong number of output args for ' +
            name + ', got: ' + metadata.numOutArgs + ', expected ' +
            expected.numOutArgs);
      }

      var hasStreaming = metadata.injections.hasOwnProperty('$stream');
      var expectingStreaming = (expected.inputStreaming ||
          expected.outputStreaming);
      if (expectingStreaming && !hasStreaming) {
        return new vError.BadArgError('Expected ' + name + ' to be ' +
              'streaming');
      } else if (!expectingStreaming && hasStreaming) {
        return new vError.BadArgError('Expected ' + name + ' to not be ' +
              'streaming');

      }
    }
  }

  for (name in this.metadata) {
    if (this.metadata.hasOwnProperty(name) &&
        !definition.hasOwnProperty(name)) {
      return new vError.BadArgError('Unexpected method ' + name +
          ' implemented.');
    }
  }
  return null;
};

/**
 * Export the module
 */
module.exports = idlHelper;

},{"../lib/verror":40}],36:[function(require,module,exports){
/**
 *  @fileoverview Client for the veyron service.
 *
 *  Usage:
 *  var cl = new client(proxyConnection);
 *  var service = cl.bindTo('EndpointAddress', 'ServiceName');
 *  resultPromise = service.MethodName(arg);
 */

var Promise = require('es6-promise').Promise;

var Deferred = require('../lib/deferred');
var vLog = require('../lib/vlog');
var ErrorConversion = require('../proxy/error_conversion');
var Stream = require('../proxy/stream');
var vError = require('../lib/verror');
var MessageType = require('../proxy/message_type');
var IncomingPayloadType = require('../proxy/incoming_payload_type');

var OutstandingRPC = function(options, cb) {
  this._proxy = options.proxy;
  this._id = -1;
  this._name = options.name;
  this._methodName = options.methodName,
  this._args = options.args;
  this._numOutParams = options.numOutParams;
  this._isStreaming = options.isStreaming || false;
  this._cb = cb;
  this._def = null;
};

OutstandingRPC.prototype.start = function() {
  this._id = this._proxy.nextId();
  var def = new Deferred(this._cb);

  var streamingDeferred = null;
  if (this._isStreaming) {
    streamingDeferred = new Deferred();
    def.stream = new Stream(this._id, streamingDeferred.promise, true);
    def.promise.stream = def.stream;
  }

  var message = this.constructMessage();

  this._def = def;
  this._proxy.sendRequest(message, MessageType.REQUEST, this, this._id);
  if (streamingDeferred) {
    this._proxy.senderPromise.then(function(ws) {
      streamingDeferred.resolve(ws);
    }, function(err) {
      streamingDeferred.reject(err);
    });
  }

  return def.promise;
};

OutstandingRPC.prototype.handleResponse = function(type, data) {
  switch (type) {
    case IncomingPayloadType.FINAL_RESPONSE:
      this.handleCompletion(data);
      break;
    case IncomingPayloadType.STREAM_RESPONSE:
      this.handleStreamData(data);
      break;
    case IncomingPayloadType.ERROR_RESPONSE:
      this.handleError(data);
      break;
    case IncomingPayloadType.STREAM_CLOSE:
      this.handleStreamClose();
      break;
    default:
      this.handleError(
          new vError.InternalError('Recieved unknown response type from wspr'));
      break;
  }
};

OutstandingRPC.prototype.handleCompletion = function(data) {
  if (data.length === 1) {
    data = data[0];
  }
  this._def.resolve(data);
  if (this._def.stream) {
    this._def.stream._queueRead(null);
  }
  this._proxy.dequeue(this._id);
};

OutstandingRPC.prototype.handleStreamData = function(data) {
  if (this._def.stream) {
    this._def.stream._queueRead(data);
  } else {
    vLog.warn('Ignoring streaming message for non-streaming flow : ' +
        this._id);
  }
};

OutstandingRPC.prototype.handleStreamClose = function() {
  if (this._def.stream) {
    this._def.stream._queueRead(null);
  }
};

OutstandingRPC.prototype.handleError = function(data) {
  var err;
  if (data instanceof vError.VeyronError) {
    err = data;
  } else {
    err = ErrorConversion.toJSerror(data);
  }

  if (this._def.stream) {
    this._def.stream.emit('error', err);
    this._def.stream.queueRead(null);
  }
  this._def.reject(err);
  this._proxy.dequeue(this._id);
};


/**
 * Construct a message to send to the veyron native code
 * @return {string} json string to send to jspr
 */
OutstandingRPC.prototype.constructMessage = function() {
  var jsonMessage = {
    name: this._name,
    method: this._methodName,
    inArgs: this._args || [],
    numOutArgs: this._numOutParams || 1,
    isStreaming: this._isStreaming
  };
  return JSON.stringify(jsonMessage);
};

/**
 * Client for the veyron service.
 * @constructor
 * @param {Object} proxyConnection Veyron proxy client
 */
function Client(proxyConnection) {
  if (!(this instanceof Client)) {
    return new Client(proxyConnection);
  }

  this._proxyConnection = proxyConnection;
}

/**
 * Performs client side binding of a remote service to a native javascript
 * stub object.
 * @param {string} name the veyron name of the service to bind to.
 * @param {object} optServiceSignature if set, javascript signature of methods
 * available in the remote service.
 * @param {function} [callback] if given, this function will be called on
 * completion of the bind.  The first argument will be an error if there is
 * one, and the second argument is an object with methods that perform rpcs to
 * service
 * methods.
 * @return {Promise} An object with methods that perform rpcs to service methods
 */
Client.prototype.bindTo = function(name, optServiceSignature, callback) {
  var self = this;
  if (typeof(optServiceSignature) === 'function') {
    callback = optServiceSignature;
    optServiceSignature = undefined;
  }

  var def = new Deferred(callback);
  var serviceSignaturePromise;

  if (optServiceSignature !== undefined) {
    serviceSignaturePromise = Promise.resolve(optServiceSignature);
  } else {
    vLog.debug('Requesting service signature for:', name);
    serviceSignaturePromise = self._proxyConnection.getServiceSignature(name);
  }

  var promise = def.promise;
  serviceSignaturePromise.then(function(serviceSignature) {
    vLog.debug('Received signature for:', name, serviceSignature);
    var boundObject = {};
    var bindMethod = function(methodName) {
      var methodInfo = serviceSignature[methodName];
      var numOutParams = methodInfo.numOutArgs;
      boundObject[methodName] = function() {
        var args = Array.prototype.slice.call(arguments, 0);
        var cb = null;
        if (args.length === methodInfo.inArgs.length + 1) {
          cb = args[args.length - 1];
          args = args.slice(0, methodInfo.inArgs.length);
        }
        if (args.length !== methodInfo.inArgs.length) {
          throw new Error('Invalid number of arguments to "' +
            methodName + '". Expected ' + methodInfo.inArgs.length +
            ' but there were ' + args.length);
        }
        var rpc = new OutstandingRPC({
           proxy: self._proxyConnection,
           name: name,
           methodName: methodName,
           args: args,
           numOutParams: numOutParams,
           isStreaming: methodInfo.isStreaming
        }, cb);
        return rpc.start();
      };
    };

    for (var methodName in serviceSignature) {
      if (serviceSignature.hasOwnProperty(methodName)) {
        bindMethod(methodName);
      }
    }

    //Also stub out signature() on the bound object.
    boundObject.signature = function() {
      return Promise.resolve(serviceSignature);
    };

    def.resolve(boundObject);
  }).catch (def.reject);

  return promise;
};

/**
 * Export the module
 */
module.exports = Client;

},{"../lib/deferred":39,"../lib/verror":40,"../lib/vlog":41,"../proxy/error_conversion":45,"../proxy/incoming_payload_type":46,"../proxy/message_type":47,"../proxy/stream":50,"es6-promise":23}],37:[function(require,module,exports){
/**
 *  @fileoverview Server allows creation of services that can be invoked
 *  remotely via RPCs.
 *
 *  Usage:
 *  var videoService = {
 *    play: {
 *      // Play video
 *    }
 *  };
 *
 *  var s = new server(proxyConnection);
 *  s.serve('mymedia/video', videoService);
 */

var Deferred = require('./../lib/deferred');
var IdlHelper = require('./../idl/idl');
var vError = require('./../lib/verror');
var ServiceWrapper = IdlHelper.ServiceWrapper;

var nextServerID = 1; // The ID for the next server.

/**
 * represents a veyron server which allows registration of services that can be
 * invoked remotely via RPCs.
 * @constructor
 * @param {Object} router the server router.
 */
function Server(router) {
  if (!(this instanceof Server)) {
    return new Server(router);
  }

  this._router = router;
  this.id = nextServerID++;
  this.serviceObject = null;
  this._knownServiceDefinitions = {};
}

/**
 * addIDL adds an IDL file to the set of definitions known by the server.
 * Services defined in IDL files passed into this method can be used to
 * describe the interface exported by a serviceObject passed into register.
 * @param {object} updates the output of the vdl tool on an idl.
 */
Server.prototype.addIDL = function(updates) {
  var prefix = updates.package;
  for (var key in updates) {
    if (key[0] === key[0].toUpperCase() && updates.hasOwnProperty(key)) {
      this._knownServiceDefinitions[prefix + '.' + key] = updates[key];
    }
  }
};

// Returns an error if the validation of metadata failed.
Server.prototype._getAndValidateMetadata = function(serviceObject,
    serviceMetadata) {
  var shouldCheckDefinition = false;
  if (typeof(serviceMetadata) === 'string') {
    serviceMetadata = [serviceMetadata];
  }

  if (Array.isArray(serviceMetadata)) {
    shouldCheckDefinition = true;
    var serviceDefinitions = {};

    for (var i = 0; i < serviceMetadata.length; i++) {
      var key = serviceMetadata[i];
      var object = this._knownServiceDefinitions[key];
      if (!object) {
        return new vError.NotFoundError('unknown service ' + key);
      }
      // Merge the results into the single definitions object.
      for (var k in object) {
        if (object.hasOwnProperty(k)) {
          serviceDefinitions[k] = object[k];
        }
      }
    }
    serviceMetadata = serviceDefinitions;
  }

  var wrapper = new ServiceWrapper(serviceObject, serviceMetadata);

  if (shouldCheckDefinition) {
    var err2 = wrapper.validate(serviceMetadata);
    if (err2) {
      return err2;
    }
  }

  this.serviceObject = wrapper;

  return null;
};

/**
 * Serve serves the given service object under the given name.  It will
 * register them with the mount table and maintain that registration so long
 * as the stop() method has not been called.  The name determines where
 * in the mount table's name tree the new services will appear.
 *
 * To serve names of the form "mymedia/*" make the calls:
 * serve("mymedia", myService);

 * serve may be called multiple times to serve the same service under
 * multiple names.  If different objects are given on the different calls
 * it is considered an error.
 *
 * @param {string} name Name to serve under
 * @param {Object} serviceObject service object to serve
 * @param {*} serviceMetadata if provided a set of metadata for functions
 * in the service (such as number of return values).  It could either be
 * passed in as a properties object or a string that is the name of a
 * service that was defined in the idl files that the server knows about.
 * @param {function} callback if provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when serve completes or fails
 * the endpoint address of the server will be returned as the value of promise
 */
Server.prototype.serve = function(name, serviceObject,
    serviceMetadata, callback) {
  if (!callback && typeof(serviceMetadata) === 'function') {
    callback = serviceMetadata;
    serviceMetadata = null;
  }

  var err = this._getAndValidateMetadata(serviceObject, serviceMetadata);
  if (err) {
    var def = new Deferred(callback);
    def.reject(err);
    return def.promise;
  }

  return this._router.serve(name, this, callback);
};

/**
 * Stop gracefully stops all services on this Server.
 * New calls are rejected, but any in-flight calls are allowed to complete.
 * All published named are unmounted.
 * @param {function} callback if provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when stop service completes or fails
 */
Server.prototype.stop = function(callback) {
  return this._router.stopServer(this, callback);
};

/**
 * Generates an IDL wire description for all the registered services
 * @return {Object.<string, Object>} map from service name to idl wire
 * description
 */
Server.prototype.generateIdlWireDescription = function() {
  return IdlHelper.generateIdlWireDescription(this.serviceObject);
};

/**
 * Export the module
 */
module.exports = Server;

},{"./../idl/idl":35,"./../lib/deferred":39,"./../lib/verror":40}],38:[function(require,module,exports){
/**
 * @fileoveriew A router that handles incoming server rpcs.
 */

var Promise = require('es6-promise').Promise;

var Stream = require('../proxy/stream');
var MessageType = require('../proxy/message_type');
var IncomingPayloadType = require('../proxy/incoming_payload_type');
var ErrorConversion = require('../proxy/error_conversion');
var Deferred = require('./../lib/deferred');
var vLog = require('./../lib/vlog');
var SimpleHandler = require('../proxy/simple_handler');
var PublicId = require('../security/public');


var ServerStream = function(stream) {
  this._stream = stream;
};

ServerStream.prototype.handleResponse = function(type, data) {
  switch (type) {
    case IncomingPayloadType.STREAM_RESPONSE:
      this._stream._queueRead(data);
      break;
    case IncomingPayloadType.STREAM_CLOSE:
      this._stream._queueRead(null);
      break;
    case IncomingPayloadType.ERROR_RESPONSE:
      this._stream.emit('error', ErrorConversion.toJSerror(data));
      break;
  }
};

/**
 * A router that handles routing incoming requests to the right
 * server
 * @constructor
 */
var Router = function(proxy) {
  this._servers = {};
  this._proxy = proxy;
  this._streamMap = {};
  proxy.addIncomingHandler(IncomingPayloadType.INVOKE_REQUEST, this);
};

/**
 * Injects the injections into the eight positions in args and
 * returns what was injected.
 * @param {Array} args The arguments to inject into.
 * @param {Object} injectionPositions A map of injected variables to the
 * position to put in args.
 * @param {Object} injections A map of injected variables to values.
 * @return {Array} the array of variables that were injected.
 */
var inject = function(args, injectionPositions, injections) {
  var keys = Object.keys(injectionPositions);
  var invertedMap = {};
  keys.forEach(function(key) {
    invertedMap[injectionPositions[key]] = key;
  });
  var values = keys.map(function getValue(k) {
    return injectionPositions[k];
  });
  values.filter(function removeUndefined(value) {
    return value !== undefined;
  });
  values.sort();
  var keysInserted = [];
  values.forEach(function actuallyInject(pos) {
    var key = invertedMap[pos];
    args.splice(pos, 0, injections[key]);
    keysInserted.push(key);
  });
  return keysInserted;
};

// Wraps the call to the method with a try block in the smallest
// function possible, so that v8 de-optimizes as little as possible.
Router.prototype.invokeMethod = function (receiver, method, args) {
  // Call the registered method on the requested service
  try {
    return method.apply(receiver, args);
  } catch (e) {
    if (e instanceof Error) {
      return e;
    }
    return new Error(e);
  }
};

/**
 * Handles incoming requests from the server to invoke methods on registered
 * services in JavaScript.
 * @param {string} messageId Message Id set by the server.
 * @param {Object} request Invocation request JSON. Request's structure is
 * {
 *   serverId: number // the server id
 *   method: string // Name of the method on the service to call
 *   args: [] // Array of positional arguments to be passed into the method
 * }
 */
Router.prototype.handleRequest = function(messageId, request) {
  var err;
  var server = this._servers[request.serverId];
  if (!server) {
    err = new Error('Request for unknown server ' + request.serverId);
    this.sendResult(messageId, request.method, null, err);
    return;
  }

  var serviceWrapper = server.serviceObject;
  if (!serviceWrapper) {
    err = new Error('No service found');
    this.sendResulttResult(messageId, request.method, null, err);
    return;
  }

  var serviceObject = serviceWrapper.object;

  // Find the method
  var serviceMethod = serviceObject[request.method];
  if (serviceMethod === undefined) {
    err = new Error('Requested method ' + request.method +
        ' not found on');
    this.sendResult(messageId, request.method, null, err);
    return;
  }
  var metadata = serviceWrapper.metadata[request.method];

  var self = this;
  var sendInvocationError = function(e, metadata) {
    var stackTrace;
    if (e instanceof Error && e.stack !== undefined) {
      stackTrace = e.stack;
    }
    vLog.debug('Requested method ' + request.method +
        ' threw an exception on invoke: ', e, stackTrace);
    var numOutArgs = metadata.numOutArgs;
    var result;
    switch (numOutArgs) {
      case 0:
        break;
      case 1:
        result = null;
        break;
      default:
        result = new Array(numOutArgs);
    }
    self.sendResult(messageId, request.method, result, e,
        metadata);
  };
  var args = request.args;

  var context = {
    suffix: request.context.suffix,
    name: request.context.name,
    remoteId: new PublicId(request.context.remoteID.names,
                           request.context.remoteID.handle,
                           this._proxy)
  };

  // Create callback to pass to the function, if it is requested.
  var finished = false;
  var cb = function callback(e, v) {
    if (finished) {
      return;
    }
    finished = true;
    context.remoteId.release();
    self.sendResult(messageId, request.method, v, e, metadata);
  };

  var injections = {
    $stream: new Stream(messageId, this._proxy.senderPromise, false),
    $callback: cb,
    $context: context,
    $suffix: context.suffix,
    $name: context.name,
    $remoteId: context.remoteId
  };

  var variables = inject(args, metadata.injections, injections);
  if (variables.indexOf('$stream') !== -1) {
    var stream = injections['$stream'];
    this._streamMap[messageId] = stream;
    var rpc = new ServerStream(stream);
    this._proxy.addIncomingStreamHandler(messageId, rpc);
  }

  // Invoke the method
  var result = this.invokeMethod(serviceObject, serviceMethod, args);

  if (result instanceof Error) {
    sendInvocationError(result, metadata);
    return;
  }

  // Normalize result to be a promise
  var resultPromise = Promise.resolve(result);

  if (variables.indexOf('$callback') !== -1) {
    // The callback takes care of sending the result, so we don't use the
    // promises.
    return;
  }

  // Send the result back to the server
  resultPromise.then(function(value) {
    if (finished) {
      return;
    }
    context.remoteId.release();
    finished = true;
    self.sendResult(messageId, request.method, value,
        null, metadata);
  }, function(err) {
    if (finished) {
      return;
    }
    finished = true;
    sendInvocationError(err, metadata);
  });
};

/**
 * Sends the result of a requested invocation back to jspr
 * @param {string} messageId Message id of the original invocation request
 * @param {string} name Name of method
 * @param {Object} value Result of the call
 * @param {Object} err Error from the call
 * @param {Object} metadata Metadata about the function.
 */
Router.prototype.sendResult = function(messageId, name, value, err, metadata) {
  var results = [];
  if (metadata) {
    switch (metadata.numOutArgs) {
      case 0:
        if (value !== undefined) {
          vLog.error('Unexpected return value from ' + name + ': ' + value);
        }
        results = [];
        break;
      case 1:
        results = [value];
        break;
      default:
        if (Array.isArray(value)) {
          if (value.length !== metadata.numOutArgs) {
            vLog.error('Wrong number of arguments returned by ' + name +
                '. expected: ' + metadata.numOutArgs + ', got:' +
                value.length);
          }
          results = value;
        } else {
          vLog.error('Wrong number of arguments returned by ' + name +
              '. expected: ' + metadata.numOutArgs + ', got: 1');
          results = [value];
        }
    }
  } else {
    results = [value];
  }

  var errorStruct = null;
  if (err !== undefined && err !== null) {
    errorStruct = ErrorConversion.toStandardErrorStruct(err);
  }

  // If this is a streaming request, queue up the final response after all
  // the other stream requests are done.
  var stream = this._streamMap[messageId];
  if (stream) {
    // We should probably remove the stream from the dictionary, but it's
    // not clear if there is still a reference being held elsewhere.  If there
    // isn't, then GC might prevent this final message from being sent out.
    stream.serverClose(value, errorStruct);
    this._proxy.dequeue(messageId);
  } else {
    var responseData = {
      results: results,
      err: errorStruct
    };

    var responseDataJSON = JSON.stringify(responseData);
    this._proxy.sendRequest(responseDataJSON, MessageType.RESPONSE, null,
        messageId);
  }
};

/**
 * Serves the server under the given name
 * @param {string} name Name to serve under
 * @param {Veyron.Server} The server who will handle the requests for this
 * name.
 * @param {function} [callback] If provided, the function will be called when
 * serve completes.  The first argument passed in is the error if there
 * was any and the second argument is the endpoint.
 * @return {Promise} Promise to be called when serve completes or fails
 * the endpoint string of the server will be returned as the value of promise
 */
Router.prototype.serve = function(name, server, callback) {
  vLog.info('Serving under the name: ', name);

  var messageJSON = {
    name: name,
    serverId: server.id,
    service: server.generateIdlWireDescription()
  };

  this._servers[server.id] = server;

  var def = new Deferred(callback);
  var message = JSON.stringify(messageJSON);
  var id = this._proxy.id;
  this._proxy.id += 2;
  var handler = new SimpleHandler(def, this._proxy, id);
  // Send the serve request to the proxy
  this._proxy.sendRequest(message, MessageType.SERVE, handler, id);

  return def.promise;
};

/**
 * Sends a stop server request to jspr.
 * @param {Server} server Server object to stop.
 * @param {function} callback if provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when stop service completes or fails
 */
Router.prototype.stopServer = function(server, callback) {
  var self = this;

  var def = new Deferred(callback);
  var id = this._proxy.id;
  this._proxy.id += 2;
  var handler = new SimpleHandler(def, this._proxy, id);
  // Send the stop request to jspr
  this._proxy.sendRequest(server.id.toString(), MessageType.STOP, handler, id);

  return def.promise.then(function(result) {
    delete self._servers[server.id];
    return result;
  });
};


module.exports = Router;


},{"../proxy/error_conversion":45,"../proxy/incoming_payload_type":46,"../proxy/message_type":47,"../proxy/simple_handler":49,"../proxy/stream":50,"../security/public":54,"./../lib/deferred":39,"./../lib/vlog":41,"es6-promise":23}],39:[function(require,module,exports){
(function (process){
/**
 * @fileoverview A lightweight deferred implementation using ES6 Promise
 * Deferred are sometimes easier to use since they can be passed around
 * and rejected, resolved by other code whereas Promise API does not expose
 * reject and resolve publicly.
 */

var Promise = require('es6-promise').Promise;

var Deferred = function(cb) {
  var self = this;

  this.promise = new Promise(function(resolve, reject) {
    self.resolve = resolve;
    self.reject = reject;
  });

  if (cb) {
    this.promise.then(function resolve(v) {
      cb(null, v);
    }, function error(e) {
      cb(e);
    })
    .catch(function(err){
      // NOTE: Debugging exceptions with the es6-promise library is
      // problematic due to the way wrapping the function calls in a
      // try/catch swallows exceptions (thrown errors, Type Errors, illegal
      // coercion, etc.) where an explicit call to promise.catch(fn) has been
      // omitted. Even if the .catch() method invocation is added there is no
      // way to bubble the error in a natural way. Errors within the catch
      // function are wrapped in the same promise try/catch machination so
      // throwing within the .catch() callback will not yield useful or
      // desired results.
      //
      // There are a few suggestions on how to deal with this:
      //
      // * Use a better library: http://goo.gl/M3qUpG
      // * Break the error out of the stack: http://goo.gl/yBL6Di
      // * "Double catch pattern": http://goo.gl/BgT8in
      //
      // Below is a primitive way to break the error out of the wrapping
      // promise stack as suggested by the author of the es6-promise library.
      // This should help with some of the common development problems where
      // errors are seemingly swallowed during testing and feature
      // development.
      //
      // This trick helps narrow down the source of common development bugs
      // related to evaporating exceptions, keep in mind it's not a total
      // fix as there are still some errors that are still not propagating
      // correctly.
      //
      // Please keep this note here until a better solution for debugging
      // exceptions with promises is made available.
      //
      // TODO(jasoncampbell): Find a better way to manage the problem of
      // debugging exceptions within promised wrapped code.
      process.nextTick(function(){
        throw err;
      });
    });
  }
};

/**
 * Export the module
 */
module.exports = Deferred;

}).call(this,require("FWaASH"))
},{"FWaASH":6,"es6-promise":23}],40:[function(require,module,exports){
/**
 * @fileoverview built-in Veyron errors
 */

var inherits = require('util').inherits;

var vError = {};

/*
 * List of predefined error ids. Matches veyron2/vError/common.idl
 */
vError.Ids = {
  Aborted: 'veyron2/verror.Aborted',
  BadArg: 'veyron2/verror.BadArg',
  BadProtocol: 'veyron2/verror.BadProtocol',
  Exists: 'veyron2/verror.Exists',
  Internal: 'veyron2/verror.Internal',
  NotAuthorized: 'veyron2/verror.NotAuthorized',
  NotFound: 'veyron2/verror.NotFound'
};

/*
 * Creates an error object given the ID as the name and a message
 * @constructor
 * @param {string} message message
 * @param {vError.Ids} id Error id
 */
vError.VeyronError = function(message, id) {
  if (!(this instanceof vError.VeyronError)) {
    return new vError.VeyronError(message, id);
  }
  Error.call(this);
  this.message = message;
  if (id) {
    this.name = id;
  }
  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(this, vError.VeyronError);
  } else {
    this.stack = (new Error()).stack;
  }
};
inherits(vError.VeyronError, Error);

/*
 * Tests if two errors are equal.
 * If the errors are both VeyronErrors then this returns true
 * when their messange and names are equal.  Other cases return false.
 * @param {Error} a An error to compare
 * @param {Error} a An error to compare
 * @return {boolean} Returns true if the errors are equal.
 */
vError.equals = function(a, b) {
  var ais = a instanceof vError.VeyronError;
  var bis = b instanceof vError.VeyronError;
  if (ais && bis) {
    return a.message === b.message && a.id === b.id;
  }
  return false;
};

/*
 * Creates an error object indicating operation aborted, e.g. connection closed.
 * @constructor
 * @param {string} message message
 */
vError.AbortedError = function(message) {
  if (!(this instanceof vError.AbortedError)) {
    return new vError.AbortedError(message);
  }
  vError.VeyronError.call(this, message, vError.Ids.Aborted);
};
inherits(vError.AbortedError, vError.VeyronError);

/*
 * Creates an error object indicating requester specified an invalid argument.
 * @constructor
 * @param {string} message message
 * @return {Error} Error object with name set to the badarg error id.
 */
vError.BadArgError = function(message) {
  if (!(this instanceof vError.BadArgError)) {
    return new vError.BadArgError(message);
  }
  vError.VeyronError.call(this, message, vError.Ids.BadArg);
};
inherits(vError.BadArgError, vError.VeyronError);

/*
 * Creates an error object indicating protocol mismatch,
 * including type or argument errors.
 * @param {string} message message
 * @return {Error} Error object with name set to the bad protocol error id.
 */
vError.BadProtocolError = function(message) {
  if (!(this instanceof vError.BadProtocolError)) {
    return new vError.BadProtocolError(message);
  }
  vError.VeyronError.call(this, message, vError.Ids.BadProtocol);
};
inherits(vError.BadProtocolError, vError.VeyronError);

/*
 * Creates an error object indicating requested entity already exists
 * @param {string} message message
 * @return {Error} Error object with name set to the exists error id.
 */
vError.ExistsError = function(message) {
  if (!(this instanceof vError.ExistsError)) {
    return new vError.ExistsError(message);
  }
  vError.VeyronError.call(this, message, vError.Ids.Exists);
};
inherits(vError.ExistsError, vError.VeyronError);

/*
 * Creates an error object indicating internal invariants broken;
 * something is very wrong
 * @param {string} message message
 * @return {Error} Error object with name set to the internal error id.
 */
vError.InternalError = function(message) {
  if (!(this instanceof vError.InternalError)) {
    return new vError.InternalError(message);
  }
  vError.VeyronError.call(this, message, vError.Ids.Internal);
};
inherits(vError.InternalError, vError.VeyronError);

/*
 * Creates an error object indicating requester isn't authorized
 * to access the entity.
 * @param {string} message message
 * @return {Error} Error object with name set to the not authorized error id.
 */
vError.NotAuthorizedError = function(message) {
  if (!(this instanceof vError.NotAuthorizedError)) {
    return new vError.NotAuthorizedError(message);
  }
  vError.VeyronError.call(this, message, vError.Ids.NotAuthorized);
};
inherits(vError.NotAuthorizedError, vError.VeyronError);

/*
 * Creates an Error object indicating requested entity (e.g. object, method)
 * not found
 * @param {string} message message
 * @return {Error} Error object with name set to the not found error id.
 */
vError.NotFoundError = function(message) {
  if (!(this instanceof vError.NotFoundError)) {
    return new vError.NotFoundError(message);
  }
  vError.VeyronError.call(this, message, vError.Ids.NotFound);
};
inherits(vError.NotFoundError, vError.VeyronError);

module.exports = vError;

},{"util":22}],41:[function(require,module,exports){
/**
 * @fileoverview A lightweight logging framework for JavaScript to be used
 * in place of console so that we can persist the logs if needed and turn
 * logging off at different levels.
 */
var vlog = function() {

  // default level is nolog
  this.level = this.levels.NOLOG;
};

/**
 * Enum for different log levels
 * @readonly
 * @enum {number}
 */
vlog.prototype.levels = {
  NOLOG: 0, // No logs are written
  ERROR : 1, // Only errors are written
  WARN: 2, // Only errors and warnings are written
  DEBUG : 3, // Errors, warnings and debug messages are written
  INFO : 4 // All logs are written,
};

/**
 * Logs arguments as errors to the console if log level is error or higher
 */
vlog.prototype.error = function() {
  this._log(this.levels.ERROR, arguments);
};

/**
 * Logs arguments as warnings to the console if log level is warning or higher
 */
vlog.prototype.warn = function() {
  this._log(this.levels.WARN, arguments);
};

/**
 * Logs arguments as logs to the console if log level is debug or higher
 */
vlog.prototype.debug = function() {
  this._log(this.levels.DEBUG, arguments);
};

/**
 * Logs arguments as info to the console if log level is info or higher
 */
vlog.prototype.info = function() {
  this._log(this.levels.INFO, arguments);
};

vlog.prototype._log = function(level, args) {
  if (this.level >= level) {
    this._write(level, args);
  }
};

vlog.prototype._write = function(level, args) {
  var c = this._getConsole();

  if (!c) {
    return;
  }

  var consoleFunc = c.log;
  switch (level) {
    case this.levels.ERROR:
      consoleFunc = c.error;
      break;
    case this.levels.WARN:
      consoleFunc = c.warn;
      break;
    case this.levels.DEBUG:
      consoleFunc = c.log;
      break;
    case this.levels.INFO:
      consoleFunc = c.info;
      break;
  }

  consoleFunc.apply(c, args);
};

vlog.prototype._getConsole = function() {
  if (typeof console !== 'undefined') {
    return console;
  }

  return null;
};

var vlogInstance = new vlog();
/*
 * Export the module
 */
module.exports = vlogInstance;

},{}],42:[function(require,module,exports){
/**
 *  @fileoverview Web Socket provider for NodeJS
 */

var WS = require('ws');

/**
 * Export module
 */
module.exports = WS;


},{"ws":34}],43:[function(require,module,exports){
/**
 *  @fileoverview Client library for the Namespace.
 */

var Promise = require('es6-promise').Promise;

var nameUtil = require('./util.js');
var Deferred = require('../lib/deferred');
var vError = require('../lib/verror');

/**
 * Namespace handles manipulating and querying from the mount table.
 * @param {object} client A veyron client.
 * @param {...string} roots root addresses to use as the root mount tables.
 * @constructor
 */
var Namespace = function(client, roots) {
  this._client = client;
  this._roots = roots;
};

/*
 * Error returned when resolution hits a non-mount table.
 */
Namespace.errNotAMountTable = function() {
  return new vError.VeyronError(
    'Resolution target is not a mount table', vError.Ids.Aborted);
};

/*
 * Error returned from the mount table server when reading a non-existant name.
 */
Namespace.errNoSuchName = function() {
  return new vError.VeyronError(
    'Name doesn\'t exist', vError.Ids.NotFound);
};

/*
 * Error returned from the mount table server when reading a non-existant name.
 */
Namespace.errNoSuchNameRoot = function() {
  return new vError.VeyronError(
    'Name doesn\'t exist: root of namespace', vError.NotFound);
};

/*
 * Maximum number of hops between servers we will make to resolve a name.
 */
Namespace._maxDepth = 32;

/*
 * Make a name relative to the roots of this namespace.
 * @param {string} name A name.
 * @return {Array} A list of rooted names.
 */
Namespace.prototype._rootNames = function(name) {
  if (nameUtil.isRooted(name) && name !== '/') {
    return [name];
  }
  var out = [];
  for (var i = 0; i < this._roots.length; i++) {
    out.push(nameUtil.join(this._roots[i], name));
  }
  return out;
};

/*
 * Utility function to join a suffix to a list of servers.
 * @param {Array} results An array of return values from a
 * resolveStep call.  The first element of the array is a list of servers.
 * The second element should be a string suffix.
 * @return {Array} list of servers with suffix appended.
 */
function convertServersToStrings(results) {
  var servers = results[0];
  var suffix = results[1];
  var out = [];
  for (var i = 0; i < servers.length; i++) {
    var name = servers[i].server;
    if (suffix !== '') {
      name = nameUtil.join(name, suffix);
    }
    out.push(name);
  }
  return out;
}

/*
 * Utility function to make an array of names terminal.
 * @param {Array} names List of names.
 * @return {Array} list of terminal names.
 */
function makeAllTerminal(names) {
  return names.map(nameUtil.convertToTerminalName);
}

/*
 * Utility function to check if every name in an array is terminal.
 * @param {Array} names List of names.
 * @return {boolean} true if every name in the input was terminal.
 */
function allAreTerminal(names) {
  return names.every(nameUtil.isTerminal);
}

/*
 * Utility method to try a single resolve step against a list of
 * mirrored MountTable servers.
 * @param {Array} names List of names representing mirrored MountTable servers.
 * @return {Promise} a promise that will be fulfilled with a list of further
 * resolved names.
 */
Namespace.prototype._resolveAgainstMountTable = function(names) {
  if (names.length === 0) {
    return Promise.reject(
      new vError.BadArgError('No servers to resolve query.'));
  }

  // TODO(mattr): Maybe make this take a service signature.
  // That would be more efficient, but we would need to do error handling
  // differently.
  var self = this;
  var name = nameUtil.convertToTerminalName(names[0]);
  return this._client.bindTo(name).then(function onBind(service) {
    if (service.resolveStep === undefined) {
      throw Namespace.errNotAMountTable();
    }
    return service.resolveStep().then(convertServersToStrings);
  }).catch(function onError(err) {
    if (vError.equals(err, Namespace.errNoSuchName()) ||
        vError.equals(err, Namespace.errNoSuchNameRoot()) ||
        names.length <= 1) {
      throw err;
    } else {
      return self._resolveAgainstMountTable(names.slice(1));
    }
  });
};

/*
 * Utility method to try a sequence of resolves until the resulting names are
 * entirely terminal.
 * @param {Array} curr List of equivalent names to try on this step.
 * @param {Array} last List of names that were tried on the previous step.
 * @param {number} depth The current depth of the recursive traversal.
 * @param {function} handleErrors A function that errors will be passed to
 * for special handling depending on the caller.
 * @return {Promise} a promise that will be fulfilled with a list of terminal
 * names.
 */
Namespace.prototype._resolveLoop = function(curr, last, depth, handleErrors) {
  var self = this;
  return self._resolveAgainstMountTable(curr).then(function onResolve(names) {
    if (allAreTerminal(names)) {
      return names;
    }
    depth++;
    if (depth > Namespace._maxDepth) {
      throw new vError.InternalError('Maxiumum resolution depth exceeded.');
    }
    return self._resolveLoop(names, curr, depth, handleErrors);
  }, function onError(err) {
    return handleErrors(err, curr, last);
  });
};

/**
 * resolveToMountTable resolves a veyron name to the terminal name of the
 * innermost mountable that owns the name.
 * @param {string} name The name to resolve.
 * @param {function} [callback] if given, this fuction will be called on
 * completion of the resolve.  The first argument will be an error if there
 * is one, and the second argument is a list of terminal names.
 * @return {Promise} A promise to a list of terminal names.
 */
Namespace.prototype.resolveToMountTable = function(name, callback) {
  var names = this._rootNames(name);
  var deferred = new Deferred(callback);
  var handleErrors = function(err, curr, last) {
    if (vError.equals(err, Namespace.errNoSuchNameRoot()) ||
        vError.equals(err, Namespace.errNotAMountTable())) {
      return makeAllTerminal(last);
    }
    if (vError.equals(err, Namespace.errNoSuchName())) {
      return makeAllTerminal(curr);
    }
    throw err;
  };

  deferred.resolve(this._resolveLoop(names, names, 0, handleErrors));

  return deferred.promise;
};

/**
 * resolveMaximally resolves a veyron name as far as it can, whether the
 * target is a mount table or not.
 * @param {string} name The name to resolve.
 * @param {function} [callback] if given, this fuction will be called on
 * completion of the resolve.  The first argument will be an error if there
 * is one, and the second argument is a list of terminal names.
 * @return {Promise} A promise to a list of terminal names.
 */
Namespace.prototype.resolveMaximally = function(name, callback) {
  var names = this._rootNames(name);
  var deferred = new Deferred(callback);
  var handleErrors = function(err, curr, last){
    if (vError.equals(err, Namespace.errNoSuchNameRoot()) ||
        vError.equals(err, Namespace.errNoSuchName()) ||
        vError.equals(err, Namespace.errNotAMountTable())) {
      return makeAllTerminal(curr);
    }
    throw err;
  };

  deferred.resolve(this._resolveLoop(names, names, 0, handleErrors));

  return deferred.promise;
};

module.exports = Namespace;

},{"../lib/deferred":39,"../lib/verror":40,"./util.js":44,"es6-promise":23}],44:[function(require,module,exports){
/**
 * @fileoverview Helpers for manipulating veyron names.
 */

var _numInitialSlashes = function(s) {
  for (var i = 0; i < s.length; i++) {
    if (s.charAt(i) !== '/') {
      return i;
    }
  }
  return s.length;
};
var _numTailSlashes = function(s) {
  for (var i = s.length - 1; i >= 0; i--) {
    if (s.charAt(i) !== '/') {
      return s.length - 1 - i;
    }
  }
  return s.length;
};


var _removeInitialSlashes = function(s) {
  return s.replace(/^\/*/g, '');
};
var _removeTailSlashes = function(s) {
  return s.replace(/\/*$/g, '');
};

var _joinNamePartsOnArray = function(parts) {
  if (parts.length === 0) {
    return '';
  }

  var name = parts[0];
  for (var i = 1; i < parts.length; i++) {
    var addedPart = parts[i];

    var numNameSlashes = _numTailSlashes(name);
    var numAddedPartSlashes = _numInitialSlashes(addedPart);

    if (numNameSlashes === 0 && numAddedPartSlashes === 0) {
      name += '/' + addedPart;
      continue;
    }

    if (numAddedPartSlashes > numNameSlashes) {
      name = _removeTailSlashes(name);
      name += addedPart;
    } else {
      name += _removeInitialSlashes(addedPart);
    }
  }

  return name;
};

/**
 * Joins parts of a name into a whole.
 * It preserves the rootedness and terminality of the name components.
 * Examples:
 * join(['a, b']) -> 'a/b'
 * join('/a/b/', '//d') -> '/a/b//d'
 * join('//a/b', 'c/') -> '//a/b/c/'
 * @param {array | varargs} Either a single array that contains the strings
 * to join or a variable number of string arguments that will be joined.
 * @return {string} A joined string
 */
var join = function(parts) {
  if (Array.isArray(parts)) {
    return _joinNamePartsOnArray(parts);
  }
  return _joinNamePartsOnArray(Array.prototype.slice.call(arguments));
};

/**
  * Determines if a name is rooted, that is beginning with a single '/'.
  * @param {string} The veyron name.
  * @return {boolean} True if the name is rooted, false otherwise.
  */
var isRooted = function(name) {
  return _numInitialSlashes(name) === 1;
};

/**
  * Determines if a name is terminal, meaning that it corresponds to a final
  * endpoint and name and does not need to be resolved further.
  * @param {string} The veyron name.
  * @return {boolean} True if the name is a terminal name, false otherwise.
  */
var isTerminal = function(name) {
  var numInitialSlashes = _numInitialSlashes(name);
  if (numInitialSlashes >= 2) {
    // If the name begins with '//', it is terminal.
    return true;
  } else if (numInitialSlashes === 1) {
    // If the name begins with a single slash, it is terminal if there are no
    // more slashes (indexOf === -1) or if the next slash is a double slash.
    var nextSlashIndex = name.substr(1).indexOf('/');
    var nextDoubleSlashIndex = name.substr(1).indexOf('//');
    return nextSlashIndex === nextDoubleSlashIndex;
  } else {
    // If there are no initial slashes, it is only terminal if it is the empty
    // string.
    return name.length === 0;
  }
};

/**
  * Converts a veyron name to a terminal name. This is used to generate a final
  * name when a name has finished resolving.
  * @param {string} The initial veyron name.
  * @return {string} A terminal veyron name.
  */
var convertToTerminalName = function(name) {
  // '' -> '' and '/' -> ''
  if (name === '' || name === '/') {
    return '';
  }

  if (isRooted(name)) {
    if (name.substr(1).indexOf('/') === -1) {
      // '/endpoint' -> '/endpoint'
      return name;
    }
    if (name.substr(1).indexOf('/') === name.length - 2) {
      // '/endpoint/' -> '/endpoint'
      return name.substring(0, name.length - 1);
    }
    // '/endpoint/something' -> '/endpoint//something'
    // '/endpoint//something -> '/endpoint//something'
    return name.replace(/^(\/[^/]+?)[/]*\//, '$1//');
  } else {
    // '/////something' -> '//something'
    return '//' + _removeInitialSlashes(name);
  }
};

module.exports = {
  join: join,
  isTerminal: isTerminal,
  isRooted: isRooted,
  convertToTerminalName: convertToTerminalName
};

},{}],45:[function(require,module,exports){
/**
 * @fileoverview conversion between JavaScript and veyron2/verror Error object
 */

var vError = require('./../lib/verror');

var ec = {};

/*
 * Implements the same structure as Standard struct in veyron2/verror
 * @private
 * @param {string} Id id of the error, which in JavaScript, corresponds to the
 * name property of an Error object.
 */
var _standard = function(id, message) {
  this.iD = id;
  this.msg = message;
};

/*
 * Converts from a JavaScript error object to verror standard struct which
 * wspr expects as error format.
 * @private
 * @param {Error} err JavaScript error object
 * @return {_standard} verror standard struct
 */
ec.toStandardErrorStruct = function(err) {
  var errId = ''; // empty ID indicate an unknown error
  var errMessage = '';
  if (err instanceof Error) {
    errMessage = err.message;
    if (err.name !== 'Error') { // default name is considered unknown
      errId = err.name;
    }
  } else if (err !== undefined && err !== null) {
    errMessage = err + '';
  }

  return new _standard(errId, errMessage);
};

var errIdConstrMap = {};
errIdConstrMap[vError.Ids.Aborted] = vError.AbortedError;
errIdConstrMap[vError.Ids.BadArg] = vError.BadArgError;
errIdConstrMap[vError.Ids.BadProtocol] = vError.BadProtocolError;
errIdConstrMap[vError.Ids.Exists] = vError.ExistsError;
errIdConstrMap[vError.Ids.Internal] = vError.InternalError;
errIdConstrMap[vError.Ids.NotAuthorized] = vError.NotAuthorizedError;
errIdConstrMap[vError.Ids.NotFound] = vError.NotFoundError;

/*
 * Converts from a verror standard struct which comes from wspr to JavaScript
 * Error object ensuring message and name are set properly
 * @private
 * @param {_standard} verr verror standard struct
 * @return {Error} JavaScript error object
 */
ec.toJSerror = function(verr) {
  var err;

  var ErrIdConstr = errIdConstrMap[verr.iD];
  if(ErrIdConstr) {
    err = new ErrIdConstr(verr.msg);
  } else {
    err = new vError.VeyronError(verr.msg, verr.iD);
  }

  err.stack = ''; // stack does not make sense from a remote execution
  return err;
};

module.exports = ec;

},{"./../lib/verror":40}],46:[function(require,module,exports){
/**
 * @fileoverview Enum for incoming payload types
 */

var IncomingPayloadType = {
  FINAL_RESPONSE: 0, // Final response to a call originating from JS
  STREAM_RESPONSE: 1, // Stream response to a call originating from JS
  ERROR_RESPONSE: 2, // Error response to a call originating from JS
  INVOKE_REQUEST: 3, // Request to invoke a method in JS originating from server
  STREAM_CLOSE: 4  // Response saying that the stream is closed.
};

module.exports = IncomingPayloadType;

},{}],47:[function(require,module,exports){
/**
 * @fileoverview Enum for outgoing message types
 */

var MessageType = {
  REQUEST: 0, // Request to invoke a method on a Veyron name
  SERVE: 1, // Request to serve a server in JavaScript under a Veyron name
  RESPONSE: 2, // Indicates a response from a registered service in JavaScript
  STREAM_VALUE: 3, // Indicates a stream value
  STREAM_CLOSE: 4, // Request to close a stream
  SIGNATURE: 5, // Request to get signature of a remote server
  STOP: 6, // Request to stop a server
  BLESS: 8, // Blesses an identity
  UNLINK_ID: 9, // Unlinks an identity
  NEW_ID: 10
};

module.exports = MessageType;

},{}],48:[function(require,module,exports){
/**
 * @fileoverview An object that handles marshaling and unmarshal
 * messages from the native veyron implementation.
 */

var MessageType = require('./message_type');
var IncomingPayloadType = require('./incoming_payload_type');
var Deferred = require('./../lib/deferred');
var Promise = require('es6-promise').Promise;
var vLog = require('./../lib/vlog');
var SimpleHandler = require('./simple_handler');

// Cache the service signatures for one hour.
var BIND_CACHE_TTL = 3600 * 1000;

/**
 * A client for the native veyron implementation.
 * @constructor
 * @param {Promise} sender A promise that is resolved when we are able to send
 * a message to the native veron implementation. It should be resolved with an
 * object that has a send function that will send messages to the native
 * implementation.
 */
function Proxy(sender) {
  // We use odd numbers for the message ids, so that the server can use even
  // numbers.
  this.id = 1;
  this.outstandingRequests = {};
  this.bindCache = {};
  this._hasResolvedConfig = false;
  this._configDeferred = new Deferred();
  this.config = this._configDeferred.promise;
  this.senderPromise = sender;
  this.incomingRequestHandlers = {};
}

/**
 * Handles a message from native veyron implementation.
 * @param {Object} messsage The message from the native veyron code.
 */
Proxy.prototype.process = function(message) {
  if (this._hasResolvedConfig === false) { // first message is the config.
    this._hasResolvedConfig = true;
    this._configDeferred.resolve(message);
    return;
  }

  // Messages originating from server are even numbers
  var isServerOriginatedMessage = (message.id % 2) === 0;

  var handler = this.outstandingRequests[message.id];

  var payload;
  try {
    payload = JSON.parse(message.data);
  } catch (e) {
    if (!isServerOriginatedMessage) {
      handler.handleResponse(IncomingPayloadType.ERROR_RESPONSE, message.data);
    }
    return;
  }

  // If we don't know about this flow, just drop the message. Unless it
  // originated from the sever.
  if (!isServerOriginatedMessage && !handler) {
    vLog.warn('Dropping message for unknown flow ' + message.id + ' ' +
        message.data);
    return;
  }

  if (!handler) {
    handler = this.incomingRequestHandlers[payload.type];
    if (!handler) {
      vLog.warn('Dropping message for unknown invoke payload ' + payload.type);
      return;
    }
    handler.handleRequest(message.id, payload.message);
  } else {
    handler.handleResponse(payload.type, payload.message);
  }
};

Proxy.prototype.dequeue = function(def, id) {
  delete this.outstandingRequests[id];
};

Proxy.prototype.nextId = function() {
  var id = this.id;
  this.id += 2;
  return id;
};

/**
 * Gets the signature including methods names, number of arguments for a given
 * service name.
 * @param {string} name the veyron name of the service to get signature for.
 * @return {Promise} Signature of the service in JSON format
 */
Proxy.prototype.getServiceSignature = function(name) {
  var cachedEntry = this.bindCache[name];
  var now = new Date();
  if (cachedEntry && now - cachedEntry.fetched < BIND_CACHE_TTL) {
    return Promise.resolve(cachedEntry.signature);
  }

  var def = new Deferred();

  var self = this;
  def.promise.then(function(signature) {
    self.bindCache[name] = {
      signature: signature,
      fetched: now
    };
  });
  var messageJSON = { name: name };
  var message = JSON.stringify(messageJSON);

  var id = this.nextId();
  // Send the get signature request to the proxy
  var handler = new SimpleHandler(def, this, id);
  this.sendRequest(message, MessageType.SIGNATURE, handler, id);

  return def.promise;
};


Proxy.prototype.addIncomingHandler = function(type, handler) {
  this.incomingRequestHandlers[type] = handler;
};

Proxy.prototype.addIncomingStreamHandler = function(id, handler) {
  this.outstandingRequests[id] = handler;
};

/**
 * Establishes the connection if needed, frames the message with the next id,
 * adds the given deferred to outstanding requests queue and sends the request
 * to the server
 * @param {Object} message Message to send
 * @param {MessageType} type Type of message to send
 * @param {Object} handler An object with a handleResponse method that takes
 * a response type and a message.  If null, then responses for this flow
 * are ignored.
 * @param {Number} id Use this flow id instead of generating
 * a new one.
 */
Proxy.prototype.sendRequest = function(message, type, handler, id) {
  if (handler) {
    this.outstandingRequests[id] = handler;
  }
  var body = JSON.stringify({ id: id, data: message, type: type });

  var self = this;
  this.senderPromise.then(function(sender) {
    sender.send(body);
  }).catch(function(e) {
    var h = self.outstandingRequests[id];
    if (h) {
      h.handleResponse(IncomingPayloadType.ERROR_RESPONSE, e);
      delete self.outstandingRequests[id];
    }
  });
};

/**
 * Export the module
 */
module.exports = Proxy;

},{"./../lib/deferred":39,"./../lib/vlog":41,"./incoming_payload_type":46,"./message_type":47,"./simple_handler":49,"es6-promise":23}],49:[function(require,module,exports){
/**
 * @fileoverview A simple handler that resolves or rejects a promise
 * on a response from the proxy.
 */
var IncomingPayloadType = require('./incoming_payload_type');
var ErrorConversion = require('./error_conversion');
var vError = require('./../lib/verror');

/**
 * An object that rejects/resolves a promise based on a response
 * from the proxy.
 * @constructor
 * @param def the promise to resolve/reject
 * @param proxy the proxy from which to dequeue the handler
 * @param id the flow id of the message
 */
var Handler = function(def, proxy, id) {
  this._proxy = proxy;
  this._def = def;
  this._id = id;
};

Handler.prototype.handleResponse = function(type, message) {
  switch (type) {
    case IncomingPayloadType.FINAL_RESPONSE:
      this._def.resolve(message);
      break;
    case IncomingPayloadType.ERROR_RESPONSE:
      var err = ErrorConversion.toJSerror(message);
      this._def.reject(err);
      break;
    default:
      this._def.reject(
          new vError.InternalError('unknown response type ' + type));
  }
  this._proxy.dequeue(this._id);
};

module.exports = Handler;

},{"./../lib/verror":40,"./error_conversion":45,"./incoming_payload_type":46}],50:[function(require,module,exports){
/**
 * @fileoverview Streaming RPC implementation on top of websockets.
 */

var MessageType = require('./message_type');
var Duplex = require('stream').Duplex;
var inherits = require('util').inherits;

/*
 * A stream that allows sending and recieving data for a streaming rpc.  If
 * onmessage is set and a function, it will be called whenever there is data on.
 * the stream. The stream implements the promise api.  When the rpc is complete,
 * the stream will be fulfilled.  If there is an error, then the stream will be
 * rejected.
 * @constructor
 *
 * @param {number} flowId flow id
 * @param {Promise} webSocketPromise Promise of a websocket connection when
 * it's established
 * @param {boolean} isClient if set, then this is the client stream.
 */
var Stream = function(flowId, webSocketPromise, isClient) {
  Duplex.call(this, { objectMode: true });
  this.flowId = flowId;
  this.isClient = isClient;
  this.webSocketPromise = webSocketPromise;
  this.onmessage = null;

  // The buffer of messages that will be passed to push
  // when the internal buffer has room.
  this.wsBuffer = [];

  // If set, objects are directly written to the internal buffer
  // rather than wsBuffer.
  this.shouldQueue = false;
};

inherits(Stream, Duplex);

/**
 * Closes the stream, telling the other side that there is no more data.
 */
Stream.prototype.clientClose = function() {
  var object = {
    id: this.flowId,
    type: MessageType.STREAM_CLOSE
  };
  Duplex.prototype.write.call(this, object);
};

Stream.prototype.serverClose = function(value, err) {
  var object = {
    id: this.flowId,
    type: MessageType.RESPONSE,
    data: JSON.stringify({
      results: [value || null],
      err: err || null
    })
  };
  Duplex.prototype.write.call(this, object);
};

/**
 * Implements the _read method needed by those subclassing Duplex.
 * The parameter passed in is ignored, since it doesn't really make
 * sense in object mode.
 */
Stream.prototype._read = function() {
  // On a call to read, copy any objects in the websocket buffer into
  // the internal stream buffer.  If we exhaust the websocket buffer
  // and still have more room in the internal buffer, we set shouldQueue
  // so we directly write to the internal buffer.
  var i = 0;
  while (i < this.wsBuffer.length && this.push(this.wsBuffer[i])) {
    ++i;
  }
  if (i > 0) {
    this.wsBuffer = this.wsBuffer.splice(i);
  }

  this.shouldQueue = this.wsBuffer.length === 0;
};

/**
 * Queue the object passed in for reading
 */
Stream.prototype._queueRead = function(object) {
  if (this.shouldQueue) {
    // If we have run into the limit of the internal buffer,
    // update this.shouldQueue.
    this.shouldQueue = this.push(object);
  } else {
    this.wsBuffer.push(object);
  }
};

/**
 * Writes an object to the stream.
 * @param {*} chunk The data to write to the stream.
 * @param {null} encoding ignored for object streams.
 * @param {function} callback if set, the function to call when the write
 * completes.
 * @return {boolean} Returns false if the write buffer is full.
 */
Stream.prototype.write = function(chunk, encoding, callback) {
  var object = {
    id: this.flowId,
    data: JSON.stringify(chunk),
    type: MessageType.STREAM_VALUE
  };
  return Duplex.prototype.write.call(this, object, encoding, callback);
};

Stream.prototype._write = function(chunk, encoding, callback) {
  this.webSocketPromise.then(function(websocket) {
    websocket.send(JSON.stringify(chunk));
    callback();
  });
};

/**
 * Writes an optional object to the stream and ends the stream.
 * @param {*} chunk The data to write to the stream.
 * @param {null} encoding ignored for object streams.
 * @param {function} callback if set, the function to call when the write
 * completes.
 */
Stream.prototype.end = function(chunk, encoding, callback) {
  if (this.isClient) {
    if (chunk !== undefined) {
      this.write(chunk, encoding);
    }
    this.clientClose();
  } else {
    // We probably shouldn't allow direct calls to end, since we need
    // a return value here, but if they are piping streams, the developer
    // probably doesn't care about the return value.
    this.serverClose();
  }

  Duplex.prototype.end.call(this, null, null, callback);
};

module.exports = Stream;

},{"./message_type":47,"stream":20,"util":22}],51:[function(require,module,exports){
/**
 * @fileoverview WebSocket client implementation
 */

var WebSocket = require('./../lib/websocket');
var Deferred = require('./../lib/deferred');
var vLog = require('./../lib/vlog');
var Proxy = require('./proxy');

/**
 * A client for the veyron service using websockets. Connects to the veyron wspr
 * and performs RPCs.
 * @constructor
 * @param {string} url of wspr that connects to the veyron network
 * identity
 */
function ProxyConnection(url) {
  this.url = url.replace(/^(http|https)/, 'ws') + '/ws';
  this.currentWebSocketPromise = null;
  // Since we haven't finished constructing the Proxy object,
  // we can't call this.getWebsocket() to return the sender promise.
  // Instead, we create a new promise that will eventually call
  // getWebsocket and only resolve the promise after Proxy.call
  // has completed.
  var def = new Deferred();
  Proxy.call(this, def.promise);
  def.resolve(this.getWebSocket());
}

ProxyConnection.prototype = Object.create(Proxy.prototype);

ProxyConnection.prototype.constructor = ProxyConnection;

/**
 * Connects to the server and returns an open web socket connection
 * @return {promise} a promise that will be fulfilled with a websocket object
 * when the connection is established.
 */
ProxyConnection.prototype.getWebSocket = function() {
  // We are either connecting or already connected, return the same promise
  if (this.currentWebSocketPromise) {
    return this.currentWebSocketPromise;
  }

  // TODO(bjornick): Implement a timeout mechanism.
  var websocket = new WebSocket(this.url);
  var self = this;
  var deferred = new Deferred();
  this.currentWebSocketPromise = deferred.promise;
  websocket.onopen = function() {
    vLog.info('Connected to proxy at', self.url);
    deferred.resolve(websocket);
  };
  var configDeferred = this._configDeferred;
  websocket.onerror = function(e) {
    vLog.error('Failed to connect to proxy at url:', self.url);
    deferred.reject(e);
    configDeferred.reject(
      'Proxy connection closed, failed to get config ' + e);
  };

  websocket.onmessage = function(frame) {
    var message;
    try {
      message = JSON.parse(frame.data);
    } catch (e) {
      vLog.warn('Failed to parse ' + frame.data);
      return;
    }

    self.process(message);
  };

  return deferred.promise;
};

/**
 * Export the module
 */
module.exports = ProxyConnection;

},{"./../lib/deferred":39,"./../lib/vlog":41,"./../lib/websocket":42,"./proxy":48}],52:[function(require,module,exports){
/**
 * @fileoverview Veyron Runtime
 */

var Promise = require('es6-promise').Promise;

var Server = require('../ipc/server');
var ServerRouter = require('../ipc/server_router');
var Client = require('../ipc/client');
var ProxyConnection = require('../proxy/websocket');
var MessageType = require('../proxy/message_type');
var Namespace = require('../namespace/namespace');
var PrivateId = require('../security/private');
var PublicId = require('../security/public');
var Deferred = require('../lib/deferred');
var SimpleHandler = require('../proxy/simple_handler');

module.exports = Runtime;

function Runtime(options) {
  if (!(this instanceof Runtime)) {
    return new Runtime(options);
  }

  this.identityName = options.identityName;
  this._wspr = options.wspr;
  this.identity = new PrivateId(this._getProxyConnection());
}

/**
 * Performs client side binding of a remote service to a native javascript
 * stub object.
 *
 * Usage:
 * var service = runtime.bindTo('EndpointAddress', 'ServiceName')
 * var resultPromise = service.MethodName(arg);
 *
 * @param {string} name the veyron name of the service to bind to.
 * @param {object} optServiceSignature if set, javascript signature of methods
 * available in the remote service.
 * @param {function} [callback] if given, this function will be called on
 * completion of the bind.  The first argument will be an error if there is
 * one, and the second argument is an object with methods that perform rpcs to
 * service
 * methods.
 * @return {Promise} An object with methods that perform rpcs to service methods
 *
 */
Runtime.prototype.bindTo = function(name, optServiceSignature, callback) {
  var client = this._getClient();
  return client.bindTo(name, optServiceSignature, callback);
};

/**
 * A Veyron server allows registration of services that can be
 * invoked remotely via RPCs.
 *
 * Usage:
 * var videoService = {
 *   play: function(videoName) {
 *     // Play video
 *   }
 * };
 *
 * var service = runtime.serve('mymedia/video', videoService)
 *
 * @param {string} name Name to serve under
 * @param {Object} serviceObject service object to serve
 * @param {*} serviceMetadata if provided a set of metadata for functions
 * in the service (such as number of return values).  It could either be
 * passed in as a properties object or a string that is the name of a
 * service that was defined in the idl files that the server knows about.
 * @param {function} callback if provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when serve completes or fails
 * the endpoint address of the server will be returned as the value of promise
 */
Runtime.prototype.serve = function(name, serviceObject, serviceMetadata,
    callback) {
  var server = this._getServer();
  return server.serve(name, serviceObject, serviceMetadata, callback);
};

/**
 * addIDL adds an IDL file to the set of definitions known by the server.
 * Services defined in IDL files passed into this method can be used to
 * describe the interface exported by a serviceObject passed into register.
 * @param {object} updates the output of the vdl tool on an idl.
 */
Runtime.prototype.addIDL = function(updates) {
  var server = this._getServer();
  return server.addIDL(updates);
};

/**
 * Get or creates a new proxy connection
 * @return {ProxyConnection} A proxy connection
 */
Runtime.prototype._getProxyConnection = function() {
  if (!this._proxyConnection) {
    this._proxyConnection = new ProxyConnection(this._wspr);
  }
  return this._proxyConnection;
};

/**
 * Get or creates a router
 * @return {ServerRouter} A router
 */
Runtime.prototype._getRouter = function() {
  if (!this._router) {
    this._router = new ServerRouter(
        this._getProxyConnection());
  }
  return this._router;
};


/**
 * Get or creates a client
 * @return {Client} A client
 */
Runtime.prototype._getClient = function() {
  this._client = this._client || new Client(this._getProxyConnection());
  return this._client;
};

/**
 * Get or creates a server
 * @return {Server} A server
 */
Runtime.prototype._getServer = function() {
  this._server = this._server || new Server(this._getRouter());
  return this._server;
};

/**
 * Create a new Namespace
 * @return {Promise} A promise that resolves to a Namespace instance.
 */
Runtime.prototype.newNamespace = function(roots) {
  var rt = this;
  var proxy = this._getProxyConnection();

  if (roots) {
    return Promise.resolve(new Namespace(this._getClient(), roots));
  }

  // We have to ask for the websocket now, otherwise the config
  // wont arrive until the first time someone tries to make a call
  // which is deadlock prone.
  proxy.getWebSocket();
  return proxy.config.then(function(config) {
    return new Namespace(rt._getClient(), config.mounttableRoot);
  });
};

/**
 * TODO(bjornick): This should probably produce a PrivateId and not a PublicId,
 * but we don't have PrivateId store yet. This is mostly used for tests anyway.
 * Create a new Identity
 * @param {String} name the name for the identity.
 * @param {function} cb if provided a callback that will be called with the
 * new publicId.
 * @return {Promise} A promise that resolves to the new PublicId
 */
Runtime.prototype.newIdentity = function(name, cb) {
  var def = new Deferred(cb);

  var proxy = this._getProxyConnection();
  var id = proxy.nextId();
  var handler = new SimpleHandler(def, proxy, id);
  proxy.sendRequest(JSON.stringify(name), MessageType.NEW_ID, handler, id);
  return def.promise.then(function(message) {
    return new PublicId(message.names, message.handle, proxy);
  });
};

},{"../ipc/client":36,"../ipc/server":37,"../ipc/server_router":38,"../lib/deferred":39,"../namespace/namespace":43,"../proxy/message_type":47,"../proxy/simple_handler":49,"../proxy/websocket":51,"../security/private":53,"../security/public":54,"es6-promise":23}],53:[function(require,module,exports){
/**
 * @fileoverview PrivateId stub for veyron identities
 */

var Deferred = require('../lib/deferred');
var SimpleHandler = require('../proxy/simple_handler');
var PublicId = require('./public');
var MessageType = require('../proxy/message_type');

/**
 * The private portion of a veyron identity
 */
function PrivateId(proxy) {
  this._proxy = proxy;
}

/*
 * Blesses the given PublicId with the given caveats.
 * @param {PublicId} blessee the PublicId to bless.
 * @param {String} name the name the bless the id under.
 * @param {Number} duration the duration of the blessing in milliseconds.
 * @param {Array} caveats an array of ServiceCavaeats.
 * @papram {function} cb an optional callback that will return the blessing
 * @return {Promise} a promise that will be resolved with the blessing
 */

PrivateId.prototype.bless = function(blessee, name, duration, caveats, cb) {
  var def = new Deferred(cb);
  if (!(blessee instanceof PublicId)) {
    def.reject(new Error('blessee should be of type PublicId'));
    return def.promise;
  }

  var message = JSON.stringify({
    handle: blessee._id,
    name: name,
    durationMs: duration,
    caveats: caveats
  });
  var id = this._proxy.nextId();
  var handler = new SimpleHandler(def, this._proxy, id);
  this._proxy.sendRequest(message, MessageType.BLESS, handler, id);
  var self = this._proxy;
  return def.promise.then(function(message) {
    var id = new PublicId(message.names, message.handle, self._proxy);
    return id;
  });
};

module.exports = PrivateId;

},{"../lib/deferred":39,"../proxy/message_type":47,"../proxy/simple_handler":49,"./public":54}],54:[function(require,module,exports){
/**
 * @fileoverview PublicId stub of veyron identities
 */

var MessageType = require('../proxy/message_type');

/**
 * The public portion of a veyron identity.
 */
function PublicId(names, id, proxy) {
  this.names = names;
  this._id = id;
  this._count = 1;
  this._proxy = proxy;
}

// A name matches if it is a prefix of the pattern or if the pattern ends
// in a '/*' and the pattern is a prefix of the name.
function nameMatches(name, pattern) {
  var paths = name.split('/');
  var expectedPaths = pattern.split('/');
  for (var i = 0; i < expectedPaths.length; i++) {
    // If there is a star at the end of the pattern then
    // we have a match, since the prefix of the pattern
    // was matched by the name.
    if (expectedPaths[i] === '*') {
      return i === expectedPaths.length - 1;
    }

    // name is a prefix of pattern
    if (i === paths.length) {
      return true;
    }

    if (paths[i] !== expectedPaths[i]) {
      return false;
    }
  }

  return paths.length === expectedPaths.length;
}


/**
 * Returns whether the PublicId matches a principal pattern. There
 * are basically two types of patterns.  A fixed name pattern
 * looks like 'a/b' and matches names 'a/b' and 'a', but not
 * 'a/b/c', 'aa', or 'a/bb'. 'a' is considered a match because
 * the owner of 'a' can trivially create the name 'a/b'.  A star
 * pattern looks like 'a/b/*' and it matches anything that 'a/b' matches
 * as well as any name blessed by 'a/b', i.e 'a/b/c', 'a/b/c/d'.
 * @param {string} pattern The pattern to match against.
 * @return {boolean} Returns true iff the PublicId has a name that matches
 * the pattern passed in.
 */
PublicId.prototype.match = function(pattern) {
  if (pattern === '' || !pattern) {
    return false;
  }
  for (var i = 0; i < this.names.length; i++) {
    if (nameMatches(this.names[i], pattern)) {
      return true;
    }
  }
  return false;
};

/**
 * Increments the reference count on the PublicId.  When the reference count
 * goes to zero, the PublicId will be removed from the cache in the go code.
 */
PublicId.prototype.retain = function() {
  this._count++;
};

/**
 * Decrements the reference count on the PublicId.  When the reference count
 * goes to zero, the PublicId will be removed from the cache in the go code.
 */
PublicId.prototype.release = function() {
  this._count--;
  if (this._count === 0) {
    var message = JSON.stringify(this._id);
    this._proxy.sendRequest(message, MessageType.UNLINK_ID, null,
        this._proxy.nextId());
  }
};

PublicId.prototype.toJSON = function() {
  return {
    id: this._id,
    names: this.names
  };
};

module.exports = PublicId;

},{"../proxy/message_type":47}],55:[function(require,module,exports){
(function (process){
/**
 *  @fileoverview Public API and entry point to the Veyron API
 */

var Runtime = require('./runtime/runtime');
var Deferred = require('./lib/deferred');
var vlog = require('./lib/vlog');

/**
 * Exports
 */
module.exports = {
  init: init,
  logLevels: require('./lib/vlog').levels,
  namespaceUtil: require('./namespace/util'),
  errors: require('./lib/verror')
};

/**
 * Create a Veyron Runtime
 * @param {Object} config Configuration Options
 */
function init(config, callback) {
  if (typeof config === 'function') {
    callback = config;
    config = {};
  }

  vlog.level = config.logLevel || vlog.level;

  var def = new Deferred(callback);

  getIdentity(function(err, name) {
    if (err) {
      def.reject(err);
    }

    var rtOpts = {
      wspr: config.wspr || process.env['WSPR'] || 'http://localhost:8124',
      identityName: name
    };

    def.resolve(new Runtime(rtOpts));
  });

  return def.promise;
}

function getIdentity(callback) {
  var isBrowser = (typeof window === 'object');

  if (!isBrowser) {
    return process.nextTick(callback.bind(null, null));
  }

  var Postie = require('postie');
  var contentScript = new Postie(window);

  // Runs when the auth request succeeds.
  function handleAuthSuccess(data) {
    removeListeners();
    callback(null, data.name);
  }

  // Runs when the auth request fails.
  function handleAuthError(err) {
    removeListeners();
    callback(err);
  }

  // Runs when the extension receives the auth request
  function handleAuthReceived(){
    // Stop asking for auth.
    window.clearInterval(authRequestInterval);
  }

  function removeListeners(){
    window.clearInterval(authRequestInterval);
    contentScript.removeListener('auth:success', handleAuthSuccess);
    contentScript.removeListener('auth:Error', handleAuthError);
  }

  contentScript.on('auth:success', handleAuthSuccess);
  contentScript.on('auth:error', handleAuthError);
  contentScript.on('auth:received', handleAuthReceived);

  // Repeatedly ask the extension to auth.  The first time this runs, the
  // extension might not be running yet, so we need to ask in a setInterval.
  // TODO(nlacasse): timeout with an error after X seconds
  var authRequestInterval = window.setInterval(function(){
    contentScript.post('auth');
  }, 200);
}

}).call(this,require("FWaASH"))
},{"./lib/deferred":39,"./lib/verror":40,"./lib/vlog":41,"./namespace/util":44,"./runtime/runtime":52,"FWaASH":6,"postie":33}]},{},[55])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL3Vzci9sb2NhbC9nb29nbGUvaG9tZS9ubGFjYXNzZS9jb2RlL3YvdmV5cm9uLmpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9idWZmZXIvaW5kZXguanMiLCIvdXNyL2xvY2FsL2dvb2dsZS9ob21lL25sYWNhc3NlL2NvZGUvdi92ZXlyb24uanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvYmFzZTY0LWpzL2xpYi9iNjQuanMiLCIvdXNyL2xvY2FsL2dvb2dsZS9ob21lL25sYWNhc3NlL2NvZGUvdi92ZXlyb24uanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL3Vzci9sb2NhbC9nb29nbGUvaG9tZS9ubGFjYXNzZS9jb2RlL3YvdmV5cm9uLmpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vZHVwbGV4LmpzIiwiL3Vzci9sb2NhbC9nb29nbGUvaG9tZS9ubGFjYXNzZS9jb2RlL3YvdmV5cm9uLmpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vbGliL19zdHJlYW1fZHVwbGV4LmpzIiwiL3Vzci9sb2NhbC9nb29nbGUvaG9tZS9ubGFjYXNzZS9jb2RlL3YvdmV5cm9uLmpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vbGliL19zdHJlYW1fcGFzc3Rocm91Z2guanMiLCIvdXNyL2xvY2FsL2dvb2dsZS9ob21lL25sYWNhc3NlL2NvZGUvdi92ZXlyb24uanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9saWIvX3N0cmVhbV9yZWFkYWJsZS5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcmVhZGFibGUtc3RyZWFtL2xpYi9fc3RyZWFtX3RyYW5zZm9ybS5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcmVhZGFibGUtc3RyZWFtL2xpYi9fc3RyZWFtX3dyaXRhYmxlLmpzIiwiL3Vzci9sb2NhbC9nb29nbGUvaG9tZS9ubGFjYXNzZS9jb2RlL3YvdmV5cm9uLmpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vbm9kZV9tb2R1bGVzL2NvcmUtdXRpbC1pcy9saWIvdXRpbC5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcmVhZGFibGUtc3RyZWFtL25vZGVfbW9kdWxlcy9pc2FycmF5L2luZGV4LmpzIiwiL3Vzci9sb2NhbC9nb29nbGUvaG9tZS9ubGFjYXNzZS9jb2RlL3YvdmV5cm9uLmpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vbm9kZV9tb2R1bGVzL3N0cmluZ19kZWNvZGVyL2luZGV4LmpzIiwiL3Vzci9sb2NhbC9nb29nbGUvaG9tZS9ubGFjYXNzZS9jb2RlL3YvdmV5cm9uLmpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9yZWFkYWJsZS1zdHJlYW0vcGFzc3Rocm91Z2guanMiLCIvdXNyL2xvY2FsL2dvb2dsZS9ob21lL25sYWNhc3NlL2NvZGUvdi92ZXlyb24uanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3JlYWRhYmxlLXN0cmVhbS9yZWFkYWJsZS5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcmVhZGFibGUtc3RyZWFtL3RyYW5zZm9ybS5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcmVhZGFibGUtc3RyZWFtL3dyaXRhYmxlLmpzIiwiL3Vzci9sb2NhbC9nb29nbGUvaG9tZS9ubGFjYXNzZS9jb2RlL3YvdmV5cm9uLmpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9zdHJlYW0tYnJvd3NlcmlmeS9pbmRleC5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC91dGlsLmpzIiwiL3Vzci9sb2NhbC9nb29nbGUvaG9tZS9ubGFjYXNzZS9jb2RlL3YvdmV5cm9uLmpzL25vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2NvbW1vbmpzL21haW4uanMiLCIvdXNyL2xvY2FsL2dvb2dsZS9ob21lL25sYWNhc3NlL2NvZGUvdi92ZXlyb24uanMvbm9kZV9tb2R1bGVzL2VzNi1wcm9taXNlL2Rpc3QvY29tbW9uanMvcHJvbWlzZS9hbGwuanMiLCIvdXNyL2xvY2FsL2dvb2dsZS9ob21lL25sYWNhc3NlL2NvZGUvdi92ZXlyb24uanMvbm9kZV9tb2R1bGVzL2VzNi1wcm9taXNlL2Rpc3QvY29tbW9uanMvcHJvbWlzZS9hc2FwLmpzIiwiL3Vzci9sb2NhbC9nb29nbGUvaG9tZS9ubGFjYXNzZS9jb2RlL3YvdmV5cm9uLmpzL25vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2NvbW1vbmpzL3Byb21pc2UvY29uZmlnLmpzIiwiL3Vzci9sb2NhbC9nb29nbGUvaG9tZS9ubGFjYXNzZS9jb2RlL3YvdmV5cm9uLmpzL25vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2NvbW1vbmpzL3Byb21pc2UvcG9seWZpbGwuanMiLCIvdXNyL2xvY2FsL2dvb2dsZS9ob21lL25sYWNhc3NlL2NvZGUvdi92ZXlyb24uanMvbm9kZV9tb2R1bGVzL2VzNi1wcm9taXNlL2Rpc3QvY29tbW9uanMvcHJvbWlzZS9wcm9taXNlLmpzIiwiL3Vzci9sb2NhbC9nb29nbGUvaG9tZS9ubGFjYXNzZS9jb2RlL3YvdmV5cm9uLmpzL25vZGVfbW9kdWxlcy9lczYtcHJvbWlzZS9kaXN0L2NvbW1vbmpzL3Byb21pc2UvcmFjZS5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9ub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9jb21tb25qcy9wcm9taXNlL3JlamVjdC5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9ub2RlX21vZHVsZXMvZXM2LXByb21pc2UvZGlzdC9jb21tb25qcy9wcm9taXNlL3Jlc29sdmUuanMiLCIvdXNyL2xvY2FsL2dvb2dsZS9ob21lL25sYWNhc3NlL2NvZGUvdi92ZXlyb24uanMvbm9kZV9tb2R1bGVzL2VzNi1wcm9taXNlL2Rpc3QvY29tbW9uanMvcHJvbWlzZS91dGlscy5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9ub2RlX21vZHVsZXMvcG9zdGllL2luZGV4LmpzIiwiL3Vzci9sb2NhbC9nb29nbGUvaG9tZS9ubGFjYXNzZS9jb2RlL3YvdmV5cm9uLmpzL25vZGVfbW9kdWxlcy93cy9saWIvYnJvd3Nlci5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9zcmMvaWRsL2lkbC5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9zcmMvaXBjL2NsaWVudC5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9zcmMvaXBjL3NlcnZlci5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9zcmMvaXBjL3NlcnZlcl9yb3V0ZXIuanMiLCIvdXNyL2xvY2FsL2dvb2dsZS9ob21lL25sYWNhc3NlL2NvZGUvdi92ZXlyb24uanMvc3JjL2xpYi9kZWZlcnJlZC5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9zcmMvbGliL3ZlcnJvci5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9zcmMvbGliL3Zsb2cuanMiLCIvdXNyL2xvY2FsL2dvb2dsZS9ob21lL25sYWNhc3NlL2NvZGUvdi92ZXlyb24uanMvc3JjL2xpYi93ZWJzb2NrZXQuanMiLCIvdXNyL2xvY2FsL2dvb2dsZS9ob21lL25sYWNhc3NlL2NvZGUvdi92ZXlyb24uanMvc3JjL25hbWVzcGFjZS9uYW1lc3BhY2UuanMiLCIvdXNyL2xvY2FsL2dvb2dsZS9ob21lL25sYWNhc3NlL2NvZGUvdi92ZXlyb24uanMvc3JjL25hbWVzcGFjZS91dGlsLmpzIiwiL3Vzci9sb2NhbC9nb29nbGUvaG9tZS9ubGFjYXNzZS9jb2RlL3YvdmV5cm9uLmpzL3NyYy9wcm94eS9lcnJvcl9jb252ZXJzaW9uLmpzIiwiL3Vzci9sb2NhbC9nb29nbGUvaG9tZS9ubGFjYXNzZS9jb2RlL3YvdmV5cm9uLmpzL3NyYy9wcm94eS9pbmNvbWluZ19wYXlsb2FkX3R5cGUuanMiLCIvdXNyL2xvY2FsL2dvb2dsZS9ob21lL25sYWNhc3NlL2NvZGUvdi92ZXlyb24uanMvc3JjL3Byb3h5L21lc3NhZ2VfdHlwZS5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9zcmMvcHJveHkvcHJveHkuanMiLCIvdXNyL2xvY2FsL2dvb2dsZS9ob21lL25sYWNhc3NlL2NvZGUvdi92ZXlyb24uanMvc3JjL3Byb3h5L3NpbXBsZV9oYW5kbGVyLmpzIiwiL3Vzci9sb2NhbC9nb29nbGUvaG9tZS9ubGFjYXNzZS9jb2RlL3YvdmV5cm9uLmpzL3NyYy9wcm94eS9zdHJlYW0uanMiLCIvdXNyL2xvY2FsL2dvb2dsZS9ob21lL25sYWNhc3NlL2NvZGUvdi92ZXlyb24uanMvc3JjL3Byb3h5L3dlYnNvY2tldC5qcyIsIi91c3IvbG9jYWwvZ29vZ2xlL2hvbWUvbmxhY2Fzc2UvY29kZS92L3ZleXJvbi5qcy9zcmMvcnVudGltZS9ydW50aW1lLmpzIiwiL3Vzci9sb2NhbC9nb29nbGUvaG9tZS9ubGFjYXNzZS9jb2RlL3YvdmV5cm9uLmpzL3NyYy9zZWN1cml0eS9wcml2YXRlLmpzIiwiL3Vzci9sb2NhbC9nb29nbGUvaG9tZS9ubGFjYXNzZS9jb2RlL3YvdmV5cm9uLmpzL3NyYy9zZWN1cml0eS9wdWJsaWMuanMiLCIvdXNyL2xvY2FsL2dvb2dsZS9ob21lL25sYWNhc3NlL2NvZGUvdi92ZXlyb24uanMvc3JjL3ZleXJvbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4OUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BZQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdOQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7O0FDREE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWtCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTJcblxuLyoqXG4gKiBJZiBgVFlQRURfQVJSQVlfU1VQUE9SVGA6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBVc2UgT2JqZWN0IGltcGxlbWVudGF0aW9uIChtb3N0IGNvbXBhdGlibGUsIGV2ZW4gSUU2KVxuICpcbiAqIEJyb3dzZXJzIHRoYXQgc3VwcG9ydCB0eXBlZCBhcnJheXMgYXJlIElFIDEwKywgRmlyZWZveCA0KywgQ2hyb21lIDcrLCBTYWZhcmkgNS4xKyxcbiAqIE9wZXJhIDExLjYrLCBpT1MgNC4yKy5cbiAqXG4gKiBOb3RlOlxuICpcbiAqIC0gSW1wbGVtZW50YXRpb24gbXVzdCBzdXBwb3J0IGFkZGluZyBuZXcgcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzLlxuICogICBGaXJlZm94IDQtMjkgbGFja2VkIHN1cHBvcnQsIGZpeGVkIGluIEZpcmVmb3ggMzArLlxuICogICBTZWU6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTY5NTQzOC5cbiAqXG4gKiAgLSBDaHJvbWUgOS0xMCBpcyBtaXNzaW5nIHRoZSBgVHlwZWRBcnJheS5wcm90b3R5cGUuc3ViYXJyYXlgIGZ1bmN0aW9uLlxuICpcbiAqICAtIElFMTAgaGFzIGEgYnJva2VuIGBUeXBlZEFycmF5LnByb3RvdHlwZS5zdWJhcnJheWAgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyBhcnJheXMgb2ZcbiAqICAgIGluY29ycmVjdCBsZW5ndGggaW4gc29tZSBzaXR1YXRpb25zLlxuICpcbiAqIFdlIGRldGVjdCB0aGVzZSBidWdneSBicm93c2VycyBhbmQgc2V0IGBUWVBFRF9BUlJBWV9TVVBQT1JUYCB0byBgZmFsc2VgIHNvIHRoZXkgd2lsbFxuICogZ2V0IHRoZSBPYmplY3QgaW1wbGVtZW50YXRpb24sIHdoaWNoIGlzIHNsb3dlciBidXQgd2lsbCB3b3JrIGNvcnJlY3RseS5cbiAqL1xudmFyIFRZUEVEX0FSUkFZX1NVUFBPUlQgPSAoZnVuY3Rpb24gKCkge1xuICB0cnkge1xuICAgIHZhciBidWYgPSBuZXcgQXJyYXlCdWZmZXIoMClcbiAgICB2YXIgYXJyID0gbmV3IFVpbnQ4QXJyYXkoYnVmKVxuICAgIGFyci5mb28gPSBmdW5jdGlvbiAoKSB7IHJldHVybiA0MiB9XG4gICAgcmV0dXJuIDQyID09PSBhcnIuZm9vKCkgJiYgLy8gdHlwZWQgYXJyYXkgaW5zdGFuY2VzIGNhbiBiZSBhdWdtZW50ZWRcbiAgICAgICAgdHlwZW9mIGFyci5zdWJhcnJheSA9PT0gJ2Z1bmN0aW9uJyAmJiAvLyBjaHJvbWUgOS0xMCBsYWNrIGBzdWJhcnJheWBcbiAgICAgICAgbmV3IFVpbnQ4QXJyYXkoMSkuc3ViYXJyYXkoMSwgMSkuYnl0ZUxlbmd0aCA9PT0gMCAvLyBpZTEwIGhhcyBicm9rZW4gYHN1YmFycmF5YFxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn0pKClcblxuLyoqXG4gKiBDbGFzczogQnVmZmVyXG4gKiA9PT09PT09PT09PT09XG4gKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBhcmUgYXVnbWVudGVkXG4gKiB3aXRoIGZ1bmN0aW9uIHByb3BlcnRpZXMgZm9yIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBBUEkgZnVuY3Rpb25zLiBXZSB1c2VcbiAqIGBVaW50OEFycmF5YCBzbyB0aGF0IHNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0IHJldHVybnNcbiAqIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIEJ5IGF1Z21lbnRpbmcgdGhlIGluc3RhbmNlcywgd2UgY2FuIGF2b2lkIG1vZGlmeWluZyB0aGUgYFVpbnQ4QXJyYXlgXG4gKiBwcm90b3R5cGUuXG4gKi9cbmZ1bmN0aW9uIEJ1ZmZlciAoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSlcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKVxuXG4gIHZhciB0eXBlID0gdHlwZW9mIHN1YmplY3RcblxuICAvLyBGaW5kIHRoZSBsZW5ndGhcbiAgdmFyIGxlbmd0aFxuICBpZiAodHlwZSA9PT0gJ251bWJlcicpXG4gICAgbGVuZ3RoID0gc3ViamVjdCA+IDAgPyBzdWJqZWN0ID4+PiAwIDogMFxuICBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIGlmIChlbmNvZGluZyA9PT0gJ2Jhc2U2NCcpXG4gICAgICBzdWJqZWN0ID0gYmFzZTY0Y2xlYW4oc3ViamVjdClcbiAgICBsZW5ndGggPSBCdWZmZXIuYnl0ZUxlbmd0aChzdWJqZWN0LCBlbmNvZGluZylcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnb2JqZWN0JyAmJiBzdWJqZWN0ICE9PSBudWxsKSB7IC8vIGFzc3VtZSBvYmplY3QgaXMgYXJyYXktbGlrZVxuICAgIGlmIChzdWJqZWN0LnR5cGUgPT09ICdCdWZmZXInICYmIGlzQXJyYXkoc3ViamVjdC5kYXRhKSlcbiAgICAgIHN1YmplY3QgPSBzdWJqZWN0LmRhdGFcbiAgICBsZW5ndGggPSArc3ViamVjdC5sZW5ndGggPiAwID8gTWF0aC5mbG9vcigrc3ViamVjdC5sZW5ndGgpIDogMFxuICB9IGVsc2VcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50IG5lZWRzIHRvIGJlIGEgbnVtYmVyLCBhcnJheSBvciBzdHJpbmcuJylcblxuICB2YXIgYnVmXG4gIGlmIChUWVBFRF9BUlJBWV9TVVBQT1JUKSB7XG4gICAgLy8gUHJlZmVycmVkOiBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIGJ1ZiA9IEJ1ZmZlci5fYXVnbWVudChuZXcgVWludDhBcnJheShsZW5ndGgpKVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gVEhJUyBpbnN0YW5jZSBvZiBCdWZmZXIgKGNyZWF0ZWQgYnkgYG5ld2ApXG4gICAgYnVmID0gdGhpc1xuICAgIGJ1Zi5sZW5ndGggPSBsZW5ndGhcbiAgICBidWYuX2lzQnVmZmVyID0gdHJ1ZVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKFRZUEVEX0FSUkFZX1NVUFBPUlQgJiYgdHlwZW9mIHN1YmplY3QuYnl0ZUxlbmd0aCA9PT0gJ251bWJlcicpIHtcbiAgICAvLyBTcGVlZCBvcHRpbWl6YXRpb24gLS0gdXNlIHNldCBpZiB3ZSdyZSBjb3B5aW5nIGZyb20gYSB0eXBlZCBhcnJheVxuICAgIGJ1Zi5fc2V0KHN1YmplY3QpXG4gIH0gZWxzZSBpZiAoaXNBcnJheWlzaChzdWJqZWN0KSkge1xuICAgIC8vIFRyZWF0IGFycmF5LWlzaCBvYmplY3RzIGFzIGEgYnl0ZSBhcnJheVxuICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoc3ViamVjdCkpIHtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKylcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdC5yZWFkVUludDgoaSlcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKVxuICAgICAgICBidWZbaV0gPSAoKHN1YmplY3RbaV0gJSAyNTYpICsgMjU2KSAlIDI1NlxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIGJ1Zi53cml0ZShzdWJqZWN0LCAwLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJyAmJiAhVFlQRURfQVJSQVlfU1VQUE9SVCAmJiAhbm9aZXJvKSB7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBidWZbaV0gPSAwXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG4vLyBTVEFUSUMgTUVUSE9EU1xuLy8gPT09PT09PT09PT09PT1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIChiKSB7XG4gIHJldHVybiAhIShiICE9IG51bGwgJiYgYi5faXNCdWZmZXIpXG59XG5cbkJ1ZmZlci5ieXRlTGVuZ3RoID0gZnVuY3Rpb24gKHN0ciwgZW5jb2RpbmcpIHtcbiAgdmFyIHJldFxuICBzdHIgPSBzdHIudG9TdHJpbmcoKVxuICBzd2l0Y2ggKGVuY29kaW5nIHx8ICd1dGY4Jykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoIC8gMlxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgICByZXQgPSB1dGY4VG9CeXRlcyhzdHIpLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdyYXcnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0ID0gYmFzZTY0VG9CeXRlcyhzdHIpLmxlbmd0aFxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aCAqIDJcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIuY29uY2F0ID0gZnVuY3Rpb24gKGxpc3QsIHRvdGFsTGVuZ3RoKSB7XG4gIGFzc2VydChpc0FycmF5KGxpc3QpLCAnVXNhZ2U6IEJ1ZmZlci5jb25jYXQobGlzdFssIGxlbmd0aF0pJylcblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcigwKVxuICB9IGVsc2UgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGxpc3RbMF1cbiAgfVxuXG4gIHZhciBpXG4gIGlmICh0b3RhbExlbmd0aCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdG90YWxMZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRvdGFsTGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZiA9IG5ldyBCdWZmZXIodG90YWxMZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldXG4gICAgaXRlbS5jb3B5KGJ1ZiwgcG9zKVxuICAgIHBvcyArPSBpdGVtLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZcbn1cblxuQnVmZmVyLmNvbXBhcmUgPSBmdW5jdGlvbiAoYSwgYikge1xuICBhc3NlcnQoQnVmZmVyLmlzQnVmZmVyKGEpICYmIEJ1ZmZlci5pc0J1ZmZlcihiKSwgJ0FyZ3VtZW50cyBtdXN0IGJlIEJ1ZmZlcnMnKVxuICB2YXIgeCA9IGEubGVuZ3RoXG4gIHZhciB5ID0gYi5sZW5ndGhcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IE1hdGgubWluKHgsIHkpOyBpIDwgbGVuICYmIGFbaV0gPT09IGJbaV07IGkrKykge31cbiAgaWYgKGkgIT09IGxlbikge1xuICAgIHggPSBhW2ldXG4gICAgeSA9IGJbaV1cbiAgfVxuICBpZiAoeCA8IHkpIHtcbiAgICByZXR1cm4gLTFcbiAgfVxuICBpZiAoeSA8IHgpIHtcbiAgICByZXR1cm4gMVxuICB9XG4gIHJldHVybiAwXG59XG5cbi8vIEJVRkZFUiBJTlNUQU5DRSBNRVRIT0RTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBoZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIC8vIG11c3QgYmUgYW4gZXZlbiBudW1iZXIgb2YgZGlnaXRzXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGFzc2VydChzdHJMZW4gJSAyID09PSAwLCAnSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGJ5dGUgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgYXNzZXJ0KCFpc05hTihieXRlKSwgJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gYnl0ZVxuICB9XG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIHV0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBibGl0QnVmZmVyKHV0ZjhUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIGJpbmFyeVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgcmV0dXJuIGFzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBiYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBibGl0QnVmZmVyKGJhc2U2NFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiB1dGYxNmxlV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gU3VwcG9ydCBib3RoIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZylcbiAgLy8gYW5kIHRoZSBsZWdhY3kgKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIGlmICghaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgfSBlbHNlIHsgIC8vIGxlZ2FjeVxuICAgIHZhciBzd2FwID0gZW5jb2RpbmdcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIG9mZnNldCA9IGxlbmd0aFxuICAgIGxlbmd0aCA9IHN3YXBcbiAgfVxuXG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cbiAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpXG5cbiAgdmFyIHJldFxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IGhleFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IHV0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBhc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXQgPSBiaW5hcnlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgICAgcmV0ID0gYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IHV0ZjE2bGVXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpXG4gIHN0YXJ0ID0gTnVtYmVyKHN0YXJ0KSB8fCAwXG4gIGVuZCA9IChlbmQgPT09IHVuZGVmaW5lZCkgPyBzZWxmLmxlbmd0aCA6IE51bWJlcihlbmQpXG5cbiAgLy8gRmFzdHBhdGggZW1wdHkgc3RyaW5nc1xuICBpZiAoZW5kID09PSBzdGFydClcbiAgICByZXR1cm4gJydcblxuICB2YXIgcmV0XG4gIHN3aXRjaCAoZW5jb2RpbmcpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgICAgcmV0ID0gaGV4U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gdXRmOFNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIHJldCA9IGFzY2lpU2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICAgIHJldCA9IGJpbmFyeVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBiYXNlNjRTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gdXRmMTZsZVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2RpbmcnKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogJ0J1ZmZlcicsXG4gICAgZGF0YTogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5fYXJyIHx8IHRoaXMsIDApXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5lcXVhbHMgPSBmdW5jdGlvbiAoYikge1xuICBhc3NlcnQoQnVmZmVyLmlzQnVmZmVyKGIpLCAnQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKSA9PT0gMFxufVxuXG5CdWZmZXIucHJvdG90eXBlLmNvbXBhcmUgPSBmdW5jdGlvbiAoYikge1xuICBhc3NlcnQoQnVmZmVyLmlzQnVmZmVyKGIpLCAnQXJndW1lbnQgbXVzdCBiZSBhIEJ1ZmZlcicpXG4gIHJldHVybiBCdWZmZXIuY29tcGFyZSh0aGlzLCBiKVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAodGFyZ2V0LCB0YXJnZXRfc3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHNvdXJjZSA9IHRoaXNcblxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAoIXRhcmdldF9zdGFydCkgdGFyZ2V0X3N0YXJ0ID0gMFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHNvdXJjZS5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgYXNzZXJ0KGVuZCA+PSBzdGFydCwgJ3NvdXJjZUVuZCA8IHNvdXJjZVN0YXJ0JylcbiAgYXNzZXJ0KHRhcmdldF9zdGFydCA+PSAwICYmIHRhcmdldF9zdGFydCA8IHRhcmdldC5sZW5ndGgsXG4gICAgICAndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGFzc2VydChzdGFydCA+PSAwICYmIHN0YXJ0IDwgc291cmNlLmxlbmd0aCwgJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoZW5kID49IDAgJiYgZW5kIDw9IHNvdXJjZS5sZW5ndGgsICdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKVxuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0IDwgZW5kIC0gc3RhcnQpXG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldF9zdGFydCArIHN0YXJ0XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG5cbiAgaWYgKGxlbiA8IDEwMCB8fCAhVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0X3N0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0YXJnZXQuX3NldCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksIHRhcmdldF9zdGFydClcbiAgfVxufVxuXG5mdW5jdGlvbiBiYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXRmOFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHJlcyA9ICcnXG4gIHZhciB0bXAgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBpZiAoYnVmW2ldIDw9IDB4N0YpIHtcbiAgICAgIHJlcyArPSBkZWNvZGVVdGY4Q2hhcih0bXApICsgU3RyaW5nLmZyb21DaGFyQ29kZShidWZbaV0pXG4gICAgICB0bXAgPSAnJ1xuICAgIH0gZWxzZSB7XG4gICAgICB0bXAgKz0gJyUnICsgYnVmW2ldLnRvU3RyaW5nKDE2KVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXMgKyBkZWNvZGVVdGY4Q2hhcih0bXApXG59XG5cbmZ1bmN0aW9uIGFzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuZnVuY3Rpb24gYmluYXJ5U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICByZXR1cm4gYXNjaWlTbGljZShidWYsIHN0YXJ0LCBlbmQpXG59XG5cbmZ1bmN0aW9uIGhleFNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcblxuICBpZiAoIXN0YXJ0IHx8IHN0YXJ0IDwgMCkgc3RhcnQgPSAwXG4gIGlmICghZW5kIHx8IGVuZCA8IDAgfHwgZW5kID4gbGVuKSBlbmQgPSBsZW5cblxuICB2YXIgb3V0ID0gJydcbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICBvdXQgKz0gdG9IZXgoYnVmW2ldKVxuICB9XG4gIHJldHVybiBvdXRcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpICsgMV0gKiAyNTYpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gfn5zdGFydFxuICBlbmQgPSBlbmQgPT09IHVuZGVmaW5lZCA/IGxlbiA6IH5+ZW5kXG5cbiAgaWYgKHN0YXJ0IDwgMCkge1xuICAgIHN0YXJ0ICs9IGxlbjtcbiAgICBpZiAoc3RhcnQgPCAwKVxuICAgICAgc3RhcnQgPSAwXG4gIH0gZWxzZSBpZiAoc3RhcnQgPiBsZW4pIHtcbiAgICBzdGFydCA9IGxlblxuICB9XG5cbiAgaWYgKGVuZCA8IDApIHtcbiAgICBlbmQgKz0gbGVuXG4gICAgaWYgKGVuZCA8IDApXG4gICAgICBlbmQgPSAwXG4gIH0gZWxzZSBpZiAoZW5kID4gbGVuKSB7XG4gICAgZW5kID0gbGVuXG4gIH1cblxuICBpZiAoZW5kIDwgc3RhcnQpXG4gICAgZW5kID0gc3RhcnRcblxuICBpZiAoVFlQRURfQVJSQVlfU1VQUE9SVCkge1xuICAgIHJldHVybiBCdWZmZXIuX2F1Z21lbnQodGhpcy5zdWJhcnJheShzdGFydCwgZW5kKSlcbiAgfSBlbHNlIHtcbiAgICB2YXIgc2xpY2VMZW4gPSBlbmQgLSBzdGFydFxuICAgIHZhciBuZXdCdWYgPSBuZXcgQnVmZmVyKHNsaWNlTGVuLCB1bmRlZmluZWQsIHRydWUpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzbGljZUxlbjsgaSsrKSB7XG4gICAgICBuZXdCdWZbaV0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gICAgcmV0dXJuIG5ld0J1ZlxuICB9XG59XG5cbi8vIGBnZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5nZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLnJlYWRVSW50OChvZmZzZXQpXG59XG5cbi8vIGBzZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uICh2LCBvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5zZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLndyaXRlVUludDgodiwgb2Zmc2V0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpXG4gICAgcmV0dXJuXG5cbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5mdW5jdGlvbiByZWFkVUludDE2IChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbFxuICBpZiAobGl0dGxlRW5kaWFuKSB7XG4gICAgdmFsID0gYnVmW29mZnNldF1cbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMV0gPDwgOFxuICB9IGVsc2Uge1xuICAgIHZhbCA9IGJ1ZltvZmZzZXRdIDw8IDhcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMV1cbiAgfVxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQxNkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHJlYWRVSW50MTYodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gcmVhZFVJbnQxNih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gcmVhZFVJbnQzMiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWxcbiAgaWYgKGxpdHRsZUVuZGlhbikge1xuICAgIGlmIChvZmZzZXQgKyAyIDwgbGVuKVxuICAgICAgdmFsID0gYnVmW29mZnNldCArIDJdIDw8IDE2XG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDFdIDw8IDhcbiAgICB2YWwgfD0gYnVmW29mZnNldF1cbiAgICBpZiAob2Zmc2V0ICsgMyA8IGxlbilcbiAgICAgIHZhbCA9IHZhbCArIChidWZbb2Zmc2V0ICsgM10gPDwgMjQgPj4+IDApXG4gIH0gZWxzZSB7XG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgPSBidWZbb2Zmc2V0ICsgMV0gPDwgMTZcbiAgICBpZiAob2Zmc2V0ICsgMiA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMl0gPDwgOFxuICAgIGlmIChvZmZzZXQgKyAzIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAzXVxuICAgIHZhbCA9IHZhbCArIChidWZbb2Zmc2V0XSA8PCAyNCA+Pj4gMClcbiAgfVxuICByZXR1cm4gdmFsXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZFVJbnQzMkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHJlYWRVSW50MzIodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gcmVhZFVJbnQzMih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLFxuICAgICAgICAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpXG4gICAgcmV0dXJuXG5cbiAgdmFyIG5lZyA9IHRoaXNbb2Zmc2V0XSAmIDB4ODBcbiAgaWYgKG5lZylcbiAgICByZXR1cm4gKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xXG4gIGVsc2VcbiAgICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbmZ1bmN0aW9uIHJlYWRJbnQxNiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWwgPSByZWFkVUludDE2KGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIHRydWUpXG4gIHZhciBuZWcgPSB2YWwgJiAweDgwMDBcbiAgaWYgKG5lZylcbiAgICByZXR1cm4gKDB4ZmZmZiAtIHZhbCArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiByZWFkSW50MTYodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiByZWFkSW50MTYodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHJlYWRJbnQzMiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWwgPSByZWFkVUludDMyKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIHRydWUpXG4gIHZhciBuZWcgPSB2YWwgJiAweDgwMDAwMDAwXG4gIGlmIChuZWcpXG4gICAgcmV0dXJuICgweGZmZmZmZmZmIC0gdmFsICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHJlYWRJbnQzMih0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHJlYWRJbnQzMih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gcmVhZEZsb2F0IChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHJldHVybiBpZWVlNzU0LnJlYWQoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gcmVhZEZsb2F0KHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gcmVhZEZsb2F0KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiByZWFkRG91YmxlIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgKyA3IDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHJldHVybiBpZWVlNzU0LnJlYWQoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHJlYWREb3VibGUodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRG91YmxlQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IHRoaXMubGVuZ3RoLCAndHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnVpbnQodmFsdWUsIDB4ZmYpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKSByZXR1cm5cblxuICB0aGlzW29mZnNldF0gPSB2YWx1ZVxuICByZXR1cm4gb2Zmc2V0ICsgMVxufVxuXG5mdW5jdGlvbiB3cml0ZVVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ3RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZ1aW50KHZhbHVlLCAweGZmZmYpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGxlbiAtIG9mZnNldCwgMik7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPVxuICAgICAgICAodmFsdWUgJiAoMHhmZiA8PCAoOCAqIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpKSkpID4+PlxuICAgICAgICAgICAgKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkgKiA4XG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDJcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlVUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAndHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnVpbnQodmFsdWUsIDB4ZmZmZmZmZmYpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGxlbiAtIG9mZnNldCwgNCk7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPVxuICAgICAgICAodmFsdWUgPj4+IChsaXR0bGVFbmRpYW4gPyBpIDogMyAtIGkpICogOCkgJiAweGZmXG4gIH1cbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQzMkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZVVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQ4ID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IHRoaXMubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2YsIC0weDgwKVxuICB9XG5cbiAgaWYgKG9mZnNldCA+PSB0aGlzLmxlbmd0aClcbiAgICByZXR1cm5cblxuICBpZiAodmFsdWUgPj0gMClcbiAgICB0aGlzLndyaXRlVUludDgodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpXG4gIGVsc2VcbiAgICB0aGlzLndyaXRlVUludDgoMHhmZiArIHZhbHVlICsgMSwgb2Zmc2V0LCBub0Fzc2VydClcbiAgcmV0dXJuIG9mZnNldCArIDFcbn1cblxuZnVuY3Rpb24gd3JpdGVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmZmYsIC0weDgwMDApXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZiAodmFsdWUgPj0gMClcbiAgICB3cml0ZVVJbnQxNihidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG4gIGVsc2VcbiAgICB3cml0ZVVJbnQxNihidWYsIDB4ZmZmZiArIHZhbHVlICsgMSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxuICByZXR1cm4gb2Zmc2V0ICsgMlxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiB3cml0ZUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWYgKHZhbHVlID49IDApXG4gICAgd3JpdGVVSW50MzIoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgd3JpdGVVSW50MzIoYnVmLCAweGZmZmZmZmZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG4gIHJldHVybiBvZmZzZXQgKyA0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gd3JpdGVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIHdyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmSUVFRTc1NCh2YWx1ZSwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbiAgcmV0dXJuIG9mZnNldCArIDRcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiB3cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgNyA8IGJ1Zi5sZW5ndGgsXG4gICAgICAgICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmSUVFRTc1NCh2YWx1ZSwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxuICByZXR1cm4gb2Zmc2V0ICsgOFxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIHdyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gZmlsbCh2YWx1ZSwgc3RhcnQ9MCwgZW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiAodmFsdWUsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCF2YWx1ZSkgdmFsdWUgPSAwXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCkgZW5kID0gdGhpcy5sZW5ndGhcblxuICBhc3NlcnQoZW5kID49IHN0YXJ0LCAnZW5kIDwgc3RhcnQnKVxuXG4gIC8vIEZpbGwgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgYXNzZXJ0KHN0YXJ0ID49IDAgJiYgc3RhcnQgPCB0aGlzLmxlbmd0aCwgJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoZW5kID49IDAgJiYgZW5kIDw9IHRoaXMubGVuZ3RoLCAnZW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XG4gICAgZm9yIChpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgICAgdGhpc1tpXSA9IHZhbHVlXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBieXRlcyA9IHV0ZjhUb0J5dGVzKHZhbHVlLnRvU3RyaW5nKCkpXG4gICAgdmFyIGxlbiA9IGJ5dGVzLmxlbmd0aFxuICAgIGZvciAoaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICAgIHRoaXNbaV0gPSBieXRlc1tpICUgbGVuXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUuaW5zcGVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIG91dCA9IFtdXG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgb3V0W2ldID0gdG9IZXgodGhpc1tpXSlcbiAgICBpZiAoaSA9PT0gZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUykge1xuICAgICAgb3V0W2kgKyAxXSA9ICcuLi4nXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuICByZXR1cm4gJzxCdWZmZXIgJyArIG91dC5qb2luKCcgJykgKyAnPidcbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgbmV3IGBBcnJheUJ1ZmZlcmAgd2l0aCB0aGUgKmNvcGllZCogbWVtb3J5IG9mIHRoZSBidWZmZXIgaW5zdGFuY2UuXG4gKiBBZGRlZCBpbiBOb2RlIDAuMTIuIE9ubHkgYXZhaWxhYmxlIGluIGJyb3dzZXJzIHRoYXQgc3VwcG9ydCBBcnJheUJ1ZmZlci5cbiAqL1xuQnVmZmVyLnByb3RvdHlwZS50b0FycmF5QnVmZmVyID0gZnVuY3Rpb24gKCkge1xuICBpZiAodHlwZW9mIFVpbnQ4QXJyYXkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKFRZUEVEX0FSUkFZX1NVUFBPUlQpIHtcbiAgICAgIHJldHVybiAobmV3IEJ1ZmZlcih0aGlzKSkuYnVmZmVyXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBidWYgPSBuZXcgVWludDhBcnJheSh0aGlzLmxlbmd0aClcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBidWYubGVuZ3RoOyBpIDwgbGVuOyBpICs9IDEpIHtcbiAgICAgICAgYnVmW2ldID0gdGhpc1tpXVxuICAgICAgfVxuICAgICAgcmV0dXJuIGJ1Zi5idWZmZXJcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCdWZmZXIudG9BcnJheUJ1ZmZlciBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlcicpXG4gIH1cbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG52YXIgQlAgPSBCdWZmZXIucHJvdG90eXBlXG5cbi8qKlxuICogQXVnbWVudCBhIFVpbnQ4QXJyYXkgKmluc3RhbmNlKiAobm90IHRoZSBVaW50OEFycmF5IGNsYXNzISkgd2l0aCBCdWZmZXIgbWV0aG9kc1xuICovXG5CdWZmZXIuX2F1Z21lbnQgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIGFyci5faXNCdWZmZXIgPSB0cnVlXG5cbiAgLy8gc2F2ZSByZWZlcmVuY2UgdG8gb3JpZ2luYWwgVWludDhBcnJheSBnZXQvc2V0IG1ldGhvZHMgYmVmb3JlIG92ZXJ3cml0aW5nXG4gIGFyci5fZ2V0ID0gYXJyLmdldFxuICBhcnIuX3NldCA9IGFyci5zZXRcblxuICAvLyBkZXByZWNhdGVkLCB3aWxsIGJlIHJlbW92ZWQgaW4gbm9kZSAwLjEzK1xuICBhcnIuZ2V0ID0gQlAuZ2V0XG4gIGFyci5zZXQgPSBCUC5zZXRcblxuICBhcnIud3JpdGUgPSBCUC53cml0ZVxuICBhcnIudG9TdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9Mb2NhbGVTdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9KU09OID0gQlAudG9KU09OXG4gIGFyci5lcXVhbHMgPSBCUC5lcXVhbHNcbiAgYXJyLmNvbXBhcmUgPSBCUC5jb21wYXJlXG4gIGFyci5jb3B5ID0gQlAuY29weVxuICBhcnIuc2xpY2UgPSBCUC5zbGljZVxuICBhcnIucmVhZFVJbnQ4ID0gQlAucmVhZFVJbnQ4XG4gIGFyci5yZWFkVUludDE2TEUgPSBCUC5yZWFkVUludDE2TEVcbiAgYXJyLnJlYWRVSW50MTZCRSA9IEJQLnJlYWRVSW50MTZCRVxuICBhcnIucmVhZFVJbnQzMkxFID0gQlAucmVhZFVJbnQzMkxFXG4gIGFyci5yZWFkVUludDMyQkUgPSBCUC5yZWFkVUludDMyQkVcbiAgYXJyLnJlYWRJbnQ4ID0gQlAucmVhZEludDhcbiAgYXJyLnJlYWRJbnQxNkxFID0gQlAucmVhZEludDE2TEVcbiAgYXJyLnJlYWRJbnQxNkJFID0gQlAucmVhZEludDE2QkVcbiAgYXJyLnJlYWRJbnQzMkxFID0gQlAucmVhZEludDMyTEVcbiAgYXJyLnJlYWRJbnQzMkJFID0gQlAucmVhZEludDMyQkVcbiAgYXJyLnJlYWRGbG9hdExFID0gQlAucmVhZEZsb2F0TEVcbiAgYXJyLnJlYWRGbG9hdEJFID0gQlAucmVhZEZsb2F0QkVcbiAgYXJyLnJlYWREb3VibGVMRSA9IEJQLnJlYWREb3VibGVMRVxuICBhcnIucmVhZERvdWJsZUJFID0gQlAucmVhZERvdWJsZUJFXG4gIGFyci53cml0ZVVJbnQ4ID0gQlAud3JpdGVVSW50OFxuICBhcnIud3JpdGVVSW50MTZMRSA9IEJQLndyaXRlVUludDE2TEVcbiAgYXJyLndyaXRlVUludDE2QkUgPSBCUC53cml0ZVVJbnQxNkJFXG4gIGFyci53cml0ZVVJbnQzMkxFID0gQlAud3JpdGVVSW50MzJMRVxuICBhcnIud3JpdGVVSW50MzJCRSA9IEJQLndyaXRlVUludDMyQkVcbiAgYXJyLndyaXRlSW50OCA9IEJQLndyaXRlSW50OFxuICBhcnIud3JpdGVJbnQxNkxFID0gQlAud3JpdGVJbnQxNkxFXG4gIGFyci53cml0ZUludDE2QkUgPSBCUC53cml0ZUludDE2QkVcbiAgYXJyLndyaXRlSW50MzJMRSA9IEJQLndyaXRlSW50MzJMRVxuICBhcnIud3JpdGVJbnQzMkJFID0gQlAud3JpdGVJbnQzMkJFXG4gIGFyci53cml0ZUZsb2F0TEUgPSBCUC53cml0ZUZsb2F0TEVcbiAgYXJyLndyaXRlRmxvYXRCRSA9IEJQLndyaXRlRmxvYXRCRVxuICBhcnIud3JpdGVEb3VibGVMRSA9IEJQLndyaXRlRG91YmxlTEVcbiAgYXJyLndyaXRlRG91YmxlQkUgPSBCUC53cml0ZURvdWJsZUJFXG4gIGFyci5maWxsID0gQlAuZmlsbFxuICBhcnIuaW5zcGVjdCA9IEJQLmluc3BlY3RcbiAgYXJyLnRvQXJyYXlCdWZmZXIgPSBCUC50b0FycmF5QnVmZmVyXG5cbiAgcmV0dXJuIGFyclxufVxuXG52YXIgSU5WQUxJRF9CQVNFNjRfUkUgPSAvW14rXFwvMC05QS16XS9nXG5cbmZ1bmN0aW9uIGJhc2U2NGNsZWFuIChzdHIpIHtcbiAgLy8gTm9kZSBzdHJpcHMgb3V0IGludmFsaWQgY2hhcmFjdGVycyBsaWtlIFxcbiBhbmQgXFx0IGZyb20gdGhlIHN0cmluZywgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHN0ciA9IHN0cmluZ3RyaW0oc3RyKS5yZXBsYWNlKElOVkFMSURfQkFTRTY0X1JFLCAnJylcbiAgLy8gTm9kZSBhbGxvd3MgZm9yIG5vbi1wYWRkZWQgYmFzZTY0IHN0cmluZ3MgKG1pc3NpbmcgdHJhaWxpbmcgPT09KSwgYmFzZTY0LWpzIGRvZXMgbm90XG4gIHdoaWxlIChzdHIubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgIHN0ciA9IHN0ciArICc9J1xuICB9XG4gIHJldHVybiBzdHJcbn1cblxuZnVuY3Rpb24gc3RyaW5ndHJpbSAoc3RyKSB7XG4gIGlmIChzdHIudHJpbSkgcmV0dXJuIHN0ci50cmltKClcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLCAnJylcbn1cblxuZnVuY3Rpb24gaXNBcnJheSAoc3ViamVjdCkge1xuICByZXR1cm4gKEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHN1YmplY3QpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHN1YmplY3QpID09PSAnW29iamVjdCBBcnJheV0nXG4gIH0pKHN1YmplY3QpXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXlpc2ggKHN1YmplY3QpIHtcbiAgcmV0dXJuIGlzQXJyYXkoc3ViamVjdCkgfHwgQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpIHx8XG4gICAgICBzdWJqZWN0ICYmIHR5cGVvZiBzdWJqZWN0ID09PSAnb2JqZWN0JyAmJlxuICAgICAgdHlwZW9mIHN1YmplY3QubGVuZ3RoID09PSAnbnVtYmVyJ1xufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGIgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGlmIChiIDw9IDB4N0YpIHtcbiAgICAgIGJ5dGVBcnJheS5wdXNoKGIpXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBzdGFydCA9IGlcbiAgICAgIGlmIChiID49IDB4RDgwMCAmJiBiIDw9IDB4REZGRikgaSsrXG4gICAgICB2YXIgaCA9IGVuY29kZVVSSUNvbXBvbmVudChzdHIuc2xpY2Uoc3RhcnQsIGkrMSkpLnN1YnN0cigxKS5zcGxpdCgnJScpXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGgubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgYnl0ZUFycmF5LnB1c2gocGFyc2VJbnQoaFtqXSwgMTYpKVxuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGFzY2lpVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIC8vIE5vZGUncyBjb2RlIHNlZW1zIHRvIGJlIGRvaW5nIHRoaXMgYW5kIG5vdCAmIDB4N0YuLlxuICAgIGJ5dGVBcnJheS5wdXNoKHN0ci5jaGFyQ29kZUF0KGkpICYgMHhGRilcbiAgfVxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIHV0ZjE2bGVUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGMsIGhpLCBsb1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBjID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBoaSA9IGMgPj4gOFxuICAgIGxvID0gYyAlIDI1NlxuICAgIGJ5dGVBcnJheS5wdXNoKGxvKVxuICAgIGJ5dGVBcnJheS5wdXNoKGhpKVxuICB9XG5cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBiYXNlNjRUb0J5dGVzIChzdHIpIHtcbiAgcmV0dXJuIGJhc2U2NC50b0J5dGVBcnJheShzdHIpXG59XG5cbmZ1bmN0aW9uIGJsaXRCdWZmZXIgKHNyYywgZHN0LCBvZmZzZXQsIGxlbmd0aCkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKVxuICAgICAgYnJlYWtcbiAgICBkc3RbaSArIG9mZnNldF0gPSBzcmNbaV1cbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiBkZWNvZGVVdGY4Q2hhciAoc3RyKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChzdHIpXG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4RkZGRCkgLy8gVVRGIDggaW52YWxpZCBjaGFyXG4gIH1cbn1cblxuLypcbiAqIFdlIGhhdmUgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIHZhbHVlIGlzIGEgdmFsaWQgaW50ZWdlci4gVGhpcyBtZWFucyB0aGF0IGl0XG4gKiBpcyBub24tbmVnYXRpdmUuIEl0IGhhcyBubyBmcmFjdGlvbmFsIGNvbXBvbmVudCBhbmQgdGhhdCBpdCBkb2VzIG5vdFxuICogZXhjZWVkIHRoZSBtYXhpbXVtIGFsbG93ZWQgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIHZlcmlmdWludCAodmFsdWUsIG1heCkge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPj0gMCwgJ3NwZWNpZmllZCBhIG5lZ2F0aXZlIHZhbHVlIGZvciB3cml0aW5nIGFuIHVuc2lnbmVkIHZhbHVlJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGlzIGxhcmdlciB0aGFuIG1heGltdW0gdmFsdWUgZm9yIHR5cGUnKVxuICBhc3NlcnQoTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlLCAndmFsdWUgaGFzIGEgZnJhY3Rpb25hbCBjb21wb25lbnQnKVxufVxuXG5mdW5jdGlvbiB2ZXJpZnNpbnQgKHZhbHVlLCBtYXgsIG1pbikge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPD0gbWF4LCAndmFsdWUgbGFyZ2VyIHRoYW4gbWF4aW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KHZhbHVlID49IG1pbiwgJ3ZhbHVlIHNtYWxsZXIgdGhhbiBtaW5pbXVtIGFsbG93ZWQgdmFsdWUnKVxuICBhc3NlcnQoTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlLCAndmFsdWUgaGFzIGEgZnJhY3Rpb25hbCBjb21wb25lbnQnKVxufVxuXG5mdW5jdGlvbiB2ZXJpZklFRUU3NTQgKHZhbHVlLCBtYXgsIG1pbikge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPD0gbWF4LCAndmFsdWUgbGFyZ2VyIHRoYW4gbWF4aW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KHZhbHVlID49IG1pbiwgJ3ZhbHVlIHNtYWxsZXIgdGhhbiBtaW5pbXVtIGFsbG93ZWQgdmFsdWUnKVxufVxuXG5mdW5jdGlvbiBhc3NlcnQgKHRlc3QsIG1lc3NhZ2UpIHtcbiAgaWYgKCF0ZXN0KSB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSB8fCAnRmFpbGVkIGFzc2VydGlvbicpXG59XG4iLCJ2YXIgbG9va3VwID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nO1xuXG47KGZ1bmN0aW9uIChleHBvcnRzKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuICB2YXIgQXJyID0gKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJylcbiAgICA/IFVpbnQ4QXJyYXlcbiAgICA6IEFycmF5XG5cblx0dmFyIFBMVVMgICA9ICcrJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSCAgPSAnLycuY2hhckNvZGVBdCgwKVxuXHR2YXIgTlVNQkVSID0gJzAnLmNoYXJDb2RlQXQoMClcblx0dmFyIExPV0VSICA9ICdhJy5jaGFyQ29kZUF0KDApXG5cdHZhciBVUFBFUiAgPSAnQScuY2hhckNvZGVBdCgwKVxuXG5cdGZ1bmN0aW9uIGRlY29kZSAoZWx0KSB7XG5cdFx0dmFyIGNvZGUgPSBlbHQuY2hhckNvZGVBdCgwKVxuXHRcdGlmIChjb2RlID09PSBQTFVTKVxuXHRcdFx0cmV0dXJuIDYyIC8vICcrJ1xuXHRcdGlmIChjb2RlID09PSBTTEFTSClcblx0XHRcdHJldHVybiA2MyAvLyAnLydcblx0XHRpZiAoY29kZSA8IE5VTUJFUilcblx0XHRcdHJldHVybiAtMSAvL25vIG1hdGNoXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIgKyAxMClcblx0XHRcdHJldHVybiBjb2RlIC0gTlVNQkVSICsgMjYgKyAyNlxuXHRcdGlmIChjb2RlIDwgVVBQRVIgKyAyNilcblx0XHRcdHJldHVybiBjb2RlIC0gVVBQRVJcblx0XHRpZiAoY29kZSA8IExPV0VSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIExPV0VSICsgMjZcblx0fVxuXG5cdGZ1bmN0aW9uIGI2NFRvQnl0ZUFycmF5IChiNjQpIHtcblx0XHR2YXIgaSwgaiwgbCwgdG1wLCBwbGFjZUhvbGRlcnMsIGFyclxuXG5cdFx0aWYgKGI2NC5sZW5ndGggJSA0ID4gMCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHN0cmluZy4gTGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiA0Jylcblx0XHR9XG5cblx0XHQvLyB0aGUgbnVtYmVyIG9mIGVxdWFsIHNpZ25zIChwbGFjZSBob2xkZXJzKVxuXHRcdC8vIGlmIHRoZXJlIGFyZSB0d28gcGxhY2Vob2xkZXJzLCB0aGFuIHRoZSB0d28gY2hhcmFjdGVycyBiZWZvcmUgaXRcblx0XHQvLyByZXByZXNlbnQgb25lIGJ5dGVcblx0XHQvLyBpZiB0aGVyZSBpcyBvbmx5IG9uZSwgdGhlbiB0aGUgdGhyZWUgY2hhcmFjdGVycyBiZWZvcmUgaXQgcmVwcmVzZW50IDIgYnl0ZXNcblx0XHQvLyB0aGlzIGlzIGp1c3QgYSBjaGVhcCBoYWNrIHRvIG5vdCBkbyBpbmRleE9mIHR3aWNlXG5cdFx0dmFyIGxlbiA9IGI2NC5sZW5ndGhcblx0XHRwbGFjZUhvbGRlcnMgPSAnPScgPT09IGI2NC5jaGFyQXQobGVuIC0gMikgPyAyIDogJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDEpID8gMSA6IDBcblxuXHRcdC8vIGJhc2U2NCBpcyA0LzMgKyB1cCB0byB0d28gY2hhcmFjdGVycyBvZiB0aGUgb3JpZ2luYWwgZGF0YVxuXHRcdGFyciA9IG5ldyBBcnIoYjY0Lmxlbmd0aCAqIDMgLyA0IC0gcGxhY2VIb2xkZXJzKVxuXG5cdFx0Ly8gaWYgdGhlcmUgYXJlIHBsYWNlaG9sZGVycywgb25seSBnZXQgdXAgdG8gdGhlIGxhc3QgY29tcGxldGUgNCBjaGFyc1xuXHRcdGwgPSBwbGFjZUhvbGRlcnMgPiAwID8gYjY0Lmxlbmd0aCAtIDQgOiBiNjQubGVuZ3RoXG5cblx0XHR2YXIgTCA9IDBcblxuXHRcdGZ1bmN0aW9uIHB1c2ggKHYpIHtcblx0XHRcdGFycltMKytdID0gdlxuXHRcdH1cblxuXHRcdGZvciAoaSA9IDAsIGogPSAwOyBpIDwgbDsgaSArPSA0LCBqICs9IDMpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMTgpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPDwgMTIpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPDwgNikgfCBkZWNvZGUoYjY0LmNoYXJBdChpICsgMykpXG5cdFx0XHRwdXNoKCh0bXAgJiAweEZGMDAwMCkgPj4gMTYpXG5cdFx0XHRwdXNoKCh0bXAgJiAweEZGMDApID4+IDgpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0aWYgKHBsYWNlSG9sZGVycyA9PT0gMikge1xuXHRcdFx0dG1wID0gKGRlY29kZShiNjQuY2hhckF0KGkpKSA8PCAyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpID4+IDQpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fSBlbHNlIGlmIChwbGFjZUhvbGRlcnMgPT09IDEpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMTApIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAxKSkgPDwgNCkgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDIpKSA+PiAyKVxuXHRcdFx0cHVzaCgodG1wID4+IDgpICYgMHhGRilcblx0XHRcdHB1c2godG1wICYgMHhGRilcblx0XHR9XG5cblx0XHRyZXR1cm4gYXJyXG5cdH1cblxuXHRmdW5jdGlvbiB1aW50OFRvQmFzZTY0ICh1aW50OCkge1xuXHRcdHZhciBpLFxuXHRcdFx0ZXh0cmFCeXRlcyA9IHVpbnQ4Lmxlbmd0aCAlIDMsIC8vIGlmIHdlIGhhdmUgMSBieXRlIGxlZnQsIHBhZCAyIGJ5dGVzXG5cdFx0XHRvdXRwdXQgPSBcIlwiLFxuXHRcdFx0dGVtcCwgbGVuZ3RoXG5cblx0XHRmdW5jdGlvbiBlbmNvZGUgKG51bSkge1xuXHRcdFx0cmV0dXJuIGxvb2t1cC5jaGFyQXQobnVtKVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHRyaXBsZXRUb0Jhc2U2NCAobnVtKSB7XG5cdFx0XHRyZXR1cm4gZW5jb2RlKG51bSA+PiAxOCAmIDB4M0YpICsgZW5jb2RlKG51bSA+PiAxMiAmIDB4M0YpICsgZW5jb2RlKG51bSA+PiA2ICYgMHgzRikgKyBlbmNvZGUobnVtICYgMHgzRilcblx0XHR9XG5cblx0XHQvLyBnbyB0aHJvdWdoIHRoZSBhcnJheSBldmVyeSB0aHJlZSBieXRlcywgd2UnbGwgZGVhbCB3aXRoIHRyYWlsaW5nIHN0dWZmIGxhdGVyXG5cdFx0Zm9yIChpID0gMCwgbGVuZ3RoID0gdWludDgubGVuZ3RoIC0gZXh0cmFCeXRlczsgaSA8IGxlbmd0aDsgaSArPSAzKSB7XG5cdFx0XHR0ZW1wID0gKHVpbnQ4W2ldIDw8IDE2KSArICh1aW50OFtpICsgMV0gPDwgOCkgKyAodWludDhbaSArIDJdKVxuXHRcdFx0b3V0cHV0ICs9IHRyaXBsZXRUb0Jhc2U2NCh0ZW1wKVxuXHRcdH1cblxuXHRcdC8vIHBhZCB0aGUgZW5kIHdpdGggemVyb3MsIGJ1dCBtYWtlIHN1cmUgdG8gbm90IGZvcmdldCB0aGUgZXh0cmEgYnl0ZXNcblx0XHRzd2l0Y2ggKGV4dHJhQnl0ZXMpIHtcblx0XHRcdGNhc2UgMTpcblx0XHRcdFx0dGVtcCA9IHVpbnQ4W3VpbnQ4Lmxlbmd0aCAtIDFdXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAyKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wIDw8IDQpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9ICc9PSdcblx0XHRcdFx0YnJlYWtcblx0XHRcdGNhc2UgMjpcblx0XHRcdFx0dGVtcCA9ICh1aW50OFt1aW50OC5sZW5ndGggLSAyXSA8PCA4KSArICh1aW50OFt1aW50OC5sZW5ndGggLSAxXSlcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSh0ZW1wID4+IDEwKVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKCh0ZW1wID4+IDQpICYgMHgzRilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCAyKSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPSdcblx0XHRcdFx0YnJlYWtcblx0XHR9XG5cblx0XHRyZXR1cm4gb3V0cHV0XG5cdH1cblxuXHRleHBvcnRzLnRvQnl0ZUFycmF5ID0gYjY0VG9CeXRlQXJyYXlcblx0ZXhwb3J0cy5mcm9tQnl0ZUFycmF5ID0gdWludDhUb0Jhc2U2NFxufSh0eXBlb2YgZXhwb3J0cyA9PT0gJ3VuZGVmaW5lZCcgPyAodGhpcy5iYXNlNjRqcyA9IHt9KSA6IGV4cG9ydHMpKVxuIiwiZXhwb3J0cy5yZWFkID0gZnVuY3Rpb24oYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBuQml0cyA9IC03LFxuICAgICAgaSA9IGlzTEUgPyAobkJ5dGVzIC0gMSkgOiAwLFxuICAgICAgZCA9IGlzTEUgPyAtMSA6IDEsXG4gICAgICBzID0gYnVmZmVyW29mZnNldCArIGldO1xuXG4gIGkgKz0gZDtcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKTtcbiAgcyA+Pj0gKC1uQml0cyk7XG4gIG5CaXRzICs9IGVMZW47XG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSBlICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpO1xuXG4gIG0gPSBlICYgKCgxIDw8ICgtbkJpdHMpKSAtIDEpO1xuICBlID4+PSAoLW5CaXRzKTtcbiAgbkJpdHMgKz0gbUxlbjtcbiAgZm9yICg7IG5CaXRzID4gMDsgbSA9IG0gKiAyNTYgKyBidWZmZXJbb2Zmc2V0ICsgaV0sIGkgKz0gZCwgbkJpdHMgLT0gOCk7XG5cbiAgaWYgKGUgPT09IDApIHtcbiAgICBlID0gMSAtIGVCaWFzO1xuICB9IGVsc2UgaWYgKGUgPT09IGVNYXgpIHtcbiAgICByZXR1cm4gbSA/IE5hTiA6ICgocyA/IC0xIDogMSkgKiBJbmZpbml0eSk7XG4gIH0gZWxzZSB7XG4gICAgbSA9IG0gKyBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICBlID0gZSAtIGVCaWFzO1xuICB9XG4gIHJldHVybiAocyA/IC0xIDogMSkgKiBtICogTWF0aC5wb3coMiwgZSAtIG1MZW4pO1xufTtcblxuZXhwb3J0cy53cml0ZSA9IGZ1bmN0aW9uKGJ1ZmZlciwgdmFsdWUsIG9mZnNldCwgaXNMRSwgbUxlbiwgbkJ5dGVzKSB7XG4gIHZhciBlLCBtLCBjLFxuICAgICAgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMSxcbiAgICAgIGVNYXggPSAoMSA8PCBlTGVuKSAtIDEsXG4gICAgICBlQmlhcyA9IGVNYXggPj4gMSxcbiAgICAgIHJ0ID0gKG1MZW4gPT09IDIzID8gTWF0aC5wb3coMiwgLTI0KSAtIE1hdGgucG93KDIsIC03NykgOiAwKSxcbiAgICAgIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKSxcbiAgICAgIGQgPSBpc0xFID8gMSA6IC0xLFxuICAgICAgcyA9IHZhbHVlIDwgMCB8fCAodmFsdWUgPT09IDAgJiYgMSAvIHZhbHVlIDwgMCkgPyAxIDogMDtcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKTtcblxuICBpZiAoaXNOYU4odmFsdWUpIHx8IHZhbHVlID09PSBJbmZpbml0eSkge1xuICAgIG0gPSBpc05hTih2YWx1ZSkgPyAxIDogMDtcbiAgICBlID0gZU1heDtcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMik7XG4gICAgaWYgKHZhbHVlICogKGMgPSBNYXRoLnBvdygyLCAtZSkpIDwgMSkge1xuICAgICAgZS0tO1xuICAgICAgYyAqPSAyO1xuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gYztcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsdWUgKz0gcnQgKiBNYXRoLnBvdygyLCAxIC0gZUJpYXMpO1xuICAgIH1cbiAgICBpZiAodmFsdWUgKiBjID49IDIpIHtcbiAgICAgIGUrKztcbiAgICAgIGMgLz0gMjtcbiAgICB9XG5cbiAgICBpZiAoZSArIGVCaWFzID49IGVNYXgpIHtcbiAgICAgIG0gPSAwO1xuICAgICAgZSA9IGVNYXg7XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICh2YWx1ZSAqIGMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pO1xuICAgICAgZSA9IGUgKyBlQmlhcztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IHZhbHVlICogTWF0aC5wb3coMiwgZUJpYXMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pO1xuICAgICAgZSA9IDA7XG4gICAgfVxuICB9XG5cbiAgZm9yICg7IG1MZW4gPj0gODsgYnVmZmVyW29mZnNldCArIGldID0gbSAmIDB4ZmYsIGkgKz0gZCwgbSAvPSAyNTYsIG1MZW4gLT0gOCk7XG5cbiAgZSA9IChlIDw8IG1MZW4pIHwgbTtcbiAgZUxlbiArPSBtTGVuO1xuICBmb3IgKDsgZUxlbiA+IDA7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IGUgJiAweGZmLCBpICs9IGQsIGUgLz0gMjU2LCBlTGVuIC09IDgpO1xuXG4gIGJ1ZmZlcltvZmZzZXQgKyBpIC0gZF0gfD0gcyAqIDEyODtcbn07XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9saWIvX3N0cmVhbV9kdXBsZXguanNcIilcbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gYSBkdXBsZXggc3RyZWFtIGlzIGp1c3QgYSBzdHJlYW0gdGhhdCBpcyBib3RoIHJlYWRhYmxlIGFuZCB3cml0YWJsZS5cbi8vIFNpbmNlIEpTIGRvZXNuJ3QgaGF2ZSBtdWx0aXBsZSBwcm90b3R5cGFsIGluaGVyaXRhbmNlLCB0aGlzIGNsYXNzXG4vLyBwcm90b3R5cGFsbHkgaW5oZXJpdHMgZnJvbSBSZWFkYWJsZSwgYW5kIHRoZW4gcGFyYXNpdGljYWxseSBmcm9tXG4vLyBXcml0YWJsZS5cblxubW9kdWxlLmV4cG9ydHMgPSBEdXBsZXg7XG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgdmFyIGtleXMgPSBbXTtcbiAgZm9yICh2YXIga2V5IGluIG9iaikga2V5cy5wdXNoKGtleSk7XG4gIHJldHVybiBrZXlzO1xufVxuLyo8L3JlcGxhY2VtZW50PiovXG5cblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciB1dGlsID0gcmVxdWlyZSgnY29yZS11dGlsLWlzJyk7XG51dGlsLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG52YXIgUmVhZGFibGUgPSByZXF1aXJlKCcuL19zdHJlYW1fcmVhZGFibGUnKTtcbnZhciBXcml0YWJsZSA9IHJlcXVpcmUoJy4vX3N0cmVhbV93cml0YWJsZScpO1xuXG51dGlsLmluaGVyaXRzKER1cGxleCwgUmVhZGFibGUpO1xuXG5mb3JFYWNoKG9iamVjdEtleXMoV3JpdGFibGUucHJvdG90eXBlKSwgZnVuY3Rpb24obWV0aG9kKSB7XG4gIGlmICghRHVwbGV4LnByb3RvdHlwZVttZXRob2RdKVxuICAgIER1cGxleC5wcm90b3R5cGVbbWV0aG9kXSA9IFdyaXRhYmxlLnByb3RvdHlwZVttZXRob2RdO1xufSk7XG5cbmZ1bmN0aW9uIER1cGxleChvcHRpb25zKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBEdXBsZXgpKVxuICAgIHJldHVybiBuZXcgRHVwbGV4KG9wdGlvbnMpO1xuXG4gIFJlYWRhYmxlLmNhbGwodGhpcywgb3B0aW9ucyk7XG4gIFdyaXRhYmxlLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5yZWFkYWJsZSA9PT0gZmFsc2UpXG4gICAgdGhpcy5yZWFkYWJsZSA9IGZhbHNlO1xuXG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMud3JpdGFibGUgPT09IGZhbHNlKVxuICAgIHRoaXMud3JpdGFibGUgPSBmYWxzZTtcblxuICB0aGlzLmFsbG93SGFsZk9wZW4gPSB0cnVlO1xuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmFsbG93SGFsZk9wZW4gPT09IGZhbHNlKVxuICAgIHRoaXMuYWxsb3dIYWxmT3BlbiA9IGZhbHNlO1xuXG4gIHRoaXMub25jZSgnZW5kJywgb25lbmQpO1xufVxuXG4vLyB0aGUgbm8taGFsZi1vcGVuIGVuZm9yY2VyXG5mdW5jdGlvbiBvbmVuZCgpIHtcbiAgLy8gaWYgd2UgYWxsb3cgaGFsZi1vcGVuIHN0YXRlLCBvciBpZiB0aGUgd3JpdGFibGUgc2lkZSBlbmRlZCxcbiAgLy8gdGhlbiB3ZSdyZSBvay5cbiAgaWYgKHRoaXMuYWxsb3dIYWxmT3BlbiB8fCB0aGlzLl93cml0YWJsZVN0YXRlLmVuZGVkKVxuICAgIHJldHVybjtcblxuICAvLyBubyBtb3JlIGRhdGEgY2FuIGJlIHdyaXR0ZW4uXG4gIC8vIEJ1dCBhbGxvdyBtb3JlIHdyaXRlcyB0byBoYXBwZW4gaW4gdGhpcyB0aWNrLlxuICBwcm9jZXNzLm5leHRUaWNrKHRoaXMuZW5kLmJpbmQodGhpcykpO1xufVxuXG5mdW5jdGlvbiBmb3JFYWNoICh4cywgZikge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHhzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGYoeHNbaV0sIGkpO1xuICB9XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiRldhQVNIXCIpKSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyBhIHBhc3N0aHJvdWdoIHN0cmVhbS5cbi8vIGJhc2ljYWxseSBqdXN0IHRoZSBtb3N0IG1pbmltYWwgc29ydCBvZiBUcmFuc2Zvcm0gc3RyZWFtLlxuLy8gRXZlcnkgd3JpdHRlbiBjaHVuayBnZXRzIG91dHB1dCBhcy1pcy5cblxubW9kdWxlLmV4cG9ydHMgPSBQYXNzVGhyb3VnaDtcblxudmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vX3N0cmVhbV90cmFuc2Zvcm0nKTtcblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciB1dGlsID0gcmVxdWlyZSgnY29yZS11dGlsLWlzJyk7XG51dGlsLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG51dGlsLmluaGVyaXRzKFBhc3NUaHJvdWdoLCBUcmFuc2Zvcm0pO1xuXG5mdW5jdGlvbiBQYXNzVGhyb3VnaChvcHRpb25zKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBQYXNzVGhyb3VnaCkpXG4gICAgcmV0dXJuIG5ldyBQYXNzVGhyb3VnaChvcHRpb25zKTtcblxuICBUcmFuc2Zvcm0uY2FsbCh0aGlzLCBvcHRpb25zKTtcbn1cblxuUGFzc1Rocm91Z2gucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIGNiKG51bGwsIGNodW5rKTtcbn07XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhZGFibGU7XG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgaXNBcnJheSA9IHJlcXVpcmUoJ2lzYXJyYXknKTtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyO1xuLyo8L3JlcGxhY2VtZW50PiovXG5cblJlYWRhYmxlLlJlYWRhYmxlU3RhdGUgPSBSZWFkYWJsZVN0YXRlO1xuXG52YXIgRUUgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG5cbi8qPHJlcGxhY2VtZW50PiovXG5pZiAoIUVFLmxpc3RlbmVyQ291bnQpIEVFLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHJldHVybiBlbWl0dGVyLmxpc3RlbmVycyh0eXBlKS5sZW5ndGg7XG59O1xuLyo8L3JlcGxhY2VtZW50PiovXG5cbnZhciBTdHJlYW0gPSByZXF1aXJlKCdzdHJlYW0nKTtcblxuLyo8cmVwbGFjZW1lbnQ+Ki9cbnZhciB1dGlsID0gcmVxdWlyZSgnY29yZS11dGlsLWlzJyk7XG51dGlsLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG52YXIgU3RyaW5nRGVjb2RlcjtcblxudXRpbC5pbmhlcml0cyhSZWFkYWJsZSwgU3RyZWFtKTtcblxuZnVuY3Rpb24gUmVhZGFibGVTdGF0ZShvcHRpb25zLCBzdHJlYW0pIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgLy8gdGhlIHBvaW50IGF0IHdoaWNoIGl0IHN0b3BzIGNhbGxpbmcgX3JlYWQoKSB0byBmaWxsIHRoZSBidWZmZXJcbiAgLy8gTm90ZTogMCBpcyBhIHZhbGlkIHZhbHVlLCBtZWFucyBcImRvbid0IGNhbGwgX3JlYWQgcHJlZW1wdGl2ZWx5IGV2ZXJcIlxuICB2YXIgaHdtID0gb3B0aW9ucy5oaWdoV2F0ZXJNYXJrO1xuICB0aGlzLmhpZ2hXYXRlck1hcmsgPSAoaHdtIHx8IGh3bSA9PT0gMCkgPyBod20gOiAxNiAqIDEwMjQ7XG5cbiAgLy8gY2FzdCB0byBpbnRzLlxuICB0aGlzLmhpZ2hXYXRlck1hcmsgPSB+fnRoaXMuaGlnaFdhdGVyTWFyaztcblxuICB0aGlzLmJ1ZmZlciA9IFtdO1xuICB0aGlzLmxlbmd0aCA9IDA7XG4gIHRoaXMucGlwZXMgPSBudWxsO1xuICB0aGlzLnBpcGVzQ291bnQgPSAwO1xuICB0aGlzLmZsb3dpbmcgPSBmYWxzZTtcbiAgdGhpcy5lbmRlZCA9IGZhbHNlO1xuICB0aGlzLmVuZEVtaXR0ZWQgPSBmYWxzZTtcbiAgdGhpcy5yZWFkaW5nID0gZmFsc2U7XG5cbiAgLy8gSW4gc3RyZWFtcyB0aGF0IG5ldmVyIGhhdmUgYW55IGRhdGEsIGFuZCBkbyBwdXNoKG51bGwpIHJpZ2h0IGF3YXksXG4gIC8vIHRoZSBjb25zdW1lciBjYW4gbWlzcyB0aGUgJ2VuZCcgZXZlbnQgaWYgdGhleSBkbyBzb21lIEkvTyBiZWZvcmVcbiAgLy8gY29uc3VtaW5nIHRoZSBzdHJlYW0uICBTbywgd2UgZG9uJ3QgZW1pdCgnZW5kJykgdW50aWwgc29tZSByZWFkaW5nXG4gIC8vIGhhcHBlbnMuXG4gIHRoaXMuY2FsbGVkUmVhZCA9IGZhbHNlO1xuXG4gIC8vIGEgZmxhZyB0byBiZSBhYmxlIHRvIHRlbGwgaWYgdGhlIG9ud3JpdGUgY2IgaXMgY2FsbGVkIGltbWVkaWF0ZWx5LFxuICAvLyBvciBvbiBhIGxhdGVyIHRpY2suICBXZSBzZXQgdGhpcyB0byB0cnVlIGF0IGZpcnN0LCBiZWN1YXNlIGFueVxuICAvLyBhY3Rpb25zIHRoYXQgc2hvdWxkbid0IGhhcHBlbiB1bnRpbCBcImxhdGVyXCIgc2hvdWxkIGdlbmVyYWxseSBhbHNvXG4gIC8vIG5vdCBoYXBwZW4gYmVmb3JlIHRoZSBmaXJzdCB3cml0ZSBjYWxsLlxuICB0aGlzLnN5bmMgPSB0cnVlO1xuXG4gIC8vIHdoZW5ldmVyIHdlIHJldHVybiBudWxsLCB0aGVuIHdlIHNldCBhIGZsYWcgdG8gc2F5XG4gIC8vIHRoYXQgd2UncmUgYXdhaXRpbmcgYSAncmVhZGFibGUnIGV2ZW50IGVtaXNzaW9uLlxuICB0aGlzLm5lZWRSZWFkYWJsZSA9IGZhbHNlO1xuICB0aGlzLmVtaXR0ZWRSZWFkYWJsZSA9IGZhbHNlO1xuICB0aGlzLnJlYWRhYmxlTGlzdGVuaW5nID0gZmFsc2U7XG5cblxuICAvLyBvYmplY3Qgc3RyZWFtIGZsYWcuIFVzZWQgdG8gbWFrZSByZWFkKG4pIGlnbm9yZSBuIGFuZCB0b1xuICAvLyBtYWtlIGFsbCB0aGUgYnVmZmVyIG1lcmdpbmcgYW5kIGxlbmd0aCBjaGVja3MgZ28gYXdheVxuICB0aGlzLm9iamVjdE1vZGUgPSAhIW9wdGlvbnMub2JqZWN0TW9kZTtcblxuICAvLyBDcnlwdG8gaXMga2luZCBvZiBvbGQgYW5kIGNydXN0eS4gIEhpc3RvcmljYWxseSwgaXRzIGRlZmF1bHQgc3RyaW5nXG4gIC8vIGVuY29kaW5nIGlzICdiaW5hcnknIHNvIHdlIGhhdmUgdG8gbWFrZSB0aGlzIGNvbmZpZ3VyYWJsZS5cbiAgLy8gRXZlcnl0aGluZyBlbHNlIGluIHRoZSB1bml2ZXJzZSB1c2VzICd1dGY4JywgdGhvdWdoLlxuICB0aGlzLmRlZmF1bHRFbmNvZGluZyA9IG9wdGlvbnMuZGVmYXVsdEVuY29kaW5nIHx8ICd1dGY4JztcblxuICAvLyB3aGVuIHBpcGluZywgd2Ugb25seSBjYXJlIGFib3V0ICdyZWFkYWJsZScgZXZlbnRzIHRoYXQgaGFwcGVuXG4gIC8vIGFmdGVyIHJlYWQoKWluZyBhbGwgdGhlIGJ5dGVzIGFuZCBub3QgZ2V0dGluZyBhbnkgcHVzaGJhY2suXG4gIHRoaXMucmFuT3V0ID0gZmFsc2U7XG5cbiAgLy8gdGhlIG51bWJlciBvZiB3cml0ZXJzIHRoYXQgYXJlIGF3YWl0aW5nIGEgZHJhaW4gZXZlbnQgaW4gLnBpcGUoKXNcbiAgdGhpcy5hd2FpdERyYWluID0gMDtcblxuICAvLyBpZiB0cnVlLCBhIG1heWJlUmVhZE1vcmUgaGFzIGJlZW4gc2NoZWR1bGVkXG4gIHRoaXMucmVhZGluZ01vcmUgPSBmYWxzZTtcblxuICB0aGlzLmRlY29kZXIgPSBudWxsO1xuICB0aGlzLmVuY29kaW5nID0gbnVsbDtcbiAgaWYgKG9wdGlvbnMuZW5jb2RpbmcpIHtcbiAgICBpZiAoIVN0cmluZ0RlY29kZXIpXG4gICAgICBTdHJpbmdEZWNvZGVyID0gcmVxdWlyZSgnc3RyaW5nX2RlY29kZXIvJykuU3RyaW5nRGVjb2RlcjtcbiAgICB0aGlzLmRlY29kZXIgPSBuZXcgU3RyaW5nRGVjb2RlcihvcHRpb25zLmVuY29kaW5nKTtcbiAgICB0aGlzLmVuY29kaW5nID0gb3B0aW9ucy5lbmNvZGluZztcbiAgfVxufVxuXG5mdW5jdGlvbiBSZWFkYWJsZShvcHRpb25zKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBSZWFkYWJsZSkpXG4gICAgcmV0dXJuIG5ldyBSZWFkYWJsZShvcHRpb25zKTtcblxuICB0aGlzLl9yZWFkYWJsZVN0YXRlID0gbmV3IFJlYWRhYmxlU3RhdGUob3B0aW9ucywgdGhpcyk7XG5cbiAgLy8gbGVnYWN5XG4gIHRoaXMucmVhZGFibGUgPSB0cnVlO1xuXG4gIFN0cmVhbS5jYWxsKHRoaXMpO1xufVxuXG4vLyBNYW51YWxseSBzaG92ZSBzb21ldGhpbmcgaW50byB0aGUgcmVhZCgpIGJ1ZmZlci5cbi8vIFRoaXMgcmV0dXJucyB0cnVlIGlmIHRoZSBoaWdoV2F0ZXJNYXJrIGhhcyBub3QgYmVlbiBoaXQgeWV0LFxuLy8gc2ltaWxhciB0byBob3cgV3JpdGFibGUud3JpdGUoKSByZXR1cm5zIHRydWUgaWYgeW91IHNob3VsZFxuLy8gd3JpdGUoKSBzb21lIG1vcmUuXG5SZWFkYWJsZS5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZykge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuXG4gIGlmICh0eXBlb2YgY2h1bmsgPT09ICdzdHJpbmcnICYmICFzdGF0ZS5vYmplY3RNb2RlKSB7XG4gICAgZW5jb2RpbmcgPSBlbmNvZGluZyB8fCBzdGF0ZS5kZWZhdWx0RW5jb2Rpbmc7XG4gICAgaWYgKGVuY29kaW5nICE9PSBzdGF0ZS5lbmNvZGluZykge1xuICAgICAgY2h1bmsgPSBuZXcgQnVmZmVyKGNodW5rLCBlbmNvZGluZyk7XG4gICAgICBlbmNvZGluZyA9ICcnO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZWFkYWJsZUFkZENodW5rKHRoaXMsIHN0YXRlLCBjaHVuaywgZW5jb2RpbmcsIGZhbHNlKTtcbn07XG5cbi8vIFVuc2hpZnQgc2hvdWxkICphbHdheXMqIGJlIHNvbWV0aGluZyBkaXJlY3RseSBvdXQgb2YgcmVhZCgpXG5SZWFkYWJsZS5wcm90b3R5cGUudW5zaGlmdCA9IGZ1bmN0aW9uKGNodW5rKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG4gIHJldHVybiByZWFkYWJsZUFkZENodW5rKHRoaXMsIHN0YXRlLCBjaHVuaywgJycsIHRydWUpO1xufTtcblxuZnVuY3Rpb24gcmVhZGFibGVBZGRDaHVuayhzdHJlYW0sIHN0YXRlLCBjaHVuaywgZW5jb2RpbmcsIGFkZFRvRnJvbnQpIHtcbiAgdmFyIGVyID0gY2h1bmtJbnZhbGlkKHN0YXRlLCBjaHVuayk7XG4gIGlmIChlcikge1xuICAgIHN0cmVhbS5lbWl0KCdlcnJvcicsIGVyKTtcbiAgfSBlbHNlIGlmIChjaHVuayA9PT0gbnVsbCB8fCBjaHVuayA9PT0gdW5kZWZpbmVkKSB7XG4gICAgc3RhdGUucmVhZGluZyA9IGZhbHNlO1xuICAgIGlmICghc3RhdGUuZW5kZWQpXG4gICAgICBvbkVvZkNodW5rKHN0cmVhbSwgc3RhdGUpO1xuICB9IGVsc2UgaWYgKHN0YXRlLm9iamVjdE1vZGUgfHwgY2h1bmsgJiYgY2h1bmsubGVuZ3RoID4gMCkge1xuICAgIGlmIChzdGF0ZS5lbmRlZCAmJiAhYWRkVG9Gcm9udCkge1xuICAgICAgdmFyIGUgPSBuZXcgRXJyb3IoJ3N0cmVhbS5wdXNoKCkgYWZ0ZXIgRU9GJyk7XG4gICAgICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlKTtcbiAgICB9IGVsc2UgaWYgKHN0YXRlLmVuZEVtaXR0ZWQgJiYgYWRkVG9Gcm9udCkge1xuICAgICAgdmFyIGUgPSBuZXcgRXJyb3IoJ3N0cmVhbS51bnNoaWZ0KCkgYWZ0ZXIgZW5kIGV2ZW50Jyk7XG4gICAgICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHN0YXRlLmRlY29kZXIgJiYgIWFkZFRvRnJvbnQgJiYgIWVuY29kaW5nKVxuICAgICAgICBjaHVuayA9IHN0YXRlLmRlY29kZXIud3JpdGUoY2h1bmspO1xuXG4gICAgICAvLyB1cGRhdGUgdGhlIGJ1ZmZlciBpbmZvLlxuICAgICAgc3RhdGUubGVuZ3RoICs9IHN0YXRlLm9iamVjdE1vZGUgPyAxIDogY2h1bmsubGVuZ3RoO1xuICAgICAgaWYgKGFkZFRvRnJvbnQpIHtcbiAgICAgICAgc3RhdGUuYnVmZmVyLnVuc2hpZnQoY2h1bmspO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RhdGUucmVhZGluZyA9IGZhbHNlO1xuICAgICAgICBzdGF0ZS5idWZmZXIucHVzaChjaHVuayk7XG4gICAgICB9XG5cbiAgICAgIGlmIChzdGF0ZS5uZWVkUmVhZGFibGUpXG4gICAgICAgIGVtaXRSZWFkYWJsZShzdHJlYW0pO1xuXG4gICAgICBtYXliZVJlYWRNb3JlKHN0cmVhbSwgc3RhdGUpO1xuICAgIH1cbiAgfSBlbHNlIGlmICghYWRkVG9Gcm9udCkge1xuICAgIHN0YXRlLnJlYWRpbmcgPSBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiBuZWVkTW9yZURhdGEoc3RhdGUpO1xufVxuXG5cblxuLy8gaWYgaXQncyBwYXN0IHRoZSBoaWdoIHdhdGVyIG1hcmssIHdlIGNhbiBwdXNoIGluIHNvbWUgbW9yZS5cbi8vIEFsc28sIGlmIHdlIGhhdmUgbm8gZGF0YSB5ZXQsIHdlIGNhbiBzdGFuZCBzb21lXG4vLyBtb3JlIGJ5dGVzLiAgVGhpcyBpcyB0byB3b3JrIGFyb3VuZCBjYXNlcyB3aGVyZSBod209MCxcbi8vIHN1Y2ggYXMgdGhlIHJlcGwuICBBbHNvLCBpZiB0aGUgcHVzaCgpIHRyaWdnZXJlZCBhXG4vLyByZWFkYWJsZSBldmVudCwgYW5kIHRoZSB1c2VyIGNhbGxlZCByZWFkKGxhcmdlTnVtYmVyKSBzdWNoIHRoYXRcbi8vIG5lZWRSZWFkYWJsZSB3YXMgc2V0LCB0aGVuIHdlIG91Z2h0IHRvIHB1c2ggbW9yZSwgc28gdGhhdCBhbm90aGVyXG4vLyAncmVhZGFibGUnIGV2ZW50IHdpbGwgYmUgdHJpZ2dlcmVkLlxuZnVuY3Rpb24gbmVlZE1vcmVEYXRhKHN0YXRlKSB7XG4gIHJldHVybiAhc3RhdGUuZW5kZWQgJiZcbiAgICAgICAgIChzdGF0ZS5uZWVkUmVhZGFibGUgfHxcbiAgICAgICAgICBzdGF0ZS5sZW5ndGggPCBzdGF0ZS5oaWdoV2F0ZXJNYXJrIHx8XG4gICAgICAgICAgc3RhdGUubGVuZ3RoID09PSAwKTtcbn1cblxuLy8gYmFja3dhcmRzIGNvbXBhdGliaWxpdHkuXG5SZWFkYWJsZS5wcm90b3R5cGUuc2V0RW5jb2RpbmcgPSBmdW5jdGlvbihlbmMpIHtcbiAgaWYgKCFTdHJpbmdEZWNvZGVyKVxuICAgIFN0cmluZ0RlY29kZXIgPSByZXF1aXJlKCdzdHJpbmdfZGVjb2Rlci8nKS5TdHJpbmdEZWNvZGVyO1xuICB0aGlzLl9yZWFkYWJsZVN0YXRlLmRlY29kZXIgPSBuZXcgU3RyaW5nRGVjb2RlcihlbmMpO1xuICB0aGlzLl9yZWFkYWJsZVN0YXRlLmVuY29kaW5nID0gZW5jO1xufTtcblxuLy8gRG9uJ3QgcmFpc2UgdGhlIGh3bSA+IDEyOE1CXG52YXIgTUFYX0hXTSA9IDB4ODAwMDAwO1xuZnVuY3Rpb24gcm91bmRVcFRvTmV4dFBvd2VyT2YyKG4pIHtcbiAgaWYgKG4gPj0gTUFYX0hXTSkge1xuICAgIG4gPSBNQVhfSFdNO1xuICB9IGVsc2Uge1xuICAgIC8vIEdldCB0aGUgbmV4dCBoaWdoZXN0IHBvd2VyIG9mIDJcbiAgICBuLS07XG4gICAgZm9yICh2YXIgcCA9IDE7IHAgPCAzMjsgcCA8PD0gMSkgbiB8PSBuID4+IHA7XG4gICAgbisrO1xuICB9XG4gIHJldHVybiBuO1xufVxuXG5mdW5jdGlvbiBob3dNdWNoVG9SZWFkKG4sIHN0YXRlKSB7XG4gIGlmIChzdGF0ZS5sZW5ndGggPT09IDAgJiYgc3RhdGUuZW5kZWQpXG4gICAgcmV0dXJuIDA7XG5cbiAgaWYgKHN0YXRlLm9iamVjdE1vZGUpXG4gICAgcmV0dXJuIG4gPT09IDAgPyAwIDogMTtcblxuICBpZiAobiA9PT0gbnVsbCB8fCBpc05hTihuKSkge1xuICAgIC8vIG9ubHkgZmxvdyBvbmUgYnVmZmVyIGF0IGEgdGltZVxuICAgIGlmIChzdGF0ZS5mbG93aW5nICYmIHN0YXRlLmJ1ZmZlci5sZW5ndGgpXG4gICAgICByZXR1cm4gc3RhdGUuYnVmZmVyWzBdLmxlbmd0aDtcbiAgICBlbHNlXG4gICAgICByZXR1cm4gc3RhdGUubGVuZ3RoO1xuICB9XG5cbiAgaWYgKG4gPD0gMClcbiAgICByZXR1cm4gMDtcblxuICAvLyBJZiB3ZSdyZSBhc2tpbmcgZm9yIG1vcmUgdGhhbiB0aGUgdGFyZ2V0IGJ1ZmZlciBsZXZlbCxcbiAgLy8gdGhlbiByYWlzZSB0aGUgd2F0ZXIgbWFyay4gIEJ1bXAgdXAgdG8gdGhlIG5leHQgaGlnaGVzdFxuICAvLyBwb3dlciBvZiAyLCB0byBwcmV2ZW50IGluY3JlYXNpbmcgaXQgZXhjZXNzaXZlbHkgaW4gdGlueVxuICAvLyBhbW91bnRzLlxuICBpZiAobiA+IHN0YXRlLmhpZ2hXYXRlck1hcmspXG4gICAgc3RhdGUuaGlnaFdhdGVyTWFyayA9IHJvdW5kVXBUb05leHRQb3dlck9mMihuKTtcblxuICAvLyBkb24ndCBoYXZlIHRoYXQgbXVjaC4gIHJldHVybiBudWxsLCB1bmxlc3Mgd2UndmUgZW5kZWQuXG4gIGlmIChuID4gc3RhdGUubGVuZ3RoKSB7XG4gICAgaWYgKCFzdGF0ZS5lbmRlZCkge1xuICAgICAgc3RhdGUubmVlZFJlYWRhYmxlID0gdHJ1ZTtcbiAgICAgIHJldHVybiAwO1xuICAgIH0gZWxzZVxuICAgICAgcmV0dXJuIHN0YXRlLmxlbmd0aDtcbiAgfVxuXG4gIHJldHVybiBuO1xufVxuXG4vLyB5b3UgY2FuIG92ZXJyaWRlIGVpdGhlciB0aGlzIG1ldGhvZCwgb3IgdGhlIGFzeW5jIF9yZWFkKG4pIGJlbG93LlxuUmVhZGFibGUucHJvdG90eXBlLnJlYWQgPSBmdW5jdGlvbihuKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG4gIHN0YXRlLmNhbGxlZFJlYWQgPSB0cnVlO1xuICB2YXIgbk9yaWcgPSBuO1xuICB2YXIgcmV0O1xuXG4gIGlmICh0eXBlb2YgbiAhPT0gJ251bWJlcicgfHwgbiA+IDApXG4gICAgc3RhdGUuZW1pdHRlZFJlYWRhYmxlID0gZmFsc2U7XG5cbiAgLy8gaWYgd2UncmUgZG9pbmcgcmVhZCgwKSB0byB0cmlnZ2VyIGEgcmVhZGFibGUgZXZlbnQsIGJ1dCB3ZVxuICAvLyBhbHJlYWR5IGhhdmUgYSBidW5jaCBvZiBkYXRhIGluIHRoZSBidWZmZXIsIHRoZW4ganVzdCB0cmlnZ2VyXG4gIC8vIHRoZSAncmVhZGFibGUnIGV2ZW50IGFuZCBtb3ZlIG9uLlxuICBpZiAobiA9PT0gMCAmJlxuICAgICAgc3RhdGUubmVlZFJlYWRhYmxlICYmXG4gICAgICAoc3RhdGUubGVuZ3RoID49IHN0YXRlLmhpZ2hXYXRlck1hcmsgfHwgc3RhdGUuZW5kZWQpKSB7XG4gICAgZW1pdFJlYWRhYmxlKHRoaXMpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgbiA9IGhvd011Y2hUb1JlYWQobiwgc3RhdGUpO1xuXG4gIC8vIGlmIHdlJ3ZlIGVuZGVkLCBhbmQgd2UncmUgbm93IGNsZWFyLCB0aGVuIGZpbmlzaCBpdCB1cC5cbiAgaWYgKG4gPT09IDAgJiYgc3RhdGUuZW5kZWQpIHtcbiAgICByZXQgPSBudWxsO1xuXG4gICAgLy8gSW4gY2FzZXMgd2hlcmUgdGhlIGRlY29kZXIgZGlkIG5vdCByZWNlaXZlIGVub3VnaCBkYXRhXG4gICAgLy8gdG8gcHJvZHVjZSBhIGZ1bGwgY2h1bmssIHRoZW4gaW1tZWRpYXRlbHkgcmVjZWl2ZWQgYW5cbiAgICAvLyBFT0YsIHN0YXRlLmJ1ZmZlciB3aWxsIGNvbnRhaW4gWzxCdWZmZXIgPiwgPEJ1ZmZlciAwMCAuLi4+XS5cbiAgICAvLyBob3dNdWNoVG9SZWFkIHdpbGwgc2VlIHRoaXMgYW5kIGNvZXJjZSB0aGUgYW1vdW50IHRvXG4gICAgLy8gcmVhZCB0byB6ZXJvIChiZWNhdXNlIGl0J3MgbG9va2luZyBhdCB0aGUgbGVuZ3RoIG9mIHRoZVxuICAgIC8vIGZpcnN0IDxCdWZmZXIgPiBpbiBzdGF0ZS5idWZmZXIpLCBhbmQgd2UnbGwgZW5kIHVwIGhlcmUuXG4gICAgLy9cbiAgICAvLyBUaGlzIGNhbiBvbmx5IGhhcHBlbiB2aWEgc3RhdGUuZGVjb2RlciAtLSBubyBvdGhlciB2ZW51ZVxuICAgIC8vIGV4aXN0cyBmb3IgcHVzaGluZyBhIHplcm8tbGVuZ3RoIGNodW5rIGludG8gc3RhdGUuYnVmZmVyXG4gICAgLy8gYW5kIHRyaWdnZXJpbmcgdGhpcyBiZWhhdmlvci4gSW4gdGhpcyBjYXNlLCB3ZSByZXR1cm4gb3VyXG4gICAgLy8gcmVtYWluaW5nIGRhdGEgYW5kIGVuZCB0aGUgc3RyZWFtLCBpZiBhcHByb3ByaWF0ZS5cbiAgICBpZiAoc3RhdGUubGVuZ3RoID4gMCAmJiBzdGF0ZS5kZWNvZGVyKSB7XG4gICAgICByZXQgPSBmcm9tTGlzdChuLCBzdGF0ZSk7XG4gICAgICBzdGF0ZS5sZW5ndGggLT0gcmV0Lmxlbmd0aDtcbiAgICB9XG5cbiAgICBpZiAoc3RhdGUubGVuZ3RoID09PSAwKVxuICAgICAgZW5kUmVhZGFibGUodGhpcyk7XG5cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gQWxsIHRoZSBhY3R1YWwgY2h1bmsgZ2VuZXJhdGlvbiBsb2dpYyBuZWVkcyB0byBiZVxuICAvLyAqYmVsb3cqIHRoZSBjYWxsIHRvIF9yZWFkLiAgVGhlIHJlYXNvbiBpcyB0aGF0IGluIGNlcnRhaW5cbiAgLy8gc3ludGhldGljIHN0cmVhbSBjYXNlcywgc3VjaCBhcyBwYXNzdGhyb3VnaCBzdHJlYW1zLCBfcmVhZFxuICAvLyBtYXkgYmUgYSBjb21wbGV0ZWx5IHN5bmNocm9ub3VzIG9wZXJhdGlvbiB3aGljaCBtYXkgY2hhbmdlXG4gIC8vIHRoZSBzdGF0ZSBvZiB0aGUgcmVhZCBidWZmZXIsIHByb3ZpZGluZyBlbm91Z2ggZGF0YSB3aGVuXG4gIC8vIGJlZm9yZSB0aGVyZSB3YXMgKm5vdCogZW5vdWdoLlxuICAvL1xuICAvLyBTbywgdGhlIHN0ZXBzIGFyZTpcbiAgLy8gMS4gRmlndXJlIG91dCB3aGF0IHRoZSBzdGF0ZSBvZiB0aGluZ3Mgd2lsbCBiZSBhZnRlciB3ZSBkb1xuICAvLyBhIHJlYWQgZnJvbSB0aGUgYnVmZmVyLlxuICAvL1xuICAvLyAyLiBJZiB0aGF0IHJlc3VsdGluZyBzdGF0ZSB3aWxsIHRyaWdnZXIgYSBfcmVhZCwgdGhlbiBjYWxsIF9yZWFkLlxuICAvLyBOb3RlIHRoYXQgdGhpcyBtYXkgYmUgYXN5bmNocm9ub3VzLCBvciBzeW5jaHJvbm91cy4gIFllcywgaXQgaXNcbiAgLy8gZGVlcGx5IHVnbHkgdG8gd3JpdGUgQVBJcyB0aGlzIHdheSwgYnV0IHRoYXQgc3RpbGwgZG9lc24ndCBtZWFuXG4gIC8vIHRoYXQgdGhlIFJlYWRhYmxlIGNsYXNzIHNob3VsZCBiZWhhdmUgaW1wcm9wZXJseSwgYXMgc3RyZWFtcyBhcmVcbiAgLy8gZGVzaWduZWQgdG8gYmUgc3luYy9hc3luYyBhZ25vc3RpYy5cbiAgLy8gVGFrZSBub3RlIGlmIHRoZSBfcmVhZCBjYWxsIGlzIHN5bmMgb3IgYXN5bmMgKGllLCBpZiB0aGUgcmVhZCBjYWxsXG4gIC8vIGhhcyByZXR1cm5lZCB5ZXQpLCBzbyB0aGF0IHdlIGtub3cgd2hldGhlciBvciBub3QgaXQncyBzYWZlIHRvIGVtaXRcbiAgLy8gJ3JlYWRhYmxlJyBldGMuXG4gIC8vXG4gIC8vIDMuIEFjdHVhbGx5IHB1bGwgdGhlIHJlcXVlc3RlZCBjaHVua3Mgb3V0IG9mIHRoZSBidWZmZXIgYW5kIHJldHVybi5cblxuICAvLyBpZiB3ZSBuZWVkIGEgcmVhZGFibGUgZXZlbnQsIHRoZW4gd2UgbmVlZCB0byBkbyBzb21lIHJlYWRpbmcuXG4gIHZhciBkb1JlYWQgPSBzdGF0ZS5uZWVkUmVhZGFibGU7XG5cbiAgLy8gaWYgd2UgY3VycmVudGx5IGhhdmUgbGVzcyB0aGFuIHRoZSBoaWdoV2F0ZXJNYXJrLCB0aGVuIGFsc28gcmVhZCBzb21lXG4gIGlmIChzdGF0ZS5sZW5ndGggLSBuIDw9IHN0YXRlLmhpZ2hXYXRlck1hcmspXG4gICAgZG9SZWFkID0gdHJ1ZTtcblxuICAvLyBob3dldmVyLCBpZiB3ZSd2ZSBlbmRlZCwgdGhlbiB0aGVyZSdzIG5vIHBvaW50LCBhbmQgaWYgd2UncmUgYWxyZWFkeVxuICAvLyByZWFkaW5nLCB0aGVuIGl0J3MgdW5uZWNlc3NhcnkuXG4gIGlmIChzdGF0ZS5lbmRlZCB8fCBzdGF0ZS5yZWFkaW5nKVxuICAgIGRvUmVhZCA9IGZhbHNlO1xuXG4gIGlmIChkb1JlYWQpIHtcbiAgICBzdGF0ZS5yZWFkaW5nID0gdHJ1ZTtcbiAgICBzdGF0ZS5zeW5jID0gdHJ1ZTtcbiAgICAvLyBpZiB0aGUgbGVuZ3RoIGlzIGN1cnJlbnRseSB6ZXJvLCB0aGVuIHdlICpuZWVkKiBhIHJlYWRhYmxlIGV2ZW50LlxuICAgIGlmIChzdGF0ZS5sZW5ndGggPT09IDApXG4gICAgICBzdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuICAgIC8vIGNhbGwgaW50ZXJuYWwgcmVhZCBtZXRob2RcbiAgICB0aGlzLl9yZWFkKHN0YXRlLmhpZ2hXYXRlck1hcmspO1xuICAgIHN0YXRlLnN5bmMgPSBmYWxzZTtcbiAgfVxuXG4gIC8vIElmIF9yZWFkIGNhbGxlZCBpdHMgY2FsbGJhY2sgc3luY2hyb25vdXNseSwgdGhlbiBgcmVhZGluZ2BcbiAgLy8gd2lsbCBiZSBmYWxzZSwgYW5kIHdlIG5lZWQgdG8gcmUtZXZhbHVhdGUgaG93IG11Y2ggZGF0YSB3ZVxuICAvLyBjYW4gcmV0dXJuIHRvIHRoZSB1c2VyLlxuICBpZiAoZG9SZWFkICYmICFzdGF0ZS5yZWFkaW5nKVxuICAgIG4gPSBob3dNdWNoVG9SZWFkKG5PcmlnLCBzdGF0ZSk7XG5cbiAgaWYgKG4gPiAwKVxuICAgIHJldCA9IGZyb21MaXN0KG4sIHN0YXRlKTtcbiAgZWxzZVxuICAgIHJldCA9IG51bGw7XG5cbiAgaWYgKHJldCA9PT0gbnVsbCkge1xuICAgIHN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG4gICAgbiA9IDA7XG4gIH1cblxuICBzdGF0ZS5sZW5ndGggLT0gbjtcblxuICAvLyBJZiB3ZSBoYXZlIG5vdGhpbmcgaW4gdGhlIGJ1ZmZlciwgdGhlbiB3ZSB3YW50IHRvIGtub3dcbiAgLy8gYXMgc29vbiBhcyB3ZSAqZG8qIGdldCBzb21ldGhpbmcgaW50byB0aGUgYnVmZmVyLlxuICBpZiAoc3RhdGUubGVuZ3RoID09PSAwICYmICFzdGF0ZS5lbmRlZClcbiAgICBzdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuXG4gIC8vIElmIHdlIGhhcHBlbmVkIHRvIHJlYWQoKSBleGFjdGx5IHRoZSByZW1haW5pbmcgYW1vdW50IGluIHRoZVxuICAvLyBidWZmZXIsIGFuZCB0aGUgRU9GIGhhcyBiZWVuIHNlZW4gYXQgdGhpcyBwb2ludCwgdGhlbiBtYWtlIHN1cmVcbiAgLy8gdGhhdCB3ZSBlbWl0ICdlbmQnIG9uIHRoZSB2ZXJ5IG5leHQgdGljay5cbiAgaWYgKHN0YXRlLmVuZGVkICYmICFzdGF0ZS5lbmRFbWl0dGVkICYmIHN0YXRlLmxlbmd0aCA9PT0gMClcbiAgICBlbmRSZWFkYWJsZSh0aGlzKTtcblxuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gY2h1bmtJbnZhbGlkKHN0YXRlLCBjaHVuaykge1xuICB2YXIgZXIgPSBudWxsO1xuICBpZiAoIUJ1ZmZlci5pc0J1ZmZlcihjaHVuaykgJiZcbiAgICAgICdzdHJpbmcnICE9PSB0eXBlb2YgY2h1bmsgJiZcbiAgICAgIGNodW5rICE9PSBudWxsICYmXG4gICAgICBjaHVuayAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAhc3RhdGUub2JqZWN0TW9kZSkge1xuICAgIGVyID0gbmV3IFR5cGVFcnJvcignSW52YWxpZCBub24tc3RyaW5nL2J1ZmZlciBjaHVuaycpO1xuICB9XG4gIHJldHVybiBlcjtcbn1cblxuXG5mdW5jdGlvbiBvbkVvZkNodW5rKHN0cmVhbSwgc3RhdGUpIHtcbiAgaWYgKHN0YXRlLmRlY29kZXIgJiYgIXN0YXRlLmVuZGVkKSB7XG4gICAgdmFyIGNodW5rID0gc3RhdGUuZGVjb2Rlci5lbmQoKTtcbiAgICBpZiAoY2h1bmsgJiYgY2h1bmsubGVuZ3RoKSB7XG4gICAgICBzdGF0ZS5idWZmZXIucHVzaChjaHVuayk7XG4gICAgICBzdGF0ZS5sZW5ndGggKz0gc3RhdGUub2JqZWN0TW9kZSA/IDEgOiBjaHVuay5sZW5ndGg7XG4gICAgfVxuICB9XG4gIHN0YXRlLmVuZGVkID0gdHJ1ZTtcblxuICAvLyBpZiB3ZSd2ZSBlbmRlZCBhbmQgd2UgaGF2ZSBzb21lIGRhdGEgbGVmdCwgdGhlbiBlbWl0XG4gIC8vICdyZWFkYWJsZScgbm93IHRvIG1ha2Ugc3VyZSBpdCBnZXRzIHBpY2tlZCB1cC5cbiAgaWYgKHN0YXRlLmxlbmd0aCA+IDApXG4gICAgZW1pdFJlYWRhYmxlKHN0cmVhbSk7XG4gIGVsc2VcbiAgICBlbmRSZWFkYWJsZShzdHJlYW0pO1xufVxuXG4vLyBEb24ndCBlbWl0IHJlYWRhYmxlIHJpZ2h0IGF3YXkgaW4gc3luYyBtb2RlLCBiZWNhdXNlIHRoaXMgY2FuIHRyaWdnZXJcbi8vIGFub3RoZXIgcmVhZCgpIGNhbGwgPT4gc3RhY2sgb3ZlcmZsb3cuICBUaGlzIHdheSwgaXQgbWlnaHQgdHJpZ2dlclxuLy8gYSBuZXh0VGljayByZWN1cnNpb24gd2FybmluZywgYnV0IHRoYXQncyBub3Qgc28gYmFkLlxuZnVuY3Rpb24gZW1pdFJlYWRhYmxlKHN0cmVhbSkge1xuICB2YXIgc3RhdGUgPSBzdHJlYW0uX3JlYWRhYmxlU3RhdGU7XG4gIHN0YXRlLm5lZWRSZWFkYWJsZSA9IGZhbHNlO1xuICBpZiAoc3RhdGUuZW1pdHRlZFJlYWRhYmxlKVxuICAgIHJldHVybjtcblxuICBzdGF0ZS5lbWl0dGVkUmVhZGFibGUgPSB0cnVlO1xuICBpZiAoc3RhdGUuc3luYylcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgZW1pdFJlYWRhYmxlXyhzdHJlYW0pO1xuICAgIH0pO1xuICBlbHNlXG4gICAgZW1pdFJlYWRhYmxlXyhzdHJlYW0pO1xufVxuXG5mdW5jdGlvbiBlbWl0UmVhZGFibGVfKHN0cmVhbSkge1xuICBzdHJlYW0uZW1pdCgncmVhZGFibGUnKTtcbn1cblxuXG4vLyBhdCB0aGlzIHBvaW50LCB0aGUgdXNlciBoYXMgcHJlc3VtYWJseSBzZWVuIHRoZSAncmVhZGFibGUnIGV2ZW50LFxuLy8gYW5kIGNhbGxlZCByZWFkKCkgdG8gY29uc3VtZSBzb21lIGRhdGEuICB0aGF0IG1heSBoYXZlIHRyaWdnZXJlZFxuLy8gaW4gdHVybiBhbm90aGVyIF9yZWFkKG4pIGNhbGwsIGluIHdoaWNoIGNhc2UgcmVhZGluZyA9IHRydWUgaWZcbi8vIGl0J3MgaW4gcHJvZ3Jlc3MuXG4vLyBIb3dldmVyLCBpZiB3ZSdyZSBub3QgZW5kZWQsIG9yIHJlYWRpbmcsIGFuZCB0aGUgbGVuZ3RoIDwgaHdtLFxuLy8gdGhlbiBnbyBhaGVhZCBhbmQgdHJ5IHRvIHJlYWQgc29tZSBtb3JlIHByZWVtcHRpdmVseS5cbmZ1bmN0aW9uIG1heWJlUmVhZE1vcmUoc3RyZWFtLCBzdGF0ZSkge1xuICBpZiAoIXN0YXRlLnJlYWRpbmdNb3JlKSB7XG4gICAgc3RhdGUucmVhZGluZ01vcmUgPSB0cnVlO1xuICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICBtYXliZVJlYWRNb3JlXyhzdHJlYW0sIHN0YXRlKTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBtYXliZVJlYWRNb3JlXyhzdHJlYW0sIHN0YXRlKSB7XG4gIHZhciBsZW4gPSBzdGF0ZS5sZW5ndGg7XG4gIHdoaWxlICghc3RhdGUucmVhZGluZyAmJiAhc3RhdGUuZmxvd2luZyAmJiAhc3RhdGUuZW5kZWQgJiZcbiAgICAgICAgIHN0YXRlLmxlbmd0aCA8IHN0YXRlLmhpZ2hXYXRlck1hcmspIHtcbiAgICBzdHJlYW0ucmVhZCgwKTtcbiAgICBpZiAobGVuID09PSBzdGF0ZS5sZW5ndGgpXG4gICAgICAvLyBkaWRuJ3QgZ2V0IGFueSBkYXRhLCBzdG9wIHNwaW5uaW5nLlxuICAgICAgYnJlYWs7XG4gICAgZWxzZVxuICAgICAgbGVuID0gc3RhdGUubGVuZ3RoO1xuICB9XG4gIHN0YXRlLnJlYWRpbmdNb3JlID0gZmFsc2U7XG59XG5cbi8vIGFic3RyYWN0IG1ldGhvZC4gIHRvIGJlIG92ZXJyaWRkZW4gaW4gc3BlY2lmaWMgaW1wbGVtZW50YXRpb24gY2xhc3Nlcy5cbi8vIGNhbGwgY2IoZXIsIGRhdGEpIHdoZXJlIGRhdGEgaXMgPD0gbiBpbiBsZW5ndGguXG4vLyBmb3IgdmlydHVhbCAobm9uLXN0cmluZywgbm9uLWJ1ZmZlcikgc3RyZWFtcywgXCJsZW5ndGhcIiBpcyBzb21ld2hhdFxuLy8gYXJiaXRyYXJ5LCBhbmQgcGVyaGFwcyBub3QgdmVyeSBtZWFuaW5nZnVsLlxuUmVhZGFibGUucHJvdG90eXBlLl9yZWFkID0gZnVuY3Rpb24obikge1xuICB0aGlzLmVtaXQoJ2Vycm9yJywgbmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKSk7XG59O1xuXG5SZWFkYWJsZS5wcm90b3R5cGUucGlwZSA9IGZ1bmN0aW9uKGRlc3QsIHBpcGVPcHRzKSB7XG4gIHZhciBzcmMgPSB0aGlzO1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuXG4gIHN3aXRjaCAoc3RhdGUucGlwZXNDb3VudCkge1xuICAgIGNhc2UgMDpcbiAgICAgIHN0YXRlLnBpcGVzID0gZGVzdDtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgMTpcbiAgICAgIHN0YXRlLnBpcGVzID0gW3N0YXRlLnBpcGVzLCBkZXN0XTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBzdGF0ZS5waXBlcy5wdXNoKGRlc3QpO1xuICAgICAgYnJlYWs7XG4gIH1cbiAgc3RhdGUucGlwZXNDb3VudCArPSAxO1xuXG4gIHZhciBkb0VuZCA9ICghcGlwZU9wdHMgfHwgcGlwZU9wdHMuZW5kICE9PSBmYWxzZSkgJiZcbiAgICAgICAgICAgICAgZGVzdCAhPT0gcHJvY2Vzcy5zdGRvdXQgJiZcbiAgICAgICAgICAgICAgZGVzdCAhPT0gcHJvY2Vzcy5zdGRlcnI7XG5cbiAgdmFyIGVuZEZuID0gZG9FbmQgPyBvbmVuZCA6IGNsZWFudXA7XG4gIGlmIChzdGF0ZS5lbmRFbWl0dGVkKVxuICAgIHByb2Nlc3MubmV4dFRpY2soZW5kRm4pO1xuICBlbHNlXG4gICAgc3JjLm9uY2UoJ2VuZCcsIGVuZEZuKTtcblxuICBkZXN0Lm9uKCd1bnBpcGUnLCBvbnVucGlwZSk7XG4gIGZ1bmN0aW9uIG9udW5waXBlKHJlYWRhYmxlKSB7XG4gICAgaWYgKHJlYWRhYmxlICE9PSBzcmMpIHJldHVybjtcbiAgICBjbGVhbnVwKCk7XG4gIH1cblxuICBmdW5jdGlvbiBvbmVuZCgpIHtcbiAgICBkZXN0LmVuZCgpO1xuICB9XG5cbiAgLy8gd2hlbiB0aGUgZGVzdCBkcmFpbnMsIGl0IHJlZHVjZXMgdGhlIGF3YWl0RHJhaW4gY291bnRlclxuICAvLyBvbiB0aGUgc291cmNlLiAgVGhpcyB3b3VsZCBiZSBtb3JlIGVsZWdhbnQgd2l0aCBhIC5vbmNlKClcbiAgLy8gaGFuZGxlciBpbiBmbG93KCksIGJ1dCBhZGRpbmcgYW5kIHJlbW92aW5nIHJlcGVhdGVkbHkgaXNcbiAgLy8gdG9vIHNsb3cuXG4gIHZhciBvbmRyYWluID0gcGlwZU9uRHJhaW4oc3JjKTtcbiAgZGVzdC5vbignZHJhaW4nLCBvbmRyYWluKTtcblxuICBmdW5jdGlvbiBjbGVhbnVwKCkge1xuICAgIC8vIGNsZWFudXAgZXZlbnQgaGFuZGxlcnMgb25jZSB0aGUgcGlwZSBpcyBicm9rZW5cbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdjbG9zZScsIG9uY2xvc2UpO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2ZpbmlzaCcsIG9uZmluaXNoKTtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdkcmFpbicsIG9uZHJhaW4pO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgb25lcnJvcik7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcigndW5waXBlJywgb251bnBpcGUpO1xuICAgIHNyYy5yZW1vdmVMaXN0ZW5lcignZW5kJywgb25lbmQpO1xuICAgIHNyYy5yZW1vdmVMaXN0ZW5lcignZW5kJywgY2xlYW51cCk7XG5cbiAgICAvLyBpZiB0aGUgcmVhZGVyIGlzIHdhaXRpbmcgZm9yIGEgZHJhaW4gZXZlbnQgZnJvbSB0aGlzXG4gICAgLy8gc3BlY2lmaWMgd3JpdGVyLCB0aGVuIGl0IHdvdWxkIGNhdXNlIGl0IHRvIG5ldmVyIHN0YXJ0XG4gICAgLy8gZmxvd2luZyBhZ2Fpbi5cbiAgICAvLyBTbywgaWYgdGhpcyBpcyBhd2FpdGluZyBhIGRyYWluLCB0aGVuIHdlIGp1c3QgY2FsbCBpdCBub3cuXG4gICAgLy8gSWYgd2UgZG9uJ3Qga25vdywgdGhlbiBhc3N1bWUgdGhhdCB3ZSBhcmUgd2FpdGluZyBmb3Igb25lLlxuICAgIGlmICghZGVzdC5fd3JpdGFibGVTdGF0ZSB8fCBkZXN0Ll93cml0YWJsZVN0YXRlLm5lZWREcmFpbilcbiAgICAgIG9uZHJhaW4oKTtcbiAgfVxuXG4gIC8vIGlmIHRoZSBkZXN0IGhhcyBhbiBlcnJvciwgdGhlbiBzdG9wIHBpcGluZyBpbnRvIGl0LlxuICAvLyBob3dldmVyLCBkb24ndCBzdXBwcmVzcyB0aGUgdGhyb3dpbmcgYmVoYXZpb3IgZm9yIHRoaXMuXG4gIGZ1bmN0aW9uIG9uZXJyb3IoZXIpIHtcbiAgICB1bnBpcGUoKTtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdlcnJvcicsIG9uZXJyb3IpO1xuICAgIGlmIChFRS5saXN0ZW5lckNvdW50KGRlc3QsICdlcnJvcicpID09PSAwKVxuICAgICAgZGVzdC5lbWl0KCdlcnJvcicsIGVyKTtcbiAgfVxuICAvLyBUaGlzIGlzIGEgYnJ1dGFsbHkgdWdseSBoYWNrIHRvIG1ha2Ugc3VyZSB0aGF0IG91ciBlcnJvciBoYW5kbGVyXG4gIC8vIGlzIGF0dGFjaGVkIGJlZm9yZSBhbnkgdXNlcmxhbmQgb25lcy4gIE5FVkVSIERPIFRISVMuXG4gIGlmICghZGVzdC5fZXZlbnRzIHx8ICFkZXN0Ll9ldmVudHMuZXJyb3IpXG4gICAgZGVzdC5vbignZXJyb3InLCBvbmVycm9yKTtcbiAgZWxzZSBpZiAoaXNBcnJheShkZXN0Ll9ldmVudHMuZXJyb3IpKVxuICAgIGRlc3QuX2V2ZW50cy5lcnJvci51bnNoaWZ0KG9uZXJyb3IpO1xuICBlbHNlXG4gICAgZGVzdC5fZXZlbnRzLmVycm9yID0gW29uZXJyb3IsIGRlc3QuX2V2ZW50cy5lcnJvcl07XG5cblxuXG4gIC8vIEJvdGggY2xvc2UgYW5kIGZpbmlzaCBzaG91bGQgdHJpZ2dlciB1bnBpcGUsIGJ1dCBvbmx5IG9uY2UuXG4gIGZ1bmN0aW9uIG9uY2xvc2UoKSB7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignZmluaXNoJywgb25maW5pc2gpO1xuICAgIHVucGlwZSgpO1xuICB9XG4gIGRlc3Qub25jZSgnY2xvc2UnLCBvbmNsb3NlKTtcbiAgZnVuY3Rpb24gb25maW5pc2goKSB7XG4gICAgZGVzdC5yZW1vdmVMaXN0ZW5lcignY2xvc2UnLCBvbmNsb3NlKTtcbiAgICB1bnBpcGUoKTtcbiAgfVxuICBkZXN0Lm9uY2UoJ2ZpbmlzaCcsIG9uZmluaXNoKTtcblxuICBmdW5jdGlvbiB1bnBpcGUoKSB7XG4gICAgc3JjLnVucGlwZShkZXN0KTtcbiAgfVxuXG4gIC8vIHRlbGwgdGhlIGRlc3QgdGhhdCBpdCdzIGJlaW5nIHBpcGVkIHRvXG4gIGRlc3QuZW1pdCgncGlwZScsIHNyYyk7XG5cbiAgLy8gc3RhcnQgdGhlIGZsb3cgaWYgaXQgaGFzbid0IGJlZW4gc3RhcnRlZCBhbHJlYWR5LlxuICBpZiAoIXN0YXRlLmZsb3dpbmcpIHtcbiAgICAvLyB0aGUgaGFuZGxlciB0aGF0IHdhaXRzIGZvciByZWFkYWJsZSBldmVudHMgYWZ0ZXIgYWxsXG4gICAgLy8gdGhlIGRhdGEgZ2V0cyBzdWNrZWQgb3V0IGluIGZsb3cuXG4gICAgLy8gVGhpcyB3b3VsZCBiZSBlYXNpZXIgdG8gZm9sbG93IHdpdGggYSAub25jZSgpIGhhbmRsZXJcbiAgICAvLyBpbiBmbG93KCksIGJ1dCB0aGF0IGlzIHRvbyBzbG93LlxuICAgIHRoaXMub24oJ3JlYWRhYmxlJywgcGlwZU9uUmVhZGFibGUpO1xuXG4gICAgc3RhdGUuZmxvd2luZyA9IHRydWU7XG4gICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIGZsb3coc3JjKTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBkZXN0O1xufTtcblxuZnVuY3Rpb24gcGlwZU9uRHJhaW4oc3JjKSB7XG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZGVzdCA9IHRoaXM7XG4gICAgdmFyIHN0YXRlID0gc3JjLl9yZWFkYWJsZVN0YXRlO1xuICAgIHN0YXRlLmF3YWl0RHJhaW4tLTtcbiAgICBpZiAoc3RhdGUuYXdhaXREcmFpbiA9PT0gMClcbiAgICAgIGZsb3coc3JjKTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZmxvdyhzcmMpIHtcbiAgdmFyIHN0YXRlID0gc3JjLl9yZWFkYWJsZVN0YXRlO1xuICB2YXIgY2h1bms7XG4gIHN0YXRlLmF3YWl0RHJhaW4gPSAwO1xuXG4gIGZ1bmN0aW9uIHdyaXRlKGRlc3QsIGksIGxpc3QpIHtcbiAgICB2YXIgd3JpdHRlbiA9IGRlc3Qud3JpdGUoY2h1bmspO1xuICAgIGlmIChmYWxzZSA9PT0gd3JpdHRlbikge1xuICAgICAgc3RhdGUuYXdhaXREcmFpbisrO1xuICAgIH1cbiAgfVxuXG4gIHdoaWxlIChzdGF0ZS5waXBlc0NvdW50ICYmIG51bGwgIT09IChjaHVuayA9IHNyYy5yZWFkKCkpKSB7XG5cbiAgICBpZiAoc3RhdGUucGlwZXNDb3VudCA9PT0gMSlcbiAgICAgIHdyaXRlKHN0YXRlLnBpcGVzLCAwLCBudWxsKTtcbiAgICBlbHNlXG4gICAgICBmb3JFYWNoKHN0YXRlLnBpcGVzLCB3cml0ZSk7XG5cbiAgICBzcmMuZW1pdCgnZGF0YScsIGNodW5rKTtcblxuICAgIC8vIGlmIGFueW9uZSBuZWVkcyBhIGRyYWluLCB0aGVuIHdlIGhhdmUgdG8gd2FpdCBmb3IgdGhhdC5cbiAgICBpZiAoc3RhdGUuYXdhaXREcmFpbiA+IDApXG4gICAgICByZXR1cm47XG4gIH1cblxuICAvLyBpZiBldmVyeSBkZXN0aW5hdGlvbiB3YXMgdW5waXBlZCwgZWl0aGVyIGJlZm9yZSBlbnRlcmluZyB0aGlzXG4gIC8vIGZ1bmN0aW9uLCBvciBpbiB0aGUgd2hpbGUgbG9vcCwgdGhlbiBzdG9wIGZsb3dpbmcuXG4gIC8vXG4gIC8vIE5COiBUaGlzIGlzIGEgcHJldHR5IHJhcmUgZWRnZSBjYXNlLlxuICBpZiAoc3RhdGUucGlwZXNDb3VudCA9PT0gMCkge1xuICAgIHN0YXRlLmZsb3dpbmcgPSBmYWxzZTtcblxuICAgIC8vIGlmIHRoZXJlIHdlcmUgZGF0YSBldmVudCBsaXN0ZW5lcnMgYWRkZWQsIHRoZW4gc3dpdGNoIHRvIG9sZCBtb2RlLlxuICAgIGlmIChFRS5saXN0ZW5lckNvdW50KHNyYywgJ2RhdGEnKSA+IDApXG4gICAgICBlbWl0RGF0YUV2ZW50cyhzcmMpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIGF0IHRoaXMgcG9pbnQsIG5vIG9uZSBuZWVkZWQgYSBkcmFpbiwgc28gd2UganVzdCByYW4gb3V0IG9mIGRhdGFcbiAgLy8gb24gdGhlIG5leHQgcmVhZGFibGUgZXZlbnQsIHN0YXJ0IGl0IG92ZXIgYWdhaW4uXG4gIHN0YXRlLnJhbk91dCA9IHRydWU7XG59XG5cbmZ1bmN0aW9uIHBpcGVPblJlYWRhYmxlKCkge1xuICBpZiAodGhpcy5fcmVhZGFibGVTdGF0ZS5yYW5PdXQpIHtcbiAgICB0aGlzLl9yZWFkYWJsZVN0YXRlLnJhbk91dCA9IGZhbHNlO1xuICAgIGZsb3codGhpcyk7XG4gIH1cbn1cblxuXG5SZWFkYWJsZS5wcm90b3R5cGUudW5waXBlID0gZnVuY3Rpb24oZGVzdCkge1xuICB2YXIgc3RhdGUgPSB0aGlzLl9yZWFkYWJsZVN0YXRlO1xuXG4gIC8vIGlmIHdlJ3JlIG5vdCBwaXBpbmcgYW55d2hlcmUsIHRoZW4gZG8gbm90aGluZy5cbiAgaWYgKHN0YXRlLnBpcGVzQ291bnQgPT09IDApXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8ganVzdCBvbmUgZGVzdGluYXRpb24uICBtb3N0IGNvbW1vbiBjYXNlLlxuICBpZiAoc3RhdGUucGlwZXNDb3VudCA9PT0gMSkge1xuICAgIC8vIHBhc3NlZCBpbiBvbmUsIGJ1dCBpdCdzIG5vdCB0aGUgcmlnaHQgb25lLlxuICAgIGlmIChkZXN0ICYmIGRlc3QgIT09IHN0YXRlLnBpcGVzKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAoIWRlc3QpXG4gICAgICBkZXN0ID0gc3RhdGUucGlwZXM7XG5cbiAgICAvLyBnb3QgYSBtYXRjaC5cbiAgICBzdGF0ZS5waXBlcyA9IG51bGw7XG4gICAgc3RhdGUucGlwZXNDb3VudCA9IDA7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcigncmVhZGFibGUnLCBwaXBlT25SZWFkYWJsZSk7XG4gICAgc3RhdGUuZmxvd2luZyA9IGZhbHNlO1xuICAgIGlmIChkZXN0KVxuICAgICAgZGVzdC5lbWl0KCd1bnBpcGUnLCB0aGlzKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHNsb3cgY2FzZS4gbXVsdGlwbGUgcGlwZSBkZXN0aW5hdGlvbnMuXG5cbiAgaWYgKCFkZXN0KSB7XG4gICAgLy8gcmVtb3ZlIGFsbC5cbiAgICB2YXIgZGVzdHMgPSBzdGF0ZS5waXBlcztcbiAgICB2YXIgbGVuID0gc3RhdGUucGlwZXNDb3VudDtcbiAgICBzdGF0ZS5waXBlcyA9IG51bGw7XG4gICAgc3RhdGUucGlwZXNDb3VudCA9IDA7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcigncmVhZGFibGUnLCBwaXBlT25SZWFkYWJsZSk7XG4gICAgc3RhdGUuZmxvd2luZyA9IGZhbHNlO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGRlc3RzW2ldLmVtaXQoJ3VucGlwZScsIHRoaXMpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gdHJ5IHRvIGZpbmQgdGhlIHJpZ2h0IG9uZS5cbiAgdmFyIGkgPSBpbmRleE9mKHN0YXRlLnBpcGVzLCBkZXN0KTtcbiAgaWYgKGkgPT09IC0xKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIHN0YXRlLnBpcGVzLnNwbGljZShpLCAxKTtcbiAgc3RhdGUucGlwZXNDb3VudCAtPSAxO1xuICBpZiAoc3RhdGUucGlwZXNDb3VudCA9PT0gMSlcbiAgICBzdGF0ZS5waXBlcyA9IHN0YXRlLnBpcGVzWzBdO1xuXG4gIGRlc3QuZW1pdCgndW5waXBlJywgdGhpcyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBzZXQgdXAgZGF0YSBldmVudHMgaWYgdGhleSBhcmUgYXNrZWQgZm9yXG4vLyBFbnN1cmUgcmVhZGFibGUgbGlzdGVuZXJzIGV2ZW50dWFsbHkgZ2V0IHNvbWV0aGluZ1xuUmVhZGFibGUucHJvdG90eXBlLm9uID0gZnVuY3Rpb24oZXYsIGZuKSB7XG4gIHZhciByZXMgPSBTdHJlYW0ucHJvdG90eXBlLm9uLmNhbGwodGhpcywgZXYsIGZuKTtcblxuICBpZiAoZXYgPT09ICdkYXRhJyAmJiAhdGhpcy5fcmVhZGFibGVTdGF0ZS5mbG93aW5nKVxuICAgIGVtaXREYXRhRXZlbnRzKHRoaXMpO1xuXG4gIGlmIChldiA9PT0gJ3JlYWRhYmxlJyAmJiB0aGlzLnJlYWRhYmxlKSB7XG4gICAgdmFyIHN0YXRlID0gdGhpcy5fcmVhZGFibGVTdGF0ZTtcbiAgICBpZiAoIXN0YXRlLnJlYWRhYmxlTGlzdGVuaW5nKSB7XG4gICAgICBzdGF0ZS5yZWFkYWJsZUxpc3RlbmluZyA9IHRydWU7XG4gICAgICBzdGF0ZS5lbWl0dGVkUmVhZGFibGUgPSBmYWxzZTtcbiAgICAgIHN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG4gICAgICBpZiAoIXN0YXRlLnJlYWRpbmcpIHtcbiAgICAgICAgdGhpcy5yZWFkKDApO1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZS5sZW5ndGgpIHtcbiAgICAgICAgZW1pdFJlYWRhYmxlKHRoaXMsIHN0YXRlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzO1xufTtcblJlYWRhYmxlLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IFJlYWRhYmxlLnByb3RvdHlwZS5vbjtcblxuLy8gcGF1c2UoKSBhbmQgcmVzdW1lKCkgYXJlIHJlbW5hbnRzIG9mIHRoZSBsZWdhY3kgcmVhZGFibGUgc3RyZWFtIEFQSVxuLy8gSWYgdGhlIHVzZXIgdXNlcyB0aGVtLCB0aGVuIHN3aXRjaCBpbnRvIG9sZCBtb2RlLlxuUmVhZGFibGUucHJvdG90eXBlLnJlc3VtZSA9IGZ1bmN0aW9uKCkge1xuICBlbWl0RGF0YUV2ZW50cyh0aGlzKTtcbiAgdGhpcy5yZWFkKDApO1xuICB0aGlzLmVtaXQoJ3Jlc3VtZScpO1xufTtcblxuUmVhZGFibGUucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gIGVtaXREYXRhRXZlbnRzKHRoaXMsIHRydWUpO1xuICB0aGlzLmVtaXQoJ3BhdXNlJyk7XG59O1xuXG5mdW5jdGlvbiBlbWl0RGF0YUV2ZW50cyhzdHJlYW0sIHN0YXJ0UGF1c2VkKSB7XG4gIHZhciBzdGF0ZSA9IHN0cmVhbS5fcmVhZGFibGVTdGF0ZTtcblxuICBpZiAoc3RhdGUuZmxvd2luZykge1xuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9pc2FhY3MvcmVhZGFibGUtc3RyZWFtL2lzc3Vlcy8xNlxuICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IHN3aXRjaCB0byBvbGQgbW9kZSBub3cuJyk7XG4gIH1cblxuICB2YXIgcGF1c2VkID0gc3RhcnRQYXVzZWQgfHwgZmFsc2U7XG4gIHZhciByZWFkYWJsZSA9IGZhbHNlO1xuXG4gIC8vIGNvbnZlcnQgdG8gYW4gb2xkLXN0eWxlIHN0cmVhbS5cbiAgc3RyZWFtLnJlYWRhYmxlID0gdHJ1ZTtcbiAgc3RyZWFtLnBpcGUgPSBTdHJlYW0ucHJvdG90eXBlLnBpcGU7XG4gIHN0cmVhbS5vbiA9IHN0cmVhbS5hZGRMaXN0ZW5lciA9IFN0cmVhbS5wcm90b3R5cGUub247XG5cbiAgc3RyZWFtLm9uKCdyZWFkYWJsZScsIGZ1bmN0aW9uKCkge1xuICAgIHJlYWRhYmxlID0gdHJ1ZTtcblxuICAgIHZhciBjO1xuICAgIHdoaWxlICghcGF1c2VkICYmIChudWxsICE9PSAoYyA9IHN0cmVhbS5yZWFkKCkpKSlcbiAgICAgIHN0cmVhbS5lbWl0KCdkYXRhJywgYyk7XG5cbiAgICBpZiAoYyA9PT0gbnVsbCkge1xuICAgICAgcmVhZGFibGUgPSBmYWxzZTtcbiAgICAgIHN0cmVhbS5fcmVhZGFibGVTdGF0ZS5uZWVkUmVhZGFibGUgPSB0cnVlO1xuICAgIH1cbiAgfSk7XG5cbiAgc3RyZWFtLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gICAgcGF1c2VkID0gdHJ1ZTtcbiAgICB0aGlzLmVtaXQoJ3BhdXNlJyk7XG4gIH07XG5cbiAgc3RyZWFtLnJlc3VtZSA9IGZ1bmN0aW9uKCkge1xuICAgIHBhdXNlZCA9IGZhbHNlO1xuICAgIGlmIChyZWFkYWJsZSlcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0cmVhbS5lbWl0KCdyZWFkYWJsZScpO1xuICAgICAgfSk7XG4gICAgZWxzZVxuICAgICAgdGhpcy5yZWFkKDApO1xuICAgIHRoaXMuZW1pdCgncmVzdW1lJyk7XG4gIH07XG5cbiAgLy8gbm93IG1ha2UgaXQgc3RhcnQsIGp1c3QgaW4gY2FzZSBpdCBoYWRuJ3QgYWxyZWFkeS5cbiAgc3RyZWFtLmVtaXQoJ3JlYWRhYmxlJyk7XG59XG5cbi8vIHdyYXAgYW4gb2xkLXN0eWxlIHN0cmVhbSBhcyB0aGUgYXN5bmMgZGF0YSBzb3VyY2UuXG4vLyBUaGlzIGlzICpub3QqIHBhcnQgb2YgdGhlIHJlYWRhYmxlIHN0cmVhbSBpbnRlcmZhY2UuXG4vLyBJdCBpcyBhbiB1Z2x5IHVuZm9ydHVuYXRlIG1lc3Mgb2YgaGlzdG9yeS5cblJlYWRhYmxlLnByb3RvdHlwZS53cmFwID0gZnVuY3Rpb24oc3RyZWFtKSB7XG4gIHZhciBzdGF0ZSA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG4gIHZhciBwYXVzZWQgPSBmYWxzZTtcblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHN0cmVhbS5vbignZW5kJywgZnVuY3Rpb24oKSB7XG4gICAgaWYgKHN0YXRlLmRlY29kZXIgJiYgIXN0YXRlLmVuZGVkKSB7XG4gICAgICB2YXIgY2h1bmsgPSBzdGF0ZS5kZWNvZGVyLmVuZCgpO1xuICAgICAgaWYgKGNodW5rICYmIGNodW5rLmxlbmd0aClcbiAgICAgICAgc2VsZi5wdXNoKGNodW5rKTtcbiAgICB9XG5cbiAgICBzZWxmLnB1c2gobnVsbCk7XG4gIH0pO1xuXG4gIHN0cmVhbS5vbignZGF0YScsIGZ1bmN0aW9uKGNodW5rKSB7XG4gICAgaWYgKHN0YXRlLmRlY29kZXIpXG4gICAgICBjaHVuayA9IHN0YXRlLmRlY29kZXIud3JpdGUoY2h1bmspO1xuXG4gICAgLy8gZG9uJ3Qgc2tpcCBvdmVyIGZhbHN5IHZhbHVlcyBpbiBvYmplY3RNb2RlXG4gICAgLy9pZiAoc3RhdGUub2JqZWN0TW9kZSAmJiB1dGlsLmlzTnVsbE9yVW5kZWZpbmVkKGNodW5rKSlcbiAgICBpZiAoc3RhdGUub2JqZWN0TW9kZSAmJiAoY2h1bmsgPT09IG51bGwgfHwgY2h1bmsgPT09IHVuZGVmaW5lZCkpXG4gICAgICByZXR1cm47XG4gICAgZWxzZSBpZiAoIXN0YXRlLm9iamVjdE1vZGUgJiYgKCFjaHVuayB8fCAhY2h1bmsubGVuZ3RoKSlcbiAgICAgIHJldHVybjtcblxuICAgIHZhciByZXQgPSBzZWxmLnB1c2goY2h1bmspO1xuICAgIGlmICghcmV0KSB7XG4gICAgICBwYXVzZWQgPSB0cnVlO1xuICAgICAgc3RyZWFtLnBhdXNlKCk7XG4gICAgfVxuICB9KTtcblxuICAvLyBwcm94eSBhbGwgdGhlIG90aGVyIG1ldGhvZHMuXG4gIC8vIGltcG9ydGFudCB3aGVuIHdyYXBwaW5nIGZpbHRlcnMgYW5kIGR1cGxleGVzLlxuICBmb3IgKHZhciBpIGluIHN0cmVhbSkge1xuICAgIGlmICh0eXBlb2Ygc3RyZWFtW2ldID09PSAnZnVuY3Rpb24nICYmXG4gICAgICAgIHR5cGVvZiB0aGlzW2ldID09PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpc1tpXSA9IGZ1bmN0aW9uKG1ldGhvZCkgeyByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBzdHJlYW1bbWV0aG9kXS5hcHBseShzdHJlYW0sIGFyZ3VtZW50cyk7XG4gICAgICB9fShpKTtcbiAgICB9XG4gIH1cblxuICAvLyBwcm94eSBjZXJ0YWluIGltcG9ydGFudCBldmVudHMuXG4gIHZhciBldmVudHMgPSBbJ2Vycm9yJywgJ2Nsb3NlJywgJ2Rlc3Ryb3knLCAncGF1c2UnLCAncmVzdW1lJ107XG4gIGZvckVhY2goZXZlbnRzLCBmdW5jdGlvbihldikge1xuICAgIHN0cmVhbS5vbihldiwgc2VsZi5lbWl0LmJpbmQoc2VsZiwgZXYpKTtcbiAgfSk7XG5cbiAgLy8gd2hlbiB3ZSB0cnkgdG8gY29uc3VtZSBzb21lIG1vcmUgYnl0ZXMsIHNpbXBseSB1bnBhdXNlIHRoZVxuICAvLyB1bmRlcmx5aW5nIHN0cmVhbS5cbiAgc2VsZi5fcmVhZCA9IGZ1bmN0aW9uKG4pIHtcbiAgICBpZiAocGF1c2VkKSB7XG4gICAgICBwYXVzZWQgPSBmYWxzZTtcbiAgICAgIHN0cmVhbS5yZXN1bWUoKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIHNlbGY7XG59O1xuXG5cblxuLy8gZXhwb3NlZCBmb3IgdGVzdGluZyBwdXJwb3NlcyBvbmx5LlxuUmVhZGFibGUuX2Zyb21MaXN0ID0gZnJvbUxpc3Q7XG5cbi8vIFBsdWNrIG9mZiBuIGJ5dGVzIGZyb20gYW4gYXJyYXkgb2YgYnVmZmVycy5cbi8vIExlbmd0aCBpcyB0aGUgY29tYmluZWQgbGVuZ3RocyBvZiBhbGwgdGhlIGJ1ZmZlcnMgaW4gdGhlIGxpc3QuXG5mdW5jdGlvbiBmcm9tTGlzdChuLCBzdGF0ZSkge1xuICB2YXIgbGlzdCA9IHN0YXRlLmJ1ZmZlcjtcbiAgdmFyIGxlbmd0aCA9IHN0YXRlLmxlbmd0aDtcbiAgdmFyIHN0cmluZ01vZGUgPSAhIXN0YXRlLmRlY29kZXI7XG4gIHZhciBvYmplY3RNb2RlID0gISFzdGF0ZS5vYmplY3RNb2RlO1xuICB2YXIgcmV0O1xuXG4gIC8vIG5vdGhpbmcgaW4gdGhlIGxpc3QsIGRlZmluaXRlbHkgZW1wdHkuXG4gIGlmIChsaXN0Lmxlbmd0aCA9PT0gMClcbiAgICByZXR1cm4gbnVsbDtcblxuICBpZiAobGVuZ3RoID09PSAwKVxuICAgIHJldCA9IG51bGw7XG4gIGVsc2UgaWYgKG9iamVjdE1vZGUpXG4gICAgcmV0ID0gbGlzdC5zaGlmdCgpO1xuICBlbHNlIGlmICghbiB8fCBuID49IGxlbmd0aCkge1xuICAgIC8vIHJlYWQgaXQgYWxsLCB0cnVuY2F0ZSB0aGUgYXJyYXkuXG4gICAgaWYgKHN0cmluZ01vZGUpXG4gICAgICByZXQgPSBsaXN0LmpvaW4oJycpO1xuICAgIGVsc2VcbiAgICAgIHJldCA9IEJ1ZmZlci5jb25jYXQobGlzdCwgbGVuZ3RoKTtcbiAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gIH0gZWxzZSB7XG4gICAgLy8gcmVhZCBqdXN0IHNvbWUgb2YgaXQuXG4gICAgaWYgKG4gPCBsaXN0WzBdLmxlbmd0aCkge1xuICAgICAgLy8ganVzdCB0YWtlIGEgcGFydCBvZiB0aGUgZmlyc3QgbGlzdCBpdGVtLlxuICAgICAgLy8gc2xpY2UgaXMgdGhlIHNhbWUgZm9yIGJ1ZmZlcnMgYW5kIHN0cmluZ3MuXG4gICAgICB2YXIgYnVmID0gbGlzdFswXTtcbiAgICAgIHJldCA9IGJ1Zi5zbGljZSgwLCBuKTtcbiAgICAgIGxpc3RbMF0gPSBidWYuc2xpY2Uobik7XG4gICAgfSBlbHNlIGlmIChuID09PSBsaXN0WzBdLmxlbmd0aCkge1xuICAgICAgLy8gZmlyc3QgbGlzdCBpcyBhIHBlcmZlY3QgbWF0Y2hcbiAgICAgIHJldCA9IGxpc3Quc2hpZnQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gY29tcGxleCBjYXNlLlxuICAgICAgLy8gd2UgaGF2ZSBlbm91Z2ggdG8gY292ZXIgaXQsIGJ1dCBpdCBzcGFucyBwYXN0IHRoZSBmaXJzdCBidWZmZXIuXG4gICAgICBpZiAoc3RyaW5nTW9kZSlcbiAgICAgICAgcmV0ID0gJyc7XG4gICAgICBlbHNlXG4gICAgICAgIHJldCA9IG5ldyBCdWZmZXIobik7XG5cbiAgICAgIHZhciBjID0gMDtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gbGlzdC5sZW5ndGg7IGkgPCBsICYmIGMgPCBuOyBpKyspIHtcbiAgICAgICAgdmFyIGJ1ZiA9IGxpc3RbMF07XG4gICAgICAgIHZhciBjcHkgPSBNYXRoLm1pbihuIC0gYywgYnVmLmxlbmd0aCk7XG5cbiAgICAgICAgaWYgKHN0cmluZ01vZGUpXG4gICAgICAgICAgcmV0ICs9IGJ1Zi5zbGljZSgwLCBjcHkpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgYnVmLmNvcHkocmV0LCBjLCAwLCBjcHkpO1xuXG4gICAgICAgIGlmIChjcHkgPCBidWYubGVuZ3RoKVxuICAgICAgICAgIGxpc3RbMF0gPSBidWYuc2xpY2UoY3B5KTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGxpc3Quc2hpZnQoKTtcblxuICAgICAgICBjICs9IGNweTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmV0O1xufVxuXG5mdW5jdGlvbiBlbmRSZWFkYWJsZShzdHJlYW0pIHtcbiAgdmFyIHN0YXRlID0gc3RyZWFtLl9yZWFkYWJsZVN0YXRlO1xuXG4gIC8vIElmIHdlIGdldCBoZXJlIGJlZm9yZSBjb25zdW1pbmcgYWxsIHRoZSBieXRlcywgdGhlbiB0aGF0IGlzIGFcbiAgLy8gYnVnIGluIG5vZGUuICBTaG91bGQgbmV2ZXIgaGFwcGVuLlxuICBpZiAoc3RhdGUubGVuZ3RoID4gMClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2VuZFJlYWRhYmxlIGNhbGxlZCBvbiBub24tZW1wdHkgc3RyZWFtJyk7XG5cbiAgaWYgKCFzdGF0ZS5lbmRFbWl0dGVkICYmIHN0YXRlLmNhbGxlZFJlYWQpIHtcbiAgICBzdGF0ZS5lbmRlZCA9IHRydWU7XG4gICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcbiAgICAgIC8vIENoZWNrIHRoYXQgd2UgZGlkbid0IGdldCBvbmUgbGFzdCB1bnNoaWZ0LlxuICAgICAgaWYgKCFzdGF0ZS5lbmRFbWl0dGVkICYmIHN0YXRlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBzdGF0ZS5lbmRFbWl0dGVkID0gdHJ1ZTtcbiAgICAgICAgc3RyZWFtLnJlYWRhYmxlID0gZmFsc2U7XG4gICAgICAgIHN0cmVhbS5lbWl0KCdlbmQnKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBmb3JFYWNoICh4cywgZikge1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHhzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGYoeHNbaV0sIGkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGluZGV4T2YgKHhzLCB4KSB7XG4gIGZvciAodmFyIGkgPSAwLCBsID0geHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgaWYgKHhzW2ldID09PSB4KSByZXR1cm4gaTtcbiAgfVxuICByZXR1cm4gLTE7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiRldhQVNIXCIpKSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5cbi8vIGEgdHJhbnNmb3JtIHN0cmVhbSBpcyBhIHJlYWRhYmxlL3dyaXRhYmxlIHN0cmVhbSB3aGVyZSB5b3UgZG9cbi8vIHNvbWV0aGluZyB3aXRoIHRoZSBkYXRhLiAgU29tZXRpbWVzIGl0J3MgY2FsbGVkIGEgXCJmaWx0ZXJcIixcbi8vIGJ1dCB0aGF0J3Mgbm90IGEgZ3JlYXQgbmFtZSBmb3IgaXQsIHNpbmNlIHRoYXQgaW1wbGllcyBhIHRoaW5nIHdoZXJlXG4vLyBzb21lIGJpdHMgcGFzcyB0aHJvdWdoLCBhbmQgb3RoZXJzIGFyZSBzaW1wbHkgaWdub3JlZC4gIChUaGF0IHdvdWxkXG4vLyBiZSBhIHZhbGlkIGV4YW1wbGUgb2YgYSB0cmFuc2Zvcm0sIG9mIGNvdXJzZS4pXG4vL1xuLy8gV2hpbGUgdGhlIG91dHB1dCBpcyBjYXVzYWxseSByZWxhdGVkIHRvIHRoZSBpbnB1dCwgaXQncyBub3QgYVxuLy8gbmVjZXNzYXJpbHkgc3ltbWV0cmljIG9yIHN5bmNocm9ub3VzIHRyYW5zZm9ybWF0aW9uLiAgRm9yIGV4YW1wbGUsXG4vLyBhIHpsaWIgc3RyZWFtIG1pZ2h0IHRha2UgbXVsdGlwbGUgcGxhaW4tdGV4dCB3cml0ZXMoKSwgYW5kIHRoZW5cbi8vIGVtaXQgYSBzaW5nbGUgY29tcHJlc3NlZCBjaHVuayBzb21lIHRpbWUgaW4gdGhlIGZ1dHVyZS5cbi8vXG4vLyBIZXJlJ3MgaG93IHRoaXMgd29ya3M6XG4vL1xuLy8gVGhlIFRyYW5zZm9ybSBzdHJlYW0gaGFzIGFsbCB0aGUgYXNwZWN0cyBvZiB0aGUgcmVhZGFibGUgYW5kIHdyaXRhYmxlXG4vLyBzdHJlYW0gY2xhc3Nlcy4gIFdoZW4geW91IHdyaXRlKGNodW5rKSwgdGhhdCBjYWxscyBfd3JpdGUoY2h1bmssY2IpXG4vLyBpbnRlcm5hbGx5LCBhbmQgcmV0dXJucyBmYWxzZSBpZiB0aGVyZSdzIGEgbG90IG9mIHBlbmRpbmcgd3JpdGVzXG4vLyBidWZmZXJlZCB1cC4gIFdoZW4geW91IGNhbGwgcmVhZCgpLCB0aGF0IGNhbGxzIF9yZWFkKG4pIHVudGlsXG4vLyB0aGVyZSdzIGVub3VnaCBwZW5kaW5nIHJlYWRhYmxlIGRhdGEgYnVmZmVyZWQgdXAuXG4vL1xuLy8gSW4gYSB0cmFuc2Zvcm0gc3RyZWFtLCB0aGUgd3JpdHRlbiBkYXRhIGlzIHBsYWNlZCBpbiBhIGJ1ZmZlci4gIFdoZW5cbi8vIF9yZWFkKG4pIGlzIGNhbGxlZCwgaXQgdHJhbnNmb3JtcyB0aGUgcXVldWVkIHVwIGRhdGEsIGNhbGxpbmcgdGhlXG4vLyBidWZmZXJlZCBfd3JpdGUgY2IncyBhcyBpdCBjb25zdW1lcyBjaHVua3MuICBJZiBjb25zdW1pbmcgYSBzaW5nbGVcbi8vIHdyaXR0ZW4gY2h1bmsgd291bGQgcmVzdWx0IGluIG11bHRpcGxlIG91dHB1dCBjaHVua3MsIHRoZW4gdGhlIGZpcnN0XG4vLyBvdXRwdXR0ZWQgYml0IGNhbGxzIHRoZSByZWFkY2IsIGFuZCBzdWJzZXF1ZW50IGNodW5rcyBqdXN0IGdvIGludG9cbi8vIHRoZSByZWFkIGJ1ZmZlciwgYW5kIHdpbGwgY2F1c2UgaXQgdG8gZW1pdCAncmVhZGFibGUnIGlmIG5lY2Vzc2FyeS5cbi8vXG4vLyBUaGlzIHdheSwgYmFjay1wcmVzc3VyZSBpcyBhY3R1YWxseSBkZXRlcm1pbmVkIGJ5IHRoZSByZWFkaW5nIHNpZGUsXG4vLyBzaW5jZSBfcmVhZCBoYXMgdG8gYmUgY2FsbGVkIHRvIHN0YXJ0IHByb2Nlc3NpbmcgYSBuZXcgY2h1bmsuICBIb3dldmVyLFxuLy8gYSBwYXRob2xvZ2ljYWwgaW5mbGF0ZSB0eXBlIG9mIHRyYW5zZm9ybSBjYW4gY2F1c2UgZXhjZXNzaXZlIGJ1ZmZlcmluZ1xuLy8gaGVyZS4gIEZvciBleGFtcGxlLCBpbWFnaW5lIGEgc3RyZWFtIHdoZXJlIGV2ZXJ5IGJ5dGUgb2YgaW5wdXQgaXNcbi8vIGludGVycHJldGVkIGFzIGFuIGludGVnZXIgZnJvbSAwLTI1NSwgYW5kIHRoZW4gcmVzdWx0cyBpbiB0aGF0IG1hbnlcbi8vIGJ5dGVzIG9mIG91dHB1dC4gIFdyaXRpbmcgdGhlIDQgYnl0ZXMge2ZmLGZmLGZmLGZmfSB3b3VsZCByZXN1bHQgaW5cbi8vIDFrYiBvZiBkYXRhIGJlaW5nIG91dHB1dC4gIEluIHRoaXMgY2FzZSwgeW91IGNvdWxkIHdyaXRlIGEgdmVyeSBzbWFsbFxuLy8gYW1vdW50IG9mIGlucHV0LCBhbmQgZW5kIHVwIHdpdGggYSB2ZXJ5IGxhcmdlIGFtb3VudCBvZiBvdXRwdXQuICBJblxuLy8gc3VjaCBhIHBhdGhvbG9naWNhbCBpbmZsYXRpbmcgbWVjaGFuaXNtLCB0aGVyZSdkIGJlIG5vIHdheSB0byB0ZWxsXG4vLyB0aGUgc3lzdGVtIHRvIHN0b3AgZG9pbmcgdGhlIHRyYW5zZm9ybS4gIEEgc2luZ2xlIDRNQiB3cml0ZSBjb3VsZFxuLy8gY2F1c2UgdGhlIHN5c3RlbSB0byBydW4gb3V0IG9mIG1lbW9yeS5cbi8vXG4vLyBIb3dldmVyLCBldmVuIGluIHN1Y2ggYSBwYXRob2xvZ2ljYWwgY2FzZSwgb25seSBhIHNpbmdsZSB3cml0dGVuIGNodW5rXG4vLyB3b3VsZCBiZSBjb25zdW1lZCwgYW5kIHRoZW4gdGhlIHJlc3Qgd291bGQgd2FpdCAodW4tdHJhbnNmb3JtZWQpIHVudGlsXG4vLyB0aGUgcmVzdWx0cyBvZiB0aGUgcHJldmlvdXMgdHJhbnNmb3JtZWQgY2h1bmsgd2VyZSBjb25zdW1lZC5cblxubW9kdWxlLmV4cG9ydHMgPSBUcmFuc2Zvcm07XG5cbnZhciBEdXBsZXggPSByZXF1aXJlKCcuL19zdHJlYW1fZHVwbGV4Jyk7XG5cbi8qPHJlcGxhY2VtZW50PiovXG52YXIgdXRpbCA9IHJlcXVpcmUoJ2NvcmUtdXRpbC1pcycpO1xudXRpbC5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG4vKjwvcmVwbGFjZW1lbnQ+Ki9cblxudXRpbC5pbmhlcml0cyhUcmFuc2Zvcm0sIER1cGxleCk7XG5cblxuZnVuY3Rpb24gVHJhbnNmb3JtU3RhdGUob3B0aW9ucywgc3RyZWFtKSB7XG4gIHRoaXMuYWZ0ZXJUcmFuc2Zvcm0gPSBmdW5jdGlvbihlciwgZGF0YSkge1xuICAgIHJldHVybiBhZnRlclRyYW5zZm9ybShzdHJlYW0sIGVyLCBkYXRhKTtcbiAgfTtcblxuICB0aGlzLm5lZWRUcmFuc2Zvcm0gPSBmYWxzZTtcbiAgdGhpcy50cmFuc2Zvcm1pbmcgPSBmYWxzZTtcbiAgdGhpcy53cml0ZWNiID0gbnVsbDtcbiAgdGhpcy53cml0ZWNodW5rID0gbnVsbDtcbn1cblxuZnVuY3Rpb24gYWZ0ZXJUcmFuc2Zvcm0oc3RyZWFtLCBlciwgZGF0YSkge1xuICB2YXIgdHMgPSBzdHJlYW0uX3RyYW5zZm9ybVN0YXRlO1xuICB0cy50cmFuc2Zvcm1pbmcgPSBmYWxzZTtcblxuICB2YXIgY2IgPSB0cy53cml0ZWNiO1xuXG4gIGlmICghY2IpXG4gICAgcmV0dXJuIHN0cmVhbS5lbWl0KCdlcnJvcicsIG5ldyBFcnJvcignbm8gd3JpdGVjYiBpbiBUcmFuc2Zvcm0gY2xhc3MnKSk7XG5cbiAgdHMud3JpdGVjaHVuayA9IG51bGw7XG4gIHRzLndyaXRlY2IgPSBudWxsO1xuXG4gIGlmIChkYXRhICE9PSBudWxsICYmIGRhdGEgIT09IHVuZGVmaW5lZClcbiAgICBzdHJlYW0ucHVzaChkYXRhKTtcblxuICBpZiAoY2IpXG4gICAgY2IoZXIpO1xuXG4gIHZhciBycyA9IHN0cmVhbS5fcmVhZGFibGVTdGF0ZTtcbiAgcnMucmVhZGluZyA9IGZhbHNlO1xuICBpZiAocnMubmVlZFJlYWRhYmxlIHx8IHJzLmxlbmd0aCA8IHJzLmhpZ2hXYXRlck1hcmspIHtcbiAgICBzdHJlYW0uX3JlYWQocnMuaGlnaFdhdGVyTWFyayk7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBUcmFuc2Zvcm0ob3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgVHJhbnNmb3JtKSlcbiAgICByZXR1cm4gbmV3IFRyYW5zZm9ybShvcHRpb25zKTtcblxuICBEdXBsZXguY2FsbCh0aGlzLCBvcHRpb25zKTtcblxuICB2YXIgdHMgPSB0aGlzLl90cmFuc2Zvcm1TdGF0ZSA9IG5ldyBUcmFuc2Zvcm1TdGF0ZShvcHRpb25zLCB0aGlzKTtcblxuICAvLyB3aGVuIHRoZSB3cml0YWJsZSBzaWRlIGZpbmlzaGVzLCB0aGVuIGZsdXNoIG91dCBhbnl0aGluZyByZW1haW5pbmcuXG4gIHZhciBzdHJlYW0gPSB0aGlzO1xuXG4gIC8vIHN0YXJ0IG91dCBhc2tpbmcgZm9yIGEgcmVhZGFibGUgZXZlbnQgb25jZSBkYXRhIGlzIHRyYW5zZm9ybWVkLlxuICB0aGlzLl9yZWFkYWJsZVN0YXRlLm5lZWRSZWFkYWJsZSA9IHRydWU7XG5cbiAgLy8gd2UgaGF2ZSBpbXBsZW1lbnRlZCB0aGUgX3JlYWQgbWV0aG9kLCBhbmQgZG9uZSB0aGUgb3RoZXIgdGhpbmdzXG4gIC8vIHRoYXQgUmVhZGFibGUgd2FudHMgYmVmb3JlIHRoZSBmaXJzdCBfcmVhZCBjYWxsLCBzbyB1bnNldCB0aGVcbiAgLy8gc3luYyBndWFyZCBmbGFnLlxuICB0aGlzLl9yZWFkYWJsZVN0YXRlLnN5bmMgPSBmYWxzZTtcblxuICB0aGlzLm9uY2UoJ2ZpbmlzaCcsIGZ1bmN0aW9uKCkge1xuICAgIGlmICgnZnVuY3Rpb24nID09PSB0eXBlb2YgdGhpcy5fZmx1c2gpXG4gICAgICB0aGlzLl9mbHVzaChmdW5jdGlvbihlcikge1xuICAgICAgICBkb25lKHN0cmVhbSwgZXIpO1xuICAgICAgfSk7XG4gICAgZWxzZVxuICAgICAgZG9uZShzdHJlYW0pO1xuICB9KTtcbn1cblxuVHJhbnNmb3JtLnByb3RvdHlwZS5wdXNoID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nKSB7XG4gIHRoaXMuX3RyYW5zZm9ybVN0YXRlLm5lZWRUcmFuc2Zvcm0gPSBmYWxzZTtcbiAgcmV0dXJuIER1cGxleC5wcm90b3R5cGUucHVzaC5jYWxsKHRoaXMsIGNodW5rLCBlbmNvZGluZyk7XG59O1xuXG4vLyBUaGlzIGlzIHRoZSBwYXJ0IHdoZXJlIHlvdSBkbyBzdHVmZiFcbi8vIG92ZXJyaWRlIHRoaXMgZnVuY3Rpb24gaW4gaW1wbGVtZW50YXRpb24gY2xhc3Nlcy5cbi8vICdjaHVuaycgaXMgYW4gaW5wdXQgY2h1bmsuXG4vL1xuLy8gQ2FsbCBgcHVzaChuZXdDaHVuaylgIHRvIHBhc3MgYWxvbmcgdHJhbnNmb3JtZWQgb3V0cHV0XG4vLyB0byB0aGUgcmVhZGFibGUgc2lkZS4gIFlvdSBtYXkgY2FsbCAncHVzaCcgemVybyBvciBtb3JlIHRpbWVzLlxuLy9cbi8vIENhbGwgYGNiKGVycilgIHdoZW4geW91IGFyZSBkb25lIHdpdGggdGhpcyBjaHVuay4gIElmIHlvdSBwYXNzXG4vLyBhbiBlcnJvciwgdGhlbiB0aGF0J2xsIHB1dCB0aGUgaHVydCBvbiB0aGUgd2hvbGUgb3BlcmF0aW9uLiAgSWYgeW91XG4vLyBuZXZlciBjYWxsIGNiKCksIHRoZW4geW91J2xsIG5ldmVyIGdldCBhbm90aGVyIGNodW5rLlxuVHJhbnNmb3JtLnByb3RvdHlwZS5fdHJhbnNmb3JtID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nLCBjYikge1xuICB0aHJvdyBuZXcgRXJyb3IoJ25vdCBpbXBsZW1lbnRlZCcpO1xufTtcblxuVHJhbnNmb3JtLnByb3RvdHlwZS5fd3JpdGUgPSBmdW5jdGlvbihjaHVuaywgZW5jb2RpbmcsIGNiKSB7XG4gIHZhciB0cyA9IHRoaXMuX3RyYW5zZm9ybVN0YXRlO1xuICB0cy53cml0ZWNiID0gY2I7XG4gIHRzLndyaXRlY2h1bmsgPSBjaHVuaztcbiAgdHMud3JpdGVlbmNvZGluZyA9IGVuY29kaW5nO1xuICBpZiAoIXRzLnRyYW5zZm9ybWluZykge1xuICAgIHZhciBycyA9IHRoaXMuX3JlYWRhYmxlU3RhdGU7XG4gICAgaWYgKHRzLm5lZWRUcmFuc2Zvcm0gfHxcbiAgICAgICAgcnMubmVlZFJlYWRhYmxlIHx8XG4gICAgICAgIHJzLmxlbmd0aCA8IHJzLmhpZ2hXYXRlck1hcmspXG4gICAgICB0aGlzLl9yZWFkKHJzLmhpZ2hXYXRlck1hcmspO1xuICB9XG59O1xuXG4vLyBEb2Vzbid0IG1hdHRlciB3aGF0IHRoZSBhcmdzIGFyZSBoZXJlLlxuLy8gX3RyYW5zZm9ybSBkb2VzIGFsbCB0aGUgd29yay5cbi8vIFRoYXQgd2UgZ290IGhlcmUgbWVhbnMgdGhhdCB0aGUgcmVhZGFibGUgc2lkZSB3YW50cyBtb3JlIGRhdGEuXG5UcmFuc2Zvcm0ucHJvdG90eXBlLl9yZWFkID0gZnVuY3Rpb24obikge1xuICB2YXIgdHMgPSB0aGlzLl90cmFuc2Zvcm1TdGF0ZTtcblxuICBpZiAodHMud3JpdGVjaHVuayAhPT0gbnVsbCAmJiB0cy53cml0ZWNiICYmICF0cy50cmFuc2Zvcm1pbmcpIHtcbiAgICB0cy50cmFuc2Zvcm1pbmcgPSB0cnVlO1xuICAgIHRoaXMuX3RyYW5zZm9ybSh0cy53cml0ZWNodW5rLCB0cy53cml0ZWVuY29kaW5nLCB0cy5hZnRlclRyYW5zZm9ybSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gbWFyayB0aGF0IHdlIG5lZWQgYSB0cmFuc2Zvcm0sIHNvIHRoYXQgYW55IGRhdGEgdGhhdCBjb21lcyBpblxuICAgIC8vIHdpbGwgZ2V0IHByb2Nlc3NlZCwgbm93IHRoYXQgd2UndmUgYXNrZWQgZm9yIGl0LlxuICAgIHRzLm5lZWRUcmFuc2Zvcm0gPSB0cnVlO1xuICB9XG59O1xuXG5cbmZ1bmN0aW9uIGRvbmUoc3RyZWFtLCBlcikge1xuICBpZiAoZXIpXG4gICAgcmV0dXJuIHN0cmVhbS5lbWl0KCdlcnJvcicsIGVyKTtcblxuICAvLyBpZiB0aGVyZSdzIG5vdGhpbmcgaW4gdGhlIHdyaXRlIGJ1ZmZlciwgdGhlbiB0aGF0IG1lYW5zXG4gIC8vIHRoYXQgbm90aGluZyBtb3JlIHdpbGwgZXZlciBiZSBwcm92aWRlZFxuICB2YXIgd3MgPSBzdHJlYW0uX3dyaXRhYmxlU3RhdGU7XG4gIHZhciBycyA9IHN0cmVhbS5fcmVhZGFibGVTdGF0ZTtcbiAgdmFyIHRzID0gc3RyZWFtLl90cmFuc2Zvcm1TdGF0ZTtcblxuICBpZiAod3MubGVuZ3RoKVxuICAgIHRocm93IG5ldyBFcnJvcignY2FsbGluZyB0cmFuc2Zvcm0gZG9uZSB3aGVuIHdzLmxlbmd0aCAhPSAwJyk7XG5cbiAgaWYgKHRzLnRyYW5zZm9ybWluZylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NhbGxpbmcgdHJhbnNmb3JtIGRvbmUgd2hlbiBzdGlsbCB0cmFuc2Zvcm1pbmcnKTtcblxuICByZXR1cm4gc3RyZWFtLnB1c2gobnVsbCk7XG59XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIEEgYml0IHNpbXBsZXIgdGhhbiByZWFkYWJsZSBzdHJlYW1zLlxuLy8gSW1wbGVtZW50IGFuIGFzeW5jIC5fd3JpdGUoY2h1bmssIGNiKSwgYW5kIGl0J2xsIGhhbmRsZSBhbGxcbi8vIHRoZSBkcmFpbiBldmVudCBlbWlzc2lvbiBhbmQgYnVmZmVyaW5nLlxuXG5tb2R1bGUuZXhwb3J0cyA9IFdyaXRhYmxlO1xuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIEJ1ZmZlciA9IHJlcXVpcmUoJ2J1ZmZlcicpLkJ1ZmZlcjtcbi8qPC9yZXBsYWNlbWVudD4qL1xuXG5Xcml0YWJsZS5Xcml0YWJsZVN0YXRlID0gV3JpdGFibGVTdGF0ZTtcblxuXG4vKjxyZXBsYWNlbWVudD4qL1xudmFyIHV0aWwgPSByZXF1aXJlKCdjb3JlLXV0aWwtaXMnKTtcbnV0aWwuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuLyo8L3JlcGxhY2VtZW50PiovXG5cbnZhciBTdHJlYW0gPSByZXF1aXJlKCdzdHJlYW0nKTtcblxudXRpbC5pbmhlcml0cyhXcml0YWJsZSwgU3RyZWFtKTtcblxuZnVuY3Rpb24gV3JpdGVSZXEoY2h1bmssIGVuY29kaW5nLCBjYikge1xuICB0aGlzLmNodW5rID0gY2h1bms7XG4gIHRoaXMuZW5jb2RpbmcgPSBlbmNvZGluZztcbiAgdGhpcy5jYWxsYmFjayA9IGNiO1xufVxuXG5mdW5jdGlvbiBXcml0YWJsZVN0YXRlKG9wdGlvbnMsIHN0cmVhbSkge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAvLyB0aGUgcG9pbnQgYXQgd2hpY2ggd3JpdGUoKSBzdGFydHMgcmV0dXJuaW5nIGZhbHNlXG4gIC8vIE5vdGU6IDAgaXMgYSB2YWxpZCB2YWx1ZSwgbWVhbnMgdGhhdCB3ZSBhbHdheXMgcmV0dXJuIGZhbHNlIGlmXG4gIC8vIHRoZSBlbnRpcmUgYnVmZmVyIGlzIG5vdCBmbHVzaGVkIGltbWVkaWF0ZWx5IG9uIHdyaXRlKClcbiAgdmFyIGh3bSA9IG9wdGlvbnMuaGlnaFdhdGVyTWFyaztcbiAgdGhpcy5oaWdoV2F0ZXJNYXJrID0gKGh3bSB8fCBod20gPT09IDApID8gaHdtIDogMTYgKiAxMDI0O1xuXG4gIC8vIG9iamVjdCBzdHJlYW0gZmxhZyB0byBpbmRpY2F0ZSB3aGV0aGVyIG9yIG5vdCB0aGlzIHN0cmVhbVxuICAvLyBjb250YWlucyBidWZmZXJzIG9yIG9iamVjdHMuXG4gIHRoaXMub2JqZWN0TW9kZSA9ICEhb3B0aW9ucy5vYmplY3RNb2RlO1xuXG4gIC8vIGNhc3QgdG8gaW50cy5cbiAgdGhpcy5oaWdoV2F0ZXJNYXJrID0gfn50aGlzLmhpZ2hXYXRlck1hcms7XG5cbiAgdGhpcy5uZWVkRHJhaW4gPSBmYWxzZTtcbiAgLy8gYXQgdGhlIHN0YXJ0IG9mIGNhbGxpbmcgZW5kKClcbiAgdGhpcy5lbmRpbmcgPSBmYWxzZTtcbiAgLy8gd2hlbiBlbmQoKSBoYXMgYmVlbiBjYWxsZWQsIGFuZCByZXR1cm5lZFxuICB0aGlzLmVuZGVkID0gZmFsc2U7XG4gIC8vIHdoZW4gJ2ZpbmlzaCcgaXMgZW1pdHRlZFxuICB0aGlzLmZpbmlzaGVkID0gZmFsc2U7XG5cbiAgLy8gc2hvdWxkIHdlIGRlY29kZSBzdHJpbmdzIGludG8gYnVmZmVycyBiZWZvcmUgcGFzc2luZyB0byBfd3JpdGU/XG4gIC8vIHRoaXMgaXMgaGVyZSBzbyB0aGF0IHNvbWUgbm9kZS1jb3JlIHN0cmVhbXMgY2FuIG9wdGltaXplIHN0cmluZ1xuICAvLyBoYW5kbGluZyBhdCBhIGxvd2VyIGxldmVsLlxuICB2YXIgbm9EZWNvZGUgPSBvcHRpb25zLmRlY29kZVN0cmluZ3MgPT09IGZhbHNlO1xuICB0aGlzLmRlY29kZVN0cmluZ3MgPSAhbm9EZWNvZGU7XG5cbiAgLy8gQ3J5cHRvIGlzIGtpbmQgb2Ygb2xkIGFuZCBjcnVzdHkuICBIaXN0b3JpY2FsbHksIGl0cyBkZWZhdWx0IHN0cmluZ1xuICAvLyBlbmNvZGluZyBpcyAnYmluYXJ5JyBzbyB3ZSBoYXZlIHRvIG1ha2UgdGhpcyBjb25maWd1cmFibGUuXG4gIC8vIEV2ZXJ5dGhpbmcgZWxzZSBpbiB0aGUgdW5pdmVyc2UgdXNlcyAndXRmOCcsIHRob3VnaC5cbiAgdGhpcy5kZWZhdWx0RW5jb2RpbmcgPSBvcHRpb25zLmRlZmF1bHRFbmNvZGluZyB8fCAndXRmOCc7XG5cbiAgLy8gbm90IGFuIGFjdHVhbCBidWZmZXIgd2Uga2VlcCB0cmFjayBvZiwgYnV0IGEgbWVhc3VyZW1lbnRcbiAgLy8gb2YgaG93IG11Y2ggd2UncmUgd2FpdGluZyB0byBnZXQgcHVzaGVkIHRvIHNvbWUgdW5kZXJseWluZ1xuICAvLyBzb2NrZXQgb3IgZmlsZS5cbiAgdGhpcy5sZW5ndGggPSAwO1xuXG4gIC8vIGEgZmxhZyB0byBzZWUgd2hlbiB3ZSdyZSBpbiB0aGUgbWlkZGxlIG9mIGEgd3JpdGUuXG4gIHRoaXMud3JpdGluZyA9IGZhbHNlO1xuXG4gIC8vIGEgZmxhZyB0byBiZSBhYmxlIHRvIHRlbGwgaWYgdGhlIG9ud3JpdGUgY2IgaXMgY2FsbGVkIGltbWVkaWF0ZWx5LFxuICAvLyBvciBvbiBhIGxhdGVyIHRpY2suICBXZSBzZXQgdGhpcyB0byB0cnVlIGF0IGZpcnN0LCBiZWN1YXNlIGFueVxuICAvLyBhY3Rpb25zIHRoYXQgc2hvdWxkbid0IGhhcHBlbiB1bnRpbCBcImxhdGVyXCIgc2hvdWxkIGdlbmVyYWxseSBhbHNvXG4gIC8vIG5vdCBoYXBwZW4gYmVmb3JlIHRoZSBmaXJzdCB3cml0ZSBjYWxsLlxuICB0aGlzLnN5bmMgPSB0cnVlO1xuXG4gIC8vIGEgZmxhZyB0byBrbm93IGlmIHdlJ3JlIHByb2Nlc3NpbmcgcHJldmlvdXNseSBidWZmZXJlZCBpdGVtcywgd2hpY2hcbiAgLy8gbWF5IGNhbGwgdGhlIF93cml0ZSgpIGNhbGxiYWNrIGluIHRoZSBzYW1lIHRpY2ssIHNvIHRoYXQgd2UgZG9uJ3RcbiAgLy8gZW5kIHVwIGluIGFuIG92ZXJsYXBwZWQgb253cml0ZSBzaXR1YXRpb24uXG4gIHRoaXMuYnVmZmVyUHJvY2Vzc2luZyA9IGZhbHNlO1xuXG4gIC8vIHRoZSBjYWxsYmFjayB0aGF0J3MgcGFzc2VkIHRvIF93cml0ZShjaHVuayxjYilcbiAgdGhpcy5vbndyaXRlID0gZnVuY3Rpb24oZXIpIHtcbiAgICBvbndyaXRlKHN0cmVhbSwgZXIpO1xuICB9O1xuXG4gIC8vIHRoZSBjYWxsYmFjayB0aGF0IHRoZSB1c2VyIHN1cHBsaWVzIHRvIHdyaXRlKGNodW5rLGVuY29kaW5nLGNiKVxuICB0aGlzLndyaXRlY2IgPSBudWxsO1xuXG4gIC8vIHRoZSBhbW91bnQgdGhhdCBpcyBiZWluZyB3cml0dGVuIHdoZW4gX3dyaXRlIGlzIGNhbGxlZC5cbiAgdGhpcy53cml0ZWxlbiA9IDA7XG5cbiAgdGhpcy5idWZmZXIgPSBbXTtcblxuICAvLyBUcnVlIGlmIHRoZSBlcnJvciB3YXMgYWxyZWFkeSBlbWl0dGVkIGFuZCBzaG91bGQgbm90IGJlIHRocm93biBhZ2FpblxuICB0aGlzLmVycm9yRW1pdHRlZCA9IGZhbHNlO1xufVxuXG5mdW5jdGlvbiBXcml0YWJsZShvcHRpb25zKSB7XG4gIHZhciBEdXBsZXggPSByZXF1aXJlKCcuL19zdHJlYW1fZHVwbGV4Jyk7XG5cbiAgLy8gV3JpdGFibGUgY3RvciBpcyBhcHBsaWVkIHRvIER1cGxleGVzLCB0aG91Z2ggdGhleSdyZSBub3RcbiAgLy8gaW5zdGFuY2VvZiBXcml0YWJsZSwgdGhleSdyZSBpbnN0YW5jZW9mIFJlYWRhYmxlLlxuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV3JpdGFibGUpICYmICEodGhpcyBpbnN0YW5jZW9mIER1cGxleCkpXG4gICAgcmV0dXJuIG5ldyBXcml0YWJsZShvcHRpb25zKTtcblxuICB0aGlzLl93cml0YWJsZVN0YXRlID0gbmV3IFdyaXRhYmxlU3RhdGUob3B0aW9ucywgdGhpcyk7XG5cbiAgLy8gbGVnYWN5LlxuICB0aGlzLndyaXRhYmxlID0gdHJ1ZTtcblxuICBTdHJlYW0uY2FsbCh0aGlzKTtcbn1cblxuLy8gT3RoZXJ3aXNlIHBlb3BsZSBjYW4gcGlwZSBXcml0YWJsZSBzdHJlYW1zLCB3aGljaCBpcyBqdXN0IHdyb25nLlxuV3JpdGFibGUucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5lbWl0KCdlcnJvcicsIG5ldyBFcnJvcignQ2Fubm90IHBpcGUuIE5vdCByZWFkYWJsZS4nKSk7XG59O1xuXG5cbmZ1bmN0aW9uIHdyaXRlQWZ0ZXJFbmQoc3RyZWFtLCBzdGF0ZSwgY2IpIHtcbiAgdmFyIGVyID0gbmV3IEVycm9yKCd3cml0ZSBhZnRlciBlbmQnKTtcbiAgLy8gVE9ETzogZGVmZXIgZXJyb3IgZXZlbnRzIGNvbnNpc3RlbnRseSBldmVyeXdoZXJlLCBub3QganVzdCB0aGUgY2JcbiAgc3RyZWFtLmVtaXQoJ2Vycm9yJywgZXIpO1xuICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgIGNiKGVyKTtcbiAgfSk7XG59XG5cbi8vIElmIHdlIGdldCBzb21ldGhpbmcgdGhhdCBpcyBub3QgYSBidWZmZXIsIHN0cmluZywgbnVsbCwgb3IgdW5kZWZpbmVkLFxuLy8gYW5kIHdlJ3JlIG5vdCBpbiBvYmplY3RNb2RlLCB0aGVuIHRoYXQncyBhbiBlcnJvci5cbi8vIE90aGVyd2lzZSBzdHJlYW0gY2h1bmtzIGFyZSBhbGwgY29uc2lkZXJlZCB0byBiZSBvZiBsZW5ndGg9MSwgYW5kIHRoZVxuLy8gd2F0ZXJtYXJrcyBkZXRlcm1pbmUgaG93IG1hbnkgb2JqZWN0cyB0byBrZWVwIGluIHRoZSBidWZmZXIsIHJhdGhlciB0aGFuXG4vLyBob3cgbWFueSBieXRlcyBvciBjaGFyYWN0ZXJzLlxuZnVuY3Rpb24gdmFsaWRDaHVuayhzdHJlYW0sIHN0YXRlLCBjaHVuaywgY2IpIHtcbiAgdmFyIHZhbGlkID0gdHJ1ZTtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoY2h1bmspICYmXG4gICAgICAnc3RyaW5nJyAhPT0gdHlwZW9mIGNodW5rICYmXG4gICAgICBjaHVuayAhPT0gbnVsbCAmJlxuICAgICAgY2h1bmsgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgIXN0YXRlLm9iamVjdE1vZGUpIHtcbiAgICB2YXIgZXIgPSBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIG5vbi1zdHJpbmcvYnVmZmVyIGNodW5rJyk7XG4gICAgc3RyZWFtLmVtaXQoJ2Vycm9yJywgZXIpO1xuICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG4gICAgICBjYihlcik7XG4gICAgfSk7XG4gICAgdmFsaWQgPSBmYWxzZTtcbiAgfVxuICByZXR1cm4gdmFsaWQ7XG59XG5cbldyaXRhYmxlLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgdmFyIHN0YXRlID0gdGhpcy5fd3JpdGFibGVTdGF0ZTtcbiAgdmFyIHJldCA9IGZhbHNlO1xuXG4gIGlmICh0eXBlb2YgZW5jb2RpbmcgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IGVuY29kaW5nO1xuICAgIGVuY29kaW5nID0gbnVsbDtcbiAgfVxuXG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoY2h1bmspKVxuICAgIGVuY29kaW5nID0gJ2J1ZmZlcic7XG4gIGVsc2UgaWYgKCFlbmNvZGluZylcbiAgICBlbmNvZGluZyA9IHN0YXRlLmRlZmF1bHRFbmNvZGluZztcblxuICBpZiAodHlwZW9mIGNiICE9PSAnZnVuY3Rpb24nKVxuICAgIGNiID0gZnVuY3Rpb24oKSB7fTtcblxuICBpZiAoc3RhdGUuZW5kZWQpXG4gICAgd3JpdGVBZnRlckVuZCh0aGlzLCBzdGF0ZSwgY2IpO1xuICBlbHNlIGlmICh2YWxpZENodW5rKHRoaXMsIHN0YXRlLCBjaHVuaywgY2IpKVxuICAgIHJldCA9IHdyaXRlT3JCdWZmZXIodGhpcywgc3RhdGUsIGNodW5rLCBlbmNvZGluZywgY2IpO1xuXG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBkZWNvZGVDaHVuayhzdGF0ZSwgY2h1bmssIGVuY29kaW5nKSB7XG4gIGlmICghc3RhdGUub2JqZWN0TW9kZSAmJlxuICAgICAgc3RhdGUuZGVjb2RlU3RyaW5ncyAhPT0gZmFsc2UgJiZcbiAgICAgIHR5cGVvZiBjaHVuayA9PT0gJ3N0cmluZycpIHtcbiAgICBjaHVuayA9IG5ldyBCdWZmZXIoY2h1bmssIGVuY29kaW5nKTtcbiAgfVxuICByZXR1cm4gY2h1bms7XG59XG5cbi8vIGlmIHdlJ3JlIGFscmVhZHkgd3JpdGluZyBzb21ldGhpbmcsIHRoZW4ganVzdCBwdXQgdGhpc1xuLy8gaW4gdGhlIHF1ZXVlLCBhbmQgd2FpdCBvdXIgdHVybi4gIE90aGVyd2lzZSwgY2FsbCBfd3JpdGVcbi8vIElmIHdlIHJldHVybiBmYWxzZSwgdGhlbiB3ZSBuZWVkIGEgZHJhaW4gZXZlbnQsIHNvIHNldCB0aGF0IGZsYWcuXG5mdW5jdGlvbiB3cml0ZU9yQnVmZmVyKHN0cmVhbSwgc3RhdGUsIGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgY2h1bmsgPSBkZWNvZGVDaHVuayhzdGF0ZSwgY2h1bmssIGVuY29kaW5nKTtcbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihjaHVuaykpXG4gICAgZW5jb2RpbmcgPSAnYnVmZmVyJztcbiAgdmFyIGxlbiA9IHN0YXRlLm9iamVjdE1vZGUgPyAxIDogY2h1bmsubGVuZ3RoO1xuXG4gIHN0YXRlLmxlbmd0aCArPSBsZW47XG5cbiAgdmFyIHJldCA9IHN0YXRlLmxlbmd0aCA8IHN0YXRlLmhpZ2hXYXRlck1hcms7XG4gIC8vIHdlIG11c3QgZW5zdXJlIHRoYXQgcHJldmlvdXMgbmVlZERyYWluIHdpbGwgbm90IGJlIHJlc2V0IHRvIGZhbHNlLlxuICBpZiAoIXJldClcbiAgICBzdGF0ZS5uZWVkRHJhaW4gPSB0cnVlO1xuXG4gIGlmIChzdGF0ZS53cml0aW5nKVxuICAgIHN0YXRlLmJ1ZmZlci5wdXNoKG5ldyBXcml0ZVJlcShjaHVuaywgZW5jb2RpbmcsIGNiKSk7XG4gIGVsc2VcbiAgICBkb1dyaXRlKHN0cmVhbSwgc3RhdGUsIGxlbiwgY2h1bmssIGVuY29kaW5nLCBjYik7XG5cbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gZG9Xcml0ZShzdHJlYW0sIHN0YXRlLCBsZW4sIGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgc3RhdGUud3JpdGVsZW4gPSBsZW47XG4gIHN0YXRlLndyaXRlY2IgPSBjYjtcbiAgc3RhdGUud3JpdGluZyA9IHRydWU7XG4gIHN0YXRlLnN5bmMgPSB0cnVlO1xuICBzdHJlYW0uX3dyaXRlKGNodW5rLCBlbmNvZGluZywgc3RhdGUub253cml0ZSk7XG4gIHN0YXRlLnN5bmMgPSBmYWxzZTtcbn1cblxuZnVuY3Rpb24gb253cml0ZUVycm9yKHN0cmVhbSwgc3RhdGUsIHN5bmMsIGVyLCBjYikge1xuICBpZiAoc3luYylcbiAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgY2IoZXIpO1xuICAgIH0pO1xuICBlbHNlXG4gICAgY2IoZXIpO1xuXG4gIHN0cmVhbS5fd3JpdGFibGVTdGF0ZS5lcnJvckVtaXR0ZWQgPSB0cnVlO1xuICBzdHJlYW0uZW1pdCgnZXJyb3InLCBlcik7XG59XG5cbmZ1bmN0aW9uIG9ud3JpdGVTdGF0ZVVwZGF0ZShzdGF0ZSkge1xuICBzdGF0ZS53cml0aW5nID0gZmFsc2U7XG4gIHN0YXRlLndyaXRlY2IgPSBudWxsO1xuICBzdGF0ZS5sZW5ndGggLT0gc3RhdGUud3JpdGVsZW47XG4gIHN0YXRlLndyaXRlbGVuID0gMDtcbn1cblxuZnVuY3Rpb24gb253cml0ZShzdHJlYW0sIGVyKSB7XG4gIHZhciBzdGF0ZSA9IHN0cmVhbS5fd3JpdGFibGVTdGF0ZTtcbiAgdmFyIHN5bmMgPSBzdGF0ZS5zeW5jO1xuICB2YXIgY2IgPSBzdGF0ZS53cml0ZWNiO1xuXG4gIG9ud3JpdGVTdGF0ZVVwZGF0ZShzdGF0ZSk7XG5cbiAgaWYgKGVyKVxuICAgIG9ud3JpdGVFcnJvcihzdHJlYW0sIHN0YXRlLCBzeW5jLCBlciwgY2IpO1xuICBlbHNlIHtcbiAgICAvLyBDaGVjayBpZiB3ZSdyZSBhY3R1YWxseSByZWFkeSB0byBmaW5pc2gsIGJ1dCBkb24ndCBlbWl0IHlldFxuICAgIHZhciBmaW5pc2hlZCA9IG5lZWRGaW5pc2goc3RyZWFtLCBzdGF0ZSk7XG5cbiAgICBpZiAoIWZpbmlzaGVkICYmICFzdGF0ZS5idWZmZXJQcm9jZXNzaW5nICYmIHN0YXRlLmJ1ZmZlci5sZW5ndGgpXG4gICAgICBjbGVhckJ1ZmZlcihzdHJlYW0sIHN0YXRlKTtcblxuICAgIGlmIChzeW5jKSB7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKGZ1bmN0aW9uKCkge1xuICAgICAgICBhZnRlcldyaXRlKHN0cmVhbSwgc3RhdGUsIGZpbmlzaGVkLCBjYik7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYWZ0ZXJXcml0ZShzdHJlYW0sIHN0YXRlLCBmaW5pc2hlZCwgY2IpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBhZnRlcldyaXRlKHN0cmVhbSwgc3RhdGUsIGZpbmlzaGVkLCBjYikge1xuICBpZiAoIWZpbmlzaGVkKVxuICAgIG9ud3JpdGVEcmFpbihzdHJlYW0sIHN0YXRlKTtcbiAgY2IoKTtcbiAgaWYgKGZpbmlzaGVkKVxuICAgIGZpbmlzaE1heWJlKHN0cmVhbSwgc3RhdGUpO1xufVxuXG4vLyBNdXN0IGZvcmNlIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCBvbiBuZXh0VGljaywgc28gdGhhdCB3ZSBkb24ndFxuLy8gZW1pdCAnZHJhaW4nIGJlZm9yZSB0aGUgd3JpdGUoKSBjb25zdW1lciBnZXRzIHRoZSAnZmFsc2UnIHJldHVyblxuLy8gdmFsdWUsIGFuZCBoYXMgYSBjaGFuY2UgdG8gYXR0YWNoIGEgJ2RyYWluJyBsaXN0ZW5lci5cbmZ1bmN0aW9uIG9ud3JpdGVEcmFpbihzdHJlYW0sIHN0YXRlKSB7XG4gIGlmIChzdGF0ZS5sZW5ndGggPT09IDAgJiYgc3RhdGUubmVlZERyYWluKSB7XG4gICAgc3RhdGUubmVlZERyYWluID0gZmFsc2U7XG4gICAgc3RyZWFtLmVtaXQoJ2RyYWluJyk7XG4gIH1cbn1cblxuXG4vLyBpZiB0aGVyZSdzIHNvbWV0aGluZyBpbiB0aGUgYnVmZmVyIHdhaXRpbmcsIHRoZW4gcHJvY2VzcyBpdFxuZnVuY3Rpb24gY2xlYXJCdWZmZXIoc3RyZWFtLCBzdGF0ZSkge1xuICBzdGF0ZS5idWZmZXJQcm9jZXNzaW5nID0gdHJ1ZTtcblxuICBmb3IgKHZhciBjID0gMDsgYyA8IHN0YXRlLmJ1ZmZlci5sZW5ndGg7IGMrKykge1xuICAgIHZhciBlbnRyeSA9IHN0YXRlLmJ1ZmZlcltjXTtcbiAgICB2YXIgY2h1bmsgPSBlbnRyeS5jaHVuaztcbiAgICB2YXIgZW5jb2RpbmcgPSBlbnRyeS5lbmNvZGluZztcbiAgICB2YXIgY2IgPSBlbnRyeS5jYWxsYmFjaztcbiAgICB2YXIgbGVuID0gc3RhdGUub2JqZWN0TW9kZSA/IDEgOiBjaHVuay5sZW5ndGg7XG5cbiAgICBkb1dyaXRlKHN0cmVhbSwgc3RhdGUsIGxlbiwgY2h1bmssIGVuY29kaW5nLCBjYik7XG5cbiAgICAvLyBpZiB3ZSBkaWRuJ3QgY2FsbCB0aGUgb253cml0ZSBpbW1lZGlhdGVseSwgdGhlblxuICAgIC8vIGl0IG1lYW5zIHRoYXQgd2UgbmVlZCB0byB3YWl0IHVudGlsIGl0IGRvZXMuXG4gICAgLy8gYWxzbywgdGhhdCBtZWFucyB0aGF0IHRoZSBjaHVuayBhbmQgY2IgYXJlIGN1cnJlbnRseVxuICAgIC8vIGJlaW5nIHByb2Nlc3NlZCwgc28gbW92ZSB0aGUgYnVmZmVyIGNvdW50ZXIgcGFzdCB0aGVtLlxuICAgIGlmIChzdGF0ZS53cml0aW5nKSB7XG4gICAgICBjKys7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBzdGF0ZS5idWZmZXJQcm9jZXNzaW5nID0gZmFsc2U7XG4gIGlmIChjIDwgc3RhdGUuYnVmZmVyLmxlbmd0aClcbiAgICBzdGF0ZS5idWZmZXIgPSBzdGF0ZS5idWZmZXIuc2xpY2UoYyk7XG4gIGVsc2VcbiAgICBzdGF0ZS5idWZmZXIubGVuZ3RoID0gMDtcbn1cblxuV3JpdGFibGUucHJvdG90eXBlLl93cml0ZSA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2IpIHtcbiAgY2IobmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQnKSk7XG59O1xuXG5Xcml0YWJsZS5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nLCBjYikge1xuICB2YXIgc3RhdGUgPSB0aGlzLl93cml0YWJsZVN0YXRlO1xuXG4gIGlmICh0eXBlb2YgY2h1bmsgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYiA9IGNodW5rO1xuICAgIGNodW5rID0gbnVsbDtcbiAgICBlbmNvZGluZyA9IG51bGw7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGVuY29kaW5nID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2IgPSBlbmNvZGluZztcbiAgICBlbmNvZGluZyA9IG51bGw7XG4gIH1cblxuICBpZiAodHlwZW9mIGNodW5rICE9PSAndW5kZWZpbmVkJyAmJiBjaHVuayAhPT0gbnVsbClcbiAgICB0aGlzLndyaXRlKGNodW5rLCBlbmNvZGluZyk7XG5cbiAgLy8gaWdub3JlIHVubmVjZXNzYXJ5IGVuZCgpIGNhbGxzLlxuICBpZiAoIXN0YXRlLmVuZGluZyAmJiAhc3RhdGUuZmluaXNoZWQpXG4gICAgZW5kV3JpdGFibGUodGhpcywgc3RhdGUsIGNiKTtcbn07XG5cblxuZnVuY3Rpb24gbmVlZEZpbmlzaChzdHJlYW0sIHN0YXRlKSB7XG4gIHJldHVybiAoc3RhdGUuZW5kaW5nICYmXG4gICAgICAgICAgc3RhdGUubGVuZ3RoID09PSAwICYmXG4gICAgICAgICAgIXN0YXRlLmZpbmlzaGVkICYmXG4gICAgICAgICAgIXN0YXRlLndyaXRpbmcpO1xufVxuXG5mdW5jdGlvbiBmaW5pc2hNYXliZShzdHJlYW0sIHN0YXRlKSB7XG4gIHZhciBuZWVkID0gbmVlZEZpbmlzaChzdHJlYW0sIHN0YXRlKTtcbiAgaWYgKG5lZWQpIHtcbiAgICBzdGF0ZS5maW5pc2hlZCA9IHRydWU7XG4gICAgc3RyZWFtLmVtaXQoJ2ZpbmlzaCcpO1xuICB9XG4gIHJldHVybiBuZWVkO1xufVxuXG5mdW5jdGlvbiBlbmRXcml0YWJsZShzdHJlYW0sIHN0YXRlLCBjYikge1xuICBzdGF0ZS5lbmRpbmcgPSB0cnVlO1xuICBmaW5pc2hNYXliZShzdHJlYW0sIHN0YXRlKTtcbiAgaWYgKGNiKSB7XG4gICAgaWYgKHN0YXRlLmZpbmlzaGVkKVxuICAgICAgcHJvY2Vzcy5uZXh0VGljayhjYik7XG4gICAgZWxzZVxuICAgICAgc3RyZWFtLm9uY2UoJ2ZpbmlzaCcsIGNiKTtcbiAgfVxuICBzdGF0ZS5lbmRlZCA9IHRydWU7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiRldhQVNIXCIpKSIsIihmdW5jdGlvbiAoQnVmZmVyKXtcbi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZnVuY3Rpb24gaXNCdWZmZXIoYXJnKSB7XG4gIHJldHVybiBCdWZmZXIuaXNCdWZmZXIoYXJnKTtcbn1cbmV4cG9ydHMuaXNCdWZmZXIgPSBpc0J1ZmZlcjtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyKSIsIm1vZHVsZS5leHBvcnRzID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoYXJyKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYXJyKSA9PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyO1xuXG52YXIgaXNCdWZmZXJFbmNvZGluZyA9IEJ1ZmZlci5pc0VuY29kaW5nXG4gIHx8IGZ1bmN0aW9uKGVuY29kaW5nKSB7XG4gICAgICAgc3dpdGNoIChlbmNvZGluZyAmJiBlbmNvZGluZy50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICAgICBjYXNlICdoZXgnOiBjYXNlICd1dGY4JzogY2FzZSAndXRmLTgnOiBjYXNlICdhc2NpaSc6IGNhc2UgJ2JpbmFyeSc6IGNhc2UgJ2Jhc2U2NCc6IGNhc2UgJ3VjczInOiBjYXNlICd1Y3MtMic6IGNhc2UgJ3V0ZjE2bGUnOiBjYXNlICd1dGYtMTZsZSc6IGNhc2UgJ3Jhdyc6IHJldHVybiB0cnVlO1xuICAgICAgICAgZGVmYXVsdDogcmV0dXJuIGZhbHNlO1xuICAgICAgIH1cbiAgICAgfVxuXG5cbmZ1bmN0aW9uIGFzc2VydEVuY29kaW5nKGVuY29kaW5nKSB7XG4gIGlmIChlbmNvZGluZyAmJiAhaXNCdWZmZXJFbmNvZGluZyhlbmNvZGluZykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2Rpbmc6ICcgKyBlbmNvZGluZyk7XG4gIH1cbn1cblxuLy8gU3RyaW5nRGVjb2RlciBwcm92aWRlcyBhbiBpbnRlcmZhY2UgZm9yIGVmZmljaWVudGx5IHNwbGl0dGluZyBhIHNlcmllcyBvZlxuLy8gYnVmZmVycyBpbnRvIGEgc2VyaWVzIG9mIEpTIHN0cmluZ3Mgd2l0aG91dCBicmVha2luZyBhcGFydCBtdWx0aS1ieXRlXG4vLyBjaGFyYWN0ZXJzLiBDRVNVLTggaXMgaGFuZGxlZCBhcyBwYXJ0IG9mIHRoZSBVVEYtOCBlbmNvZGluZy5cbi8vXG4vLyBAVE9ETyBIYW5kbGluZyBhbGwgZW5jb2RpbmdzIGluc2lkZSBhIHNpbmdsZSBvYmplY3QgbWFrZXMgaXQgdmVyeSBkaWZmaWN1bHRcbi8vIHRvIHJlYXNvbiBhYm91dCB0aGlzIGNvZGUsIHNvIGl0IHNob3VsZCBiZSBzcGxpdCB1cCBpbiB0aGUgZnV0dXJlLlxuLy8gQFRPRE8gVGhlcmUgc2hvdWxkIGJlIGEgdXRmOC1zdHJpY3QgZW5jb2RpbmcgdGhhdCByZWplY3RzIGludmFsaWQgVVRGLTggY29kZVxuLy8gcG9pbnRzIGFzIHVzZWQgYnkgQ0VTVS04LlxudmFyIFN0cmluZ0RlY29kZXIgPSBleHBvcnRzLlN0cmluZ0RlY29kZXIgPSBmdW5jdGlvbihlbmNvZGluZykge1xuICB0aGlzLmVuY29kaW5nID0gKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bLV9dLywgJycpO1xuICBhc3NlcnRFbmNvZGluZyhlbmNvZGluZyk7XG4gIHN3aXRjaCAodGhpcy5lbmNvZGluZykge1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgICAgLy8gQ0VTVS04IHJlcHJlc2VudHMgZWFjaCBvZiBTdXJyb2dhdGUgUGFpciBieSAzLWJ5dGVzXG4gICAgICB0aGlzLnN1cnJvZ2F0ZVNpemUgPSAzO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgICAvLyBVVEYtMTYgcmVwcmVzZW50cyBlYWNoIG9mIFN1cnJvZ2F0ZSBQYWlyIGJ5IDItYnl0ZXNcbiAgICAgIHRoaXMuc3Vycm9nYXRlU2l6ZSA9IDI7XG4gICAgICB0aGlzLmRldGVjdEluY29tcGxldGVDaGFyID0gdXRmMTZEZXRlY3RJbmNvbXBsZXRlQ2hhcjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICAvLyBCYXNlLTY0IHN0b3JlcyAzIGJ5dGVzIGluIDQgY2hhcnMsIGFuZCBwYWRzIHRoZSByZW1haW5kZXIuXG4gICAgICB0aGlzLnN1cnJvZ2F0ZVNpemUgPSAzO1xuICAgICAgdGhpcy5kZXRlY3RJbmNvbXBsZXRlQ2hhciA9IGJhc2U2NERldGVjdEluY29tcGxldGVDaGFyO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRoaXMud3JpdGUgPSBwYXNzVGhyb3VnaFdyaXRlO1xuICAgICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gRW5vdWdoIHNwYWNlIHRvIHN0b3JlIGFsbCBieXRlcyBvZiBhIHNpbmdsZSBjaGFyYWN0ZXIuIFVURi04IG5lZWRzIDRcbiAgLy8gYnl0ZXMsIGJ1dCBDRVNVLTggbWF5IHJlcXVpcmUgdXAgdG8gNiAoMyBieXRlcyBwZXIgc3Vycm9nYXRlKS5cbiAgdGhpcy5jaGFyQnVmZmVyID0gbmV3IEJ1ZmZlcig2KTtcbiAgLy8gTnVtYmVyIG9mIGJ5dGVzIHJlY2VpdmVkIGZvciB0aGUgY3VycmVudCBpbmNvbXBsZXRlIG11bHRpLWJ5dGUgY2hhcmFjdGVyLlxuICB0aGlzLmNoYXJSZWNlaXZlZCA9IDA7XG4gIC8vIE51bWJlciBvZiBieXRlcyBleHBlY3RlZCBmb3IgdGhlIGN1cnJlbnQgaW5jb21wbGV0ZSBtdWx0aS1ieXRlIGNoYXJhY3Rlci5cbiAgdGhpcy5jaGFyTGVuZ3RoID0gMDtcbn07XG5cblxuLy8gd3JpdGUgZGVjb2RlcyB0aGUgZ2l2ZW4gYnVmZmVyIGFuZCByZXR1cm5zIGl0IGFzIEpTIHN0cmluZyB0aGF0IGlzXG4vLyBndWFyYW50ZWVkIHRvIG5vdCBjb250YWluIGFueSBwYXJ0aWFsIG11bHRpLWJ5dGUgY2hhcmFjdGVycy4gQW55IHBhcnRpYWxcbi8vIGNoYXJhY3RlciBmb3VuZCBhdCB0aGUgZW5kIG9mIHRoZSBidWZmZXIgaXMgYnVmZmVyZWQgdXAsIGFuZCB3aWxsIGJlXG4vLyByZXR1cm5lZCB3aGVuIGNhbGxpbmcgd3JpdGUgYWdhaW4gd2l0aCB0aGUgcmVtYWluaW5nIGJ5dGVzLlxuLy9cbi8vIE5vdGU6IENvbnZlcnRpbmcgYSBCdWZmZXIgY29udGFpbmluZyBhbiBvcnBoYW4gc3Vycm9nYXRlIHRvIGEgU3RyaW5nXG4vLyBjdXJyZW50bHkgd29ya3MsIGJ1dCBjb252ZXJ0aW5nIGEgU3RyaW5nIHRvIGEgQnVmZmVyICh2aWEgYG5ldyBCdWZmZXJgLCBvclxuLy8gQnVmZmVyI3dyaXRlKSB3aWxsIHJlcGxhY2UgaW5jb21wbGV0ZSBzdXJyb2dhdGVzIHdpdGggdGhlIHVuaWNvZGVcbi8vIHJlcGxhY2VtZW50IGNoYXJhY3Rlci4gU2VlIGh0dHBzOi8vY29kZXJldmlldy5jaHJvbWl1bS5vcmcvMTIxMTczMDA5LyAuXG5TdHJpbmdEZWNvZGVyLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICB2YXIgY2hhclN0ciA9ICcnO1xuICAvLyBpZiBvdXIgbGFzdCB3cml0ZSBlbmRlZCB3aXRoIGFuIGluY29tcGxldGUgbXVsdGlieXRlIGNoYXJhY3RlclxuICB3aGlsZSAodGhpcy5jaGFyTGVuZ3RoKSB7XG4gICAgLy8gZGV0ZXJtaW5lIGhvdyBtYW55IHJlbWFpbmluZyBieXRlcyB0aGlzIGJ1ZmZlciBoYXMgdG8gb2ZmZXIgZm9yIHRoaXMgY2hhclxuICAgIHZhciBhdmFpbGFibGUgPSAoYnVmZmVyLmxlbmd0aCA+PSB0aGlzLmNoYXJMZW5ndGggLSB0aGlzLmNoYXJSZWNlaXZlZCkgP1xuICAgICAgICB0aGlzLmNoYXJMZW5ndGggLSB0aGlzLmNoYXJSZWNlaXZlZCA6XG4gICAgICAgIGJ1ZmZlci5sZW5ndGg7XG5cbiAgICAvLyBhZGQgdGhlIG5ldyBieXRlcyB0byB0aGUgY2hhciBidWZmZXJcbiAgICBidWZmZXIuY29weSh0aGlzLmNoYXJCdWZmZXIsIHRoaXMuY2hhclJlY2VpdmVkLCAwLCBhdmFpbGFibGUpO1xuICAgIHRoaXMuY2hhclJlY2VpdmVkICs9IGF2YWlsYWJsZTtcblxuICAgIGlmICh0aGlzLmNoYXJSZWNlaXZlZCA8IHRoaXMuY2hhckxlbmd0aCkge1xuICAgICAgLy8gc3RpbGwgbm90IGVub3VnaCBjaGFycyBpbiB0aGlzIGJ1ZmZlcj8gd2FpdCBmb3IgbW9yZSAuLi5cbiAgICAgIHJldHVybiAnJztcbiAgICB9XG5cbiAgICAvLyByZW1vdmUgYnl0ZXMgYmVsb25naW5nIHRvIHRoZSBjdXJyZW50IGNoYXJhY3RlciBmcm9tIHRoZSBidWZmZXJcbiAgICBidWZmZXIgPSBidWZmZXIuc2xpY2UoYXZhaWxhYmxlLCBidWZmZXIubGVuZ3RoKTtcblxuICAgIC8vIGdldCB0aGUgY2hhcmFjdGVyIHRoYXQgd2FzIHNwbGl0XG4gICAgY2hhclN0ciA9IHRoaXMuY2hhckJ1ZmZlci5zbGljZSgwLCB0aGlzLmNoYXJMZW5ndGgpLnRvU3RyaW5nKHRoaXMuZW5jb2RpbmcpO1xuXG4gICAgLy8gQ0VTVS04OiBsZWFkIHN1cnJvZ2F0ZSAoRDgwMC1EQkZGKSBpcyBhbHNvIHRoZSBpbmNvbXBsZXRlIGNoYXJhY3RlclxuICAgIHZhciBjaGFyQ29kZSA9IGNoYXJTdHIuY2hhckNvZGVBdChjaGFyU3RyLmxlbmd0aCAtIDEpO1xuICAgIGlmIChjaGFyQ29kZSA+PSAweEQ4MDAgJiYgY2hhckNvZGUgPD0gMHhEQkZGKSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggKz0gdGhpcy5zdXJyb2dhdGVTaXplO1xuICAgICAgY2hhclN0ciA9ICcnO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIHRoaXMuY2hhclJlY2VpdmVkID0gdGhpcy5jaGFyTGVuZ3RoID0gMDtcblxuICAgIC8vIGlmIHRoZXJlIGFyZSBubyBtb3JlIGJ5dGVzIGluIHRoaXMgYnVmZmVyLCBqdXN0IGVtaXQgb3VyIGNoYXJcbiAgICBpZiAoYnVmZmVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGNoYXJTdHI7XG4gICAgfVxuICAgIGJyZWFrO1xuICB9XG5cbiAgLy8gZGV0ZXJtaW5lIGFuZCBzZXQgY2hhckxlbmd0aCAvIGNoYXJSZWNlaXZlZFxuICB0aGlzLmRldGVjdEluY29tcGxldGVDaGFyKGJ1ZmZlcik7XG5cbiAgdmFyIGVuZCA9IGJ1ZmZlci5sZW5ndGg7XG4gIGlmICh0aGlzLmNoYXJMZW5ndGgpIHtcbiAgICAvLyBidWZmZXIgdGhlIGluY29tcGxldGUgY2hhcmFjdGVyIGJ5dGVzIHdlIGdvdFxuICAgIGJ1ZmZlci5jb3B5KHRoaXMuY2hhckJ1ZmZlciwgMCwgYnVmZmVyLmxlbmd0aCAtIHRoaXMuY2hhclJlY2VpdmVkLCBlbmQpO1xuICAgIGVuZCAtPSB0aGlzLmNoYXJSZWNlaXZlZDtcbiAgfVxuXG4gIGNoYXJTdHIgKz0gYnVmZmVyLnRvU3RyaW5nKHRoaXMuZW5jb2RpbmcsIDAsIGVuZCk7XG5cbiAgdmFyIGVuZCA9IGNoYXJTdHIubGVuZ3RoIC0gMTtcbiAgdmFyIGNoYXJDb2RlID0gY2hhclN0ci5jaGFyQ29kZUF0KGVuZCk7XG4gIC8vIENFU1UtODogbGVhZCBzdXJyb2dhdGUgKEQ4MDAtREJGRikgaXMgYWxzbyB0aGUgaW5jb21wbGV0ZSBjaGFyYWN0ZXJcbiAgaWYgKGNoYXJDb2RlID49IDB4RDgwMCAmJiBjaGFyQ29kZSA8PSAweERCRkYpIHtcbiAgICB2YXIgc2l6ZSA9IHRoaXMuc3Vycm9nYXRlU2l6ZTtcbiAgICB0aGlzLmNoYXJMZW5ndGggKz0gc2l6ZTtcbiAgICB0aGlzLmNoYXJSZWNlaXZlZCArPSBzaXplO1xuICAgIHRoaXMuY2hhckJ1ZmZlci5jb3B5KHRoaXMuY2hhckJ1ZmZlciwgc2l6ZSwgMCwgc2l6ZSk7XG4gICAgYnVmZmVyLmNvcHkodGhpcy5jaGFyQnVmZmVyLCAwLCAwLCBzaXplKTtcbiAgICByZXR1cm4gY2hhclN0ci5zdWJzdHJpbmcoMCwgZW5kKTtcbiAgfVxuXG4gIC8vIG9yIGp1c3QgZW1pdCB0aGUgY2hhclN0clxuICByZXR1cm4gY2hhclN0cjtcbn07XG5cbi8vIGRldGVjdEluY29tcGxldGVDaGFyIGRldGVybWluZXMgaWYgdGhlcmUgaXMgYW4gaW5jb21wbGV0ZSBVVEYtOCBjaGFyYWN0ZXIgYXRcbi8vIHRoZSBlbmQgb2YgdGhlIGdpdmVuIGJ1ZmZlci4gSWYgc28sIGl0IHNldHMgdGhpcy5jaGFyTGVuZ3RoIHRvIHRoZSBieXRlXG4vLyBsZW5ndGggdGhhdCBjaGFyYWN0ZXIsIGFuZCBzZXRzIHRoaXMuY2hhclJlY2VpdmVkIHRvIHRoZSBudW1iZXIgb2YgYnl0ZXNcbi8vIHRoYXQgYXJlIGF2YWlsYWJsZSBmb3IgdGhpcyBjaGFyYWN0ZXIuXG5TdHJpbmdEZWNvZGVyLnByb3RvdHlwZS5kZXRlY3RJbmNvbXBsZXRlQ2hhciA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAvLyBkZXRlcm1pbmUgaG93IG1hbnkgYnl0ZXMgd2UgaGF2ZSB0byBjaGVjayBhdCB0aGUgZW5kIG9mIHRoaXMgYnVmZmVyXG4gIHZhciBpID0gKGJ1ZmZlci5sZW5ndGggPj0gMykgPyAzIDogYnVmZmVyLmxlbmd0aDtcblxuICAvLyBGaWd1cmUgb3V0IGlmIG9uZSBvZiB0aGUgbGFzdCBpIGJ5dGVzIG9mIG91ciBidWZmZXIgYW5ub3VuY2VzIGFuXG4gIC8vIGluY29tcGxldGUgY2hhci5cbiAgZm9yICg7IGkgPiAwOyBpLS0pIHtcbiAgICB2YXIgYyA9IGJ1ZmZlcltidWZmZXIubGVuZ3RoIC0gaV07XG5cbiAgICAvLyBTZWUgaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9VVEYtOCNEZXNjcmlwdGlvblxuXG4gICAgLy8gMTEwWFhYWFhcbiAgICBpZiAoaSA9PSAxICYmIGMgPj4gNSA9PSAweDA2KSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggPSAyO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gMTExMFhYWFhcbiAgICBpZiAoaSA8PSAyICYmIGMgPj4gNCA9PSAweDBFKSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggPSAzO1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgLy8gMTExMTBYWFhcbiAgICBpZiAoaSA8PSAzICYmIGMgPj4gMyA9PSAweDFFKSB7XG4gICAgICB0aGlzLmNoYXJMZW5ndGggPSA0O1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHRoaXMuY2hhclJlY2VpdmVkID0gaTtcbn07XG5cblN0cmluZ0RlY29kZXIucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICB2YXIgcmVzID0gJyc7XG4gIGlmIChidWZmZXIgJiYgYnVmZmVyLmxlbmd0aClcbiAgICByZXMgPSB0aGlzLndyaXRlKGJ1ZmZlcik7XG5cbiAgaWYgKHRoaXMuY2hhclJlY2VpdmVkKSB7XG4gICAgdmFyIGNyID0gdGhpcy5jaGFyUmVjZWl2ZWQ7XG4gICAgdmFyIGJ1ZiA9IHRoaXMuY2hhckJ1ZmZlcjtcbiAgICB2YXIgZW5jID0gdGhpcy5lbmNvZGluZztcbiAgICByZXMgKz0gYnVmLnNsaWNlKDAsIGNyKS50b1N0cmluZyhlbmMpO1xuICB9XG5cbiAgcmV0dXJuIHJlcztcbn07XG5cbmZ1bmN0aW9uIHBhc3NUaHJvdWdoV3JpdGUoYnVmZmVyKSB7XG4gIHJldHVybiBidWZmZXIudG9TdHJpbmcodGhpcy5lbmNvZGluZyk7XG59XG5cbmZ1bmN0aW9uIHV0ZjE2RGV0ZWN0SW5jb21wbGV0ZUNoYXIoYnVmZmVyKSB7XG4gIHRoaXMuY2hhclJlY2VpdmVkID0gYnVmZmVyLmxlbmd0aCAlIDI7XG4gIHRoaXMuY2hhckxlbmd0aCA9IHRoaXMuY2hhclJlY2VpdmVkID8gMiA6IDA7XG59XG5cbmZ1bmN0aW9uIGJhc2U2NERldGVjdEluY29tcGxldGVDaGFyKGJ1ZmZlcikge1xuICB0aGlzLmNoYXJSZWNlaXZlZCA9IGJ1ZmZlci5sZW5ndGggJSAzO1xuICB0aGlzLmNoYXJMZW5ndGggPSB0aGlzLmNoYXJSZWNlaXZlZCA/IDMgOiAwO1xufVxuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9saWIvX3N0cmVhbV9wYXNzdGhyb3VnaC5qc1wiKVxuIiwiZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvX3N0cmVhbV9yZWFkYWJsZS5qcycpO1xuZXhwb3J0cy5SZWFkYWJsZSA9IGV4cG9ydHM7XG5leHBvcnRzLldyaXRhYmxlID0gcmVxdWlyZSgnLi9saWIvX3N0cmVhbV93cml0YWJsZS5qcycpO1xuZXhwb3J0cy5EdXBsZXggPSByZXF1aXJlKCcuL2xpYi9fc3RyZWFtX2R1cGxleC5qcycpO1xuZXhwb3J0cy5UcmFuc2Zvcm0gPSByZXF1aXJlKCcuL2xpYi9fc3RyZWFtX3RyYW5zZm9ybS5qcycpO1xuZXhwb3J0cy5QYXNzVGhyb3VnaCA9IHJlcXVpcmUoJy4vbGliL19zdHJlYW1fcGFzc3Rocm91Z2guanMnKTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIi4vbGliL19zdHJlYW1fdHJhbnNmb3JtLmpzXCIpXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCIuL2xpYi9fc3RyZWFtX3dyaXRhYmxlLmpzXCIpXG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxubW9kdWxlLmV4cG9ydHMgPSBTdHJlYW07XG5cbnZhciBFRSA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmluaGVyaXRzKFN0cmVhbSwgRUUpO1xuU3RyZWFtLlJlYWRhYmxlID0gcmVxdWlyZSgncmVhZGFibGUtc3RyZWFtL3JlYWRhYmxlLmpzJyk7XG5TdHJlYW0uV3JpdGFibGUgPSByZXF1aXJlKCdyZWFkYWJsZS1zdHJlYW0vd3JpdGFibGUuanMnKTtcblN0cmVhbS5EdXBsZXggPSByZXF1aXJlKCdyZWFkYWJsZS1zdHJlYW0vZHVwbGV4LmpzJyk7XG5TdHJlYW0uVHJhbnNmb3JtID0gcmVxdWlyZSgncmVhZGFibGUtc3RyZWFtL3RyYW5zZm9ybS5qcycpO1xuU3RyZWFtLlBhc3NUaHJvdWdoID0gcmVxdWlyZSgncmVhZGFibGUtc3RyZWFtL3Bhc3N0aHJvdWdoLmpzJyk7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuNC54XG5TdHJlYW0uU3RyZWFtID0gU3RyZWFtO1xuXG5cblxuLy8gb2xkLXN0eWxlIHN0cmVhbXMuICBOb3RlIHRoYXQgdGhlIHBpcGUgbWV0aG9kICh0aGUgb25seSByZWxldmFudFxuLy8gcGFydCBvZiB0aGlzIGNsYXNzKSBpcyBvdmVycmlkZGVuIGluIHRoZSBSZWFkYWJsZSBjbGFzcy5cblxuZnVuY3Rpb24gU3RyZWFtKCkge1xuICBFRS5jYWxsKHRoaXMpO1xufVxuXG5TdHJlYW0ucHJvdG90eXBlLnBpcGUgPSBmdW5jdGlvbihkZXN0LCBvcHRpb25zKSB7XG4gIHZhciBzb3VyY2UgPSB0aGlzO1xuXG4gIGZ1bmN0aW9uIG9uZGF0YShjaHVuaykge1xuICAgIGlmIChkZXN0LndyaXRhYmxlKSB7XG4gICAgICBpZiAoZmFsc2UgPT09IGRlc3Qud3JpdGUoY2h1bmspICYmIHNvdXJjZS5wYXVzZSkge1xuICAgICAgICBzb3VyY2UucGF1c2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzb3VyY2Uub24oJ2RhdGEnLCBvbmRhdGEpO1xuXG4gIGZ1bmN0aW9uIG9uZHJhaW4oKSB7XG4gICAgaWYgKHNvdXJjZS5yZWFkYWJsZSAmJiBzb3VyY2UucmVzdW1lKSB7XG4gICAgICBzb3VyY2UucmVzdW1lKCk7XG4gICAgfVxuICB9XG5cbiAgZGVzdC5vbignZHJhaW4nLCBvbmRyYWluKTtcblxuICAvLyBJZiB0aGUgJ2VuZCcgb3B0aW9uIGlzIG5vdCBzdXBwbGllZCwgZGVzdC5lbmQoKSB3aWxsIGJlIGNhbGxlZCB3aGVuXG4gIC8vIHNvdXJjZSBnZXRzIHRoZSAnZW5kJyBvciAnY2xvc2UnIGV2ZW50cy4gIE9ubHkgZGVzdC5lbmQoKSBvbmNlLlxuICBpZiAoIWRlc3QuX2lzU3RkaW8gJiYgKCFvcHRpb25zIHx8IG9wdGlvbnMuZW5kICE9PSBmYWxzZSkpIHtcbiAgICBzb3VyY2Uub24oJ2VuZCcsIG9uZW5kKTtcbiAgICBzb3VyY2Uub24oJ2Nsb3NlJywgb25jbG9zZSk7XG4gIH1cblxuICB2YXIgZGlkT25FbmQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gb25lbmQoKSB7XG4gICAgaWYgKGRpZE9uRW5kKSByZXR1cm47XG4gICAgZGlkT25FbmQgPSB0cnVlO1xuXG4gICAgZGVzdC5lbmQoKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gb25jbG9zZSgpIHtcbiAgICBpZiAoZGlkT25FbmQpIHJldHVybjtcbiAgICBkaWRPbkVuZCA9IHRydWU7XG5cbiAgICBpZiAodHlwZW9mIGRlc3QuZGVzdHJveSA9PT0gJ2Z1bmN0aW9uJykgZGVzdC5kZXN0cm95KCk7XG4gIH1cblxuICAvLyBkb24ndCBsZWF2ZSBkYW5nbGluZyBwaXBlcyB3aGVuIHRoZXJlIGFyZSBlcnJvcnMuXG4gIGZ1bmN0aW9uIG9uZXJyb3IoZXIpIHtcbiAgICBjbGVhbnVwKCk7XG4gICAgaWYgKEVFLmxpc3RlbmVyQ291bnQodGhpcywgJ2Vycm9yJykgPT09IDApIHtcbiAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgc3RyZWFtIGVycm9yIGluIHBpcGUuXG4gICAgfVxuICB9XG5cbiAgc291cmNlLm9uKCdlcnJvcicsIG9uZXJyb3IpO1xuICBkZXN0Lm9uKCdlcnJvcicsIG9uZXJyb3IpO1xuXG4gIC8vIHJlbW92ZSBhbGwgdGhlIGV2ZW50IGxpc3RlbmVycyB0aGF0IHdlcmUgYWRkZWQuXG4gIGZ1bmN0aW9uIGNsZWFudXAoKSB7XG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdkYXRhJywgb25kYXRhKTtcbiAgICBkZXN0LnJlbW92ZUxpc3RlbmVyKCdkcmFpbicsIG9uZHJhaW4pO1xuXG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdlbmQnLCBvbmVuZCk7XG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdjbG9zZScsIG9uY2xvc2UpO1xuXG4gICAgc291cmNlLnJlbW92ZUxpc3RlbmVyKCdlcnJvcicsIG9uZXJyb3IpO1xuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Vycm9yJywgb25lcnJvcik7XG5cbiAgICBzb3VyY2UucmVtb3ZlTGlzdGVuZXIoJ2VuZCcsIGNsZWFudXApO1xuICAgIHNvdXJjZS5yZW1vdmVMaXN0ZW5lcignY2xvc2UnLCBjbGVhbnVwKTtcblxuICAgIGRlc3QucmVtb3ZlTGlzdGVuZXIoJ2Nsb3NlJywgY2xlYW51cCk7XG4gIH1cblxuICBzb3VyY2Uub24oJ2VuZCcsIGNsZWFudXApO1xuICBzb3VyY2Uub24oJ2Nsb3NlJywgY2xlYW51cCk7XG5cbiAgZGVzdC5vbignY2xvc2UnLCBjbGVhbnVwKTtcblxuICBkZXN0LmVtaXQoJ3BpcGUnLCBzb3VyY2UpO1xuXG4gIC8vIEFsbG93IGZvciB1bml4LWxpa2UgdXNhZ2U6IEEucGlwZShCKS5waXBlKEMpXG4gIHJldHVybiBkZXN0O1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNCdWZmZXIoYXJnKSB7XG4gIHJldHVybiBhcmcgJiYgdHlwZW9mIGFyZyA9PT0gJ29iamVjdCdcbiAgICAmJiB0eXBlb2YgYXJnLmNvcHkgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLmZpbGwgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLnJlYWRVSW50OCA9PT0gJ2Z1bmN0aW9uJztcbn0iLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsKXtcbi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJGV2FBU0hcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIlwidXNlIHN0cmljdFwiO1xudmFyIFByb21pc2UgPSByZXF1aXJlKFwiLi9wcm9taXNlL3Byb21pc2VcIikuUHJvbWlzZTtcbnZhciBwb2x5ZmlsbCA9IHJlcXVpcmUoXCIuL3Byb21pc2UvcG9seWZpbGxcIikucG9seWZpbGw7XG5leHBvcnRzLlByb21pc2UgPSBQcm9taXNlO1xuZXhwb3J0cy5wb2x5ZmlsbCA9IHBvbHlmaWxsOyIsIlwidXNlIHN0cmljdFwiO1xuLyogZ2xvYmFsIHRvU3RyaW5nICovXG5cbnZhciBpc0FycmF5ID0gcmVxdWlyZShcIi4vdXRpbHNcIikuaXNBcnJheTtcbnZhciBpc0Z1bmN0aW9uID0gcmVxdWlyZShcIi4vdXRpbHNcIikuaXNGdW5jdGlvbjtcblxuLyoqXG4gIFJldHVybnMgYSBwcm9taXNlIHRoYXQgaXMgZnVsZmlsbGVkIHdoZW4gYWxsIHRoZSBnaXZlbiBwcm9taXNlcyBoYXZlIGJlZW5cbiAgZnVsZmlsbGVkLCBvciByZWplY3RlZCBpZiBhbnkgb2YgdGhlbSBiZWNvbWUgcmVqZWN0ZWQuIFRoZSByZXR1cm4gcHJvbWlzZVxuICBpcyBmdWxmaWxsZWQgd2l0aCBhbiBhcnJheSB0aGF0IGdpdmVzIGFsbCB0aGUgdmFsdWVzIGluIHRoZSBvcmRlciB0aGV5IHdlcmVcbiAgcGFzc2VkIGluIHRoZSBgcHJvbWlzZXNgIGFycmF5IGFyZ3VtZW50LlxuXG4gIEV4YW1wbGU6XG5cbiAgYGBgamF2YXNjcmlwdFxuICB2YXIgcHJvbWlzZTEgPSBSU1ZQLnJlc29sdmUoMSk7XG4gIHZhciBwcm9taXNlMiA9IFJTVlAucmVzb2x2ZSgyKTtcbiAgdmFyIHByb21pc2UzID0gUlNWUC5yZXNvbHZlKDMpO1xuICB2YXIgcHJvbWlzZXMgPSBbIHByb21pc2UxLCBwcm9taXNlMiwgcHJvbWlzZTMgXTtcblxuICBSU1ZQLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbihhcnJheSl7XG4gICAgLy8gVGhlIGFycmF5IGhlcmUgd291bGQgYmUgWyAxLCAyLCAzIF07XG4gIH0pO1xuICBgYGBcblxuICBJZiBhbnkgb2YgdGhlIGBwcm9taXNlc2AgZ2l2ZW4gdG8gYFJTVlAuYWxsYCBhcmUgcmVqZWN0ZWQsIHRoZSBmaXJzdCBwcm9taXNlXG4gIHRoYXQgaXMgcmVqZWN0ZWQgd2lsbCBiZSBnaXZlbiBhcyBhbiBhcmd1bWVudCB0byB0aGUgcmV0dXJuZWQgcHJvbWlzZXMnc1xuICByZWplY3Rpb24gaGFuZGxlci4gRm9yIGV4YW1wbGU6XG5cbiAgRXhhbXBsZTpcblxuICBgYGBqYXZhc2NyaXB0XG4gIHZhciBwcm9taXNlMSA9IFJTVlAucmVzb2x2ZSgxKTtcbiAgdmFyIHByb21pc2UyID0gUlNWUC5yZWplY3QobmV3IEVycm9yKFwiMlwiKSk7XG4gIHZhciBwcm9taXNlMyA9IFJTVlAucmVqZWN0KG5ldyBFcnJvcihcIjNcIikpO1xuICB2YXIgcHJvbWlzZXMgPSBbIHByb21pc2UxLCBwcm9taXNlMiwgcHJvbWlzZTMgXTtcblxuICBSU1ZQLmFsbChwcm9taXNlcykudGhlbihmdW5jdGlvbihhcnJheSl7XG4gICAgLy8gQ29kZSBoZXJlIG5ldmVyIHJ1bnMgYmVjYXVzZSB0aGVyZSBhcmUgcmVqZWN0ZWQgcHJvbWlzZXMhXG4gIH0sIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgLy8gZXJyb3IubWVzc2FnZSA9PT0gXCIyXCJcbiAgfSk7XG4gIGBgYFxuXG4gIEBtZXRob2QgYWxsXG4gIEBmb3IgUlNWUFxuICBAcGFyYW0ge0FycmF5fSBwcm9taXNlc1xuICBAcGFyYW0ge1N0cmluZ30gbGFiZWxcbiAgQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSB0aGF0IGlzIGZ1bGZpbGxlZCB3aGVuIGFsbCBgcHJvbWlzZXNgIGhhdmUgYmVlblxuICBmdWxmaWxsZWQsIG9yIHJlamVjdGVkIGlmIGFueSBvZiB0aGVtIGJlY29tZSByZWplY3RlZC5cbiovXG5mdW5jdGlvbiBhbGwocHJvbWlzZXMpIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIFByb21pc2UgPSB0aGlzO1xuXG4gIGlmICghaXNBcnJheShwcm9taXNlcykpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdZb3UgbXVzdCBwYXNzIGFuIGFycmF5IHRvIGFsbC4nKTtcbiAgfVxuXG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdLCByZW1haW5pbmcgPSBwcm9taXNlcy5sZW5ndGgsXG4gICAgcHJvbWlzZTtcblxuICAgIGlmIChyZW1haW5pbmcgPT09IDApIHtcbiAgICAgIHJlc29sdmUoW10pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlc29sdmVyKGluZGV4KSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgcmVzb2x2ZUFsbChpbmRleCwgdmFsdWUpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXNvbHZlQWxsKGluZGV4LCB2YWx1ZSkge1xuICAgICAgcmVzdWx0c1tpbmRleF0gPSB2YWx1ZTtcbiAgICAgIGlmICgtLXJlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICByZXNvbHZlKHJlc3VsdHMpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJvbWlzZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHByb21pc2UgPSBwcm9taXNlc1tpXTtcblxuICAgICAgaWYgKHByb21pc2UgJiYgaXNGdW5jdGlvbihwcm9taXNlLnRoZW4pKSB7XG4gICAgICAgIHByb21pc2UudGhlbihyZXNvbHZlcihpKSwgcmVqZWN0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc29sdmVBbGwoaSwgcHJvbWlzZSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cblxuZXhwb3J0cy5hbGwgPSBhbGw7IiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG5cInVzZSBzdHJpY3RcIjtcbnZhciBicm93c2VyR2xvYmFsID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSA/IHdpbmRvdyA6IHt9O1xudmFyIEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyID0gYnJvd3Nlckdsb2JhbC5NdXRhdGlvbk9ic2VydmVyIHx8IGJyb3dzZXJHbG9iYWwuV2ViS2l0TXV0YXRpb25PYnNlcnZlcjtcbnZhciBsb2NhbCA9ICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJykgPyBnbG9iYWwgOiAodGhpcyA9PT0gdW5kZWZpbmVkPyB3aW5kb3c6dGhpcyk7XG5cbi8vIG5vZGVcbmZ1bmN0aW9uIHVzZU5leHRUaWNrKCkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgcHJvY2Vzcy5uZXh0VGljayhmbHVzaCk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHVzZU11dGF0aW9uT2JzZXJ2ZXIoKSB7XG4gIHZhciBpdGVyYXRpb25zID0gMDtcbiAgdmFyIG9ic2VydmVyID0gbmV3IEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKGZsdXNoKTtcbiAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gIG9ic2VydmVyLm9ic2VydmUobm9kZSwgeyBjaGFyYWN0ZXJEYXRhOiB0cnVlIH0pO1xuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICBub2RlLmRhdGEgPSAoaXRlcmF0aW9ucyA9ICsraXRlcmF0aW9ucyAlIDIpO1xuICB9O1xufVxuXG5mdW5jdGlvbiB1c2VTZXRUaW1lb3V0KCkge1xuICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgbG9jYWwuc2V0VGltZW91dChmbHVzaCwgMSk7XG4gIH07XG59XG5cbnZhciBxdWV1ZSA9IFtdO1xuZnVuY3Rpb24gZmx1c2goKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcXVldWUubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgdHVwbGUgPSBxdWV1ZVtpXTtcbiAgICB2YXIgY2FsbGJhY2sgPSB0dXBsZVswXSwgYXJnID0gdHVwbGVbMV07XG4gICAgY2FsbGJhY2soYXJnKTtcbiAgfVxuICBxdWV1ZSA9IFtdO1xufVxuXG52YXIgc2NoZWR1bGVGbHVzaDtcblxuLy8gRGVjaWRlIHdoYXQgYXN5bmMgbWV0aG9kIHRvIHVzZSB0byB0cmlnZ2VyaW5nIHByb2Nlc3Npbmcgb2YgcXVldWVkIGNhbGxiYWNrczpcbmlmICh0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYge30udG9TdHJpbmcuY2FsbChwcm9jZXNzKSA9PT0gJ1tvYmplY3QgcHJvY2Vzc10nKSB7XG4gIHNjaGVkdWxlRmx1c2ggPSB1c2VOZXh0VGljaygpO1xufSBlbHNlIGlmIChCcm93c2VyTXV0YXRpb25PYnNlcnZlcikge1xuICBzY2hlZHVsZUZsdXNoID0gdXNlTXV0YXRpb25PYnNlcnZlcigpO1xufSBlbHNlIHtcbiAgc2NoZWR1bGVGbHVzaCA9IHVzZVNldFRpbWVvdXQoKTtcbn1cblxuZnVuY3Rpb24gYXNhcChjYWxsYmFjaywgYXJnKSB7XG4gIHZhciBsZW5ndGggPSBxdWV1ZS5wdXNoKFtjYWxsYmFjaywgYXJnXSk7XG4gIGlmIChsZW5ndGggPT09IDEpIHtcbiAgICAvLyBJZiBsZW5ndGggaXMgMSwgdGhhdCBtZWFucyB0aGF0IHdlIG5lZWQgdG8gc2NoZWR1bGUgYW4gYXN5bmMgZmx1c2guXG4gICAgLy8gSWYgYWRkaXRpb25hbCBjYWxsYmFja3MgYXJlIHF1ZXVlZCBiZWZvcmUgdGhlIHF1ZXVlIGlzIGZsdXNoZWQsIHRoZXlcbiAgICAvLyB3aWxsIGJlIHByb2Nlc3NlZCBieSB0aGlzIGZsdXNoIHRoYXQgd2UgYXJlIHNjaGVkdWxpbmcuXG4gICAgc2NoZWR1bGVGbHVzaCgpO1xuICB9XG59XG5cbmV4cG9ydHMuYXNhcCA9IGFzYXA7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcIkZXYUFTSFwiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgY29uZmlnID0ge1xuICBpbnN0cnVtZW50OiBmYWxzZVxufTtcblxuZnVuY3Rpb24gY29uZmlndXJlKG5hbWUsIHZhbHVlKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgY29uZmlnW25hbWVdID0gdmFsdWU7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGNvbmZpZ1tuYW1lXTtcbiAgfVxufVxuXG5leHBvcnRzLmNvbmZpZyA9IGNvbmZpZztcbmV4cG9ydHMuY29uZmlndXJlID0gY29uZmlndXJlOyIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcblwidXNlIHN0cmljdFwiO1xuLypnbG9iYWwgc2VsZiovXG52YXIgUlNWUFByb21pc2UgPSByZXF1aXJlKFwiLi9wcm9taXNlXCIpLlByb21pc2U7XG52YXIgaXNGdW5jdGlvbiA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpLmlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIHBvbHlmaWxsKCkge1xuICB2YXIgbG9jYWw7XG5cbiAgaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbG9jYWwgPSBnbG9iYWw7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmRvY3VtZW50KSB7XG4gICAgbG9jYWwgPSB3aW5kb3c7XG4gIH0gZWxzZSB7XG4gICAgbG9jYWwgPSBzZWxmO1xuICB9XG5cbiAgdmFyIGVzNlByb21pc2VTdXBwb3J0ID0gXG4gICAgXCJQcm9taXNlXCIgaW4gbG9jYWwgJiZcbiAgICAvLyBTb21lIG9mIHRoZXNlIG1ldGhvZHMgYXJlIG1pc3NpbmcgZnJvbVxuICAgIC8vIEZpcmVmb3gvQ2hyb21lIGV4cGVyaW1lbnRhbCBpbXBsZW1lbnRhdGlvbnNcbiAgICBcInJlc29sdmVcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgXCJyZWplY3RcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgXCJhbGxcIiBpbiBsb2NhbC5Qcm9taXNlICYmXG4gICAgXCJyYWNlXCIgaW4gbG9jYWwuUHJvbWlzZSAmJlxuICAgIC8vIE9sZGVyIHZlcnNpb24gb2YgdGhlIHNwZWMgaGFkIGEgcmVzb2x2ZXIgb2JqZWN0XG4gICAgLy8gYXMgdGhlIGFyZyByYXRoZXIgdGhhbiBhIGZ1bmN0aW9uXG4gICAgKGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJlc29sdmU7XG4gICAgICBuZXcgbG9jYWwuUHJvbWlzZShmdW5jdGlvbihyKSB7IHJlc29sdmUgPSByOyB9KTtcbiAgICAgIHJldHVybiBpc0Z1bmN0aW9uKHJlc29sdmUpO1xuICAgIH0oKSk7XG5cbiAgaWYgKCFlczZQcm9taXNlU3VwcG9ydCkge1xuICAgIGxvY2FsLlByb21pc2UgPSBSU1ZQUHJvbWlzZTtcbiAgfVxufVxuXG5leHBvcnRzLnBvbHlmaWxsID0gcG9seWZpbGw7XG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIlwidXNlIHN0cmljdFwiO1xudmFyIGNvbmZpZyA9IHJlcXVpcmUoXCIuL2NvbmZpZ1wiKS5jb25maWc7XG52YXIgY29uZmlndXJlID0gcmVxdWlyZShcIi4vY29uZmlnXCIpLmNvbmZpZ3VyZTtcbnZhciBvYmplY3RPckZ1bmN0aW9uID0gcmVxdWlyZShcIi4vdXRpbHNcIikub2JqZWN0T3JGdW5jdGlvbjtcbnZhciBpc0Z1bmN0aW9uID0gcmVxdWlyZShcIi4vdXRpbHNcIikuaXNGdW5jdGlvbjtcbnZhciBub3cgPSByZXF1aXJlKFwiLi91dGlsc1wiKS5ub3c7XG52YXIgYWxsID0gcmVxdWlyZShcIi4vYWxsXCIpLmFsbDtcbnZhciByYWNlID0gcmVxdWlyZShcIi4vcmFjZVwiKS5yYWNlO1xudmFyIHN0YXRpY1Jlc29sdmUgPSByZXF1aXJlKFwiLi9yZXNvbHZlXCIpLnJlc29sdmU7XG52YXIgc3RhdGljUmVqZWN0ID0gcmVxdWlyZShcIi4vcmVqZWN0XCIpLnJlamVjdDtcbnZhciBhc2FwID0gcmVxdWlyZShcIi4vYXNhcFwiKS5hc2FwO1xuXG52YXIgY291bnRlciA9IDA7XG5cbmNvbmZpZy5hc3luYyA9IGFzYXA7IC8vIGRlZmF1bHQgYXN5bmMgaXMgYXNhcDtcblxuZnVuY3Rpb24gUHJvbWlzZShyZXNvbHZlcikge1xuICBpZiAoIWlzRnVuY3Rpb24ocmVzb2x2ZXIpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhIHJlc29sdmVyIGZ1bmN0aW9uIGFzIHRoZSBmaXJzdCBhcmd1bWVudCB0byB0aGUgcHJvbWlzZSBjb25zdHJ1Y3RvcicpO1xuICB9XG5cbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFByb21pc2UpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZhaWxlZCB0byBjb25zdHJ1Y3QgJ1Byb21pc2UnOiBQbGVhc2UgdXNlIHRoZSAnbmV3JyBvcGVyYXRvciwgdGhpcyBvYmplY3QgY29uc3RydWN0b3IgY2Fubm90IGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLlwiKTtcbiAgfVxuXG4gIHRoaXMuX3N1YnNjcmliZXJzID0gW107XG5cbiAgaW52b2tlUmVzb2x2ZXIocmVzb2x2ZXIsIHRoaXMpO1xufVxuXG5mdW5jdGlvbiBpbnZva2VSZXNvbHZlcihyZXNvbHZlciwgcHJvbWlzZSkge1xuICBmdW5jdGlvbiByZXNvbHZlUHJvbWlzZSh2YWx1ZSkge1xuICAgIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVqZWN0UHJvbWlzZShyZWFzb24pIHtcbiAgICByZWplY3QocHJvbWlzZSwgcmVhc29uKTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgcmVzb2x2ZXIocmVzb2x2ZVByb21pc2UsIHJlamVjdFByb21pc2UpO1xuICB9IGNhdGNoKGUpIHtcbiAgICByZWplY3RQcm9taXNlKGUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGludm9rZUNhbGxiYWNrKHNldHRsZWQsIHByb21pc2UsIGNhbGxiYWNrLCBkZXRhaWwpIHtcbiAgdmFyIGhhc0NhbGxiYWNrID0gaXNGdW5jdGlvbihjYWxsYmFjayksXG4gICAgICB2YWx1ZSwgZXJyb3IsIHN1Y2NlZWRlZCwgZmFpbGVkO1xuXG4gIGlmIChoYXNDYWxsYmFjaykge1xuICAgIHRyeSB7XG4gICAgICB2YWx1ZSA9IGNhbGxiYWNrKGRldGFpbCk7XG4gICAgICBzdWNjZWVkZWQgPSB0cnVlO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgZmFpbGVkID0gdHJ1ZTtcbiAgICAgIGVycm9yID0gZTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFsdWUgPSBkZXRhaWw7XG4gICAgc3VjY2VlZGVkID0gdHJ1ZTtcbiAgfVxuXG4gIGlmIChoYW5kbGVUaGVuYWJsZShwcm9taXNlLCB2YWx1ZSkpIHtcbiAgICByZXR1cm47XG4gIH0gZWxzZSBpZiAoaGFzQ2FsbGJhY2sgJiYgc3VjY2VlZGVkKSB7XG4gICAgcmVzb2x2ZShwcm9taXNlLCB2YWx1ZSk7XG4gIH0gZWxzZSBpZiAoZmFpbGVkKSB7XG4gICAgcmVqZWN0KHByb21pc2UsIGVycm9yKTtcbiAgfSBlbHNlIGlmIChzZXR0bGVkID09PSBGVUxGSUxMRUQpIHtcbiAgICByZXNvbHZlKHByb21pc2UsIHZhbHVlKTtcbiAgfSBlbHNlIGlmIChzZXR0bGVkID09PSBSRUpFQ1RFRCkge1xuICAgIHJlamVjdChwcm9taXNlLCB2YWx1ZSk7XG4gIH1cbn1cblxudmFyIFBFTkRJTkcgICA9IHZvaWQgMDtcbnZhciBTRUFMRUQgICAgPSAwO1xudmFyIEZVTEZJTExFRCA9IDE7XG52YXIgUkVKRUNURUQgID0gMjtcblxuZnVuY3Rpb24gc3Vic2NyaWJlKHBhcmVudCwgY2hpbGQsIG9uRnVsZmlsbG1lbnQsIG9uUmVqZWN0aW9uKSB7XG4gIHZhciBzdWJzY3JpYmVycyA9IHBhcmVudC5fc3Vic2NyaWJlcnM7XG4gIHZhciBsZW5ndGggPSBzdWJzY3JpYmVycy5sZW5ndGg7XG5cbiAgc3Vic2NyaWJlcnNbbGVuZ3RoXSA9IGNoaWxkO1xuICBzdWJzY3JpYmVyc1tsZW5ndGggKyBGVUxGSUxMRURdID0gb25GdWxmaWxsbWVudDtcbiAgc3Vic2NyaWJlcnNbbGVuZ3RoICsgUkVKRUNURURdICA9IG9uUmVqZWN0aW9uO1xufVxuXG5mdW5jdGlvbiBwdWJsaXNoKHByb21pc2UsIHNldHRsZWQpIHtcbiAgdmFyIGNoaWxkLCBjYWxsYmFjaywgc3Vic2NyaWJlcnMgPSBwcm9taXNlLl9zdWJzY3JpYmVycywgZGV0YWlsID0gcHJvbWlzZS5fZGV0YWlsO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3Vic2NyaWJlcnMubGVuZ3RoOyBpICs9IDMpIHtcbiAgICBjaGlsZCA9IHN1YnNjcmliZXJzW2ldO1xuICAgIGNhbGxiYWNrID0gc3Vic2NyaWJlcnNbaSArIHNldHRsZWRdO1xuXG4gICAgaW52b2tlQ2FsbGJhY2soc2V0dGxlZCwgY2hpbGQsIGNhbGxiYWNrLCBkZXRhaWwpO1xuICB9XG5cbiAgcHJvbWlzZS5fc3Vic2NyaWJlcnMgPSBudWxsO1xufVxuXG5Qcm9taXNlLnByb3RvdHlwZSA9IHtcbiAgY29uc3RydWN0b3I6IFByb21pc2UsXG5cbiAgX3N0YXRlOiB1bmRlZmluZWQsXG4gIF9kZXRhaWw6IHVuZGVmaW5lZCxcbiAgX3N1YnNjcmliZXJzOiB1bmRlZmluZWQsXG5cbiAgdGhlbjogZnVuY3Rpb24ob25GdWxmaWxsbWVudCwgb25SZWplY3Rpb24pIHtcbiAgICB2YXIgcHJvbWlzZSA9IHRoaXM7XG5cbiAgICB2YXIgdGhlblByb21pc2UgPSBuZXcgdGhpcy5jb25zdHJ1Y3RvcihmdW5jdGlvbigpIHt9KTtcblxuICAgIGlmICh0aGlzLl9zdGF0ZSkge1xuICAgICAgdmFyIGNhbGxiYWNrcyA9IGFyZ3VtZW50cztcbiAgICAgIGNvbmZpZy5hc3luYyhmdW5jdGlvbiBpbnZva2VQcm9taXNlQ2FsbGJhY2soKSB7XG4gICAgICAgIGludm9rZUNhbGxiYWNrKHByb21pc2UuX3N0YXRlLCB0aGVuUHJvbWlzZSwgY2FsbGJhY2tzW3Byb21pc2UuX3N0YXRlIC0gMV0sIHByb21pc2UuX2RldGFpbCk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3Vic2NyaWJlKHRoaXMsIHRoZW5Qcm9taXNlLCBvbkZ1bGZpbGxtZW50LCBvblJlamVjdGlvbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoZW5Qcm9taXNlO1xuICB9LFxuXG4gICdjYXRjaCc6IGZ1bmN0aW9uKG9uUmVqZWN0aW9uKSB7XG4gICAgcmV0dXJuIHRoaXMudGhlbihudWxsLCBvblJlamVjdGlvbik7XG4gIH1cbn07XG5cblByb21pc2UuYWxsID0gYWxsO1xuUHJvbWlzZS5yYWNlID0gcmFjZTtcblByb21pc2UucmVzb2x2ZSA9IHN0YXRpY1Jlc29sdmU7XG5Qcm9taXNlLnJlamVjdCA9IHN0YXRpY1JlamVjdDtcblxuZnVuY3Rpb24gaGFuZGxlVGhlbmFibGUocHJvbWlzZSwgdmFsdWUpIHtcbiAgdmFyIHRoZW4gPSBudWxsLFxuICByZXNvbHZlZDtcblxuICB0cnkge1xuICAgIGlmIChwcm9taXNlID09PSB2YWx1ZSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkEgcHJvbWlzZXMgY2FsbGJhY2sgY2Fubm90IHJldHVybiB0aGF0IHNhbWUgcHJvbWlzZS5cIik7XG4gICAgfVxuXG4gICAgaWYgKG9iamVjdE9yRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB0aGVuID0gdmFsdWUudGhlbjtcblxuICAgICAgaWYgKGlzRnVuY3Rpb24odGhlbikpIHtcbiAgICAgICAgdGhlbi5jYWxsKHZhbHVlLCBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICBpZiAocmVzb2x2ZWQpIHsgcmV0dXJuIHRydWU7IH1cbiAgICAgICAgICByZXNvbHZlZCA9IHRydWU7XG5cbiAgICAgICAgICBpZiAodmFsdWUgIT09IHZhbCkge1xuICAgICAgICAgICAgcmVzb2x2ZShwcm9taXNlLCB2YWwpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmdWxmaWxsKHByb21pc2UsIHZhbCk7XG4gICAgICAgICAgfVxuICAgICAgICB9LCBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgICBpZiAocmVzb2x2ZWQpIHsgcmV0dXJuIHRydWU7IH1cbiAgICAgICAgICByZXNvbHZlZCA9IHRydWU7XG5cbiAgICAgICAgICByZWplY3QocHJvbWlzZSwgdmFsKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChyZXNvbHZlZCkgeyByZXR1cm4gdHJ1ZTsgfVxuICAgIHJlamVjdChwcm9taXNlLCBlcnJvcik7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmUocHJvbWlzZSwgdmFsdWUpIHtcbiAgaWYgKHByb21pc2UgPT09IHZhbHVlKSB7XG4gICAgZnVsZmlsbChwcm9taXNlLCB2YWx1ZSk7XG4gIH0gZWxzZSBpZiAoIWhhbmRsZVRoZW5hYmxlKHByb21pc2UsIHZhbHVlKSkge1xuICAgIGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGZ1bGZpbGwocHJvbWlzZSwgdmFsdWUpIHtcbiAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBQRU5ESU5HKSB7IHJldHVybjsgfVxuICBwcm9taXNlLl9zdGF0ZSA9IFNFQUxFRDtcbiAgcHJvbWlzZS5fZGV0YWlsID0gdmFsdWU7XG5cbiAgY29uZmlnLmFzeW5jKHB1Ymxpc2hGdWxmaWxsbWVudCwgcHJvbWlzZSk7XG59XG5cbmZ1bmN0aW9uIHJlamVjdChwcm9taXNlLCByZWFzb24pIHtcbiAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBQRU5ESU5HKSB7IHJldHVybjsgfVxuICBwcm9taXNlLl9zdGF0ZSA9IFNFQUxFRDtcbiAgcHJvbWlzZS5fZGV0YWlsID0gcmVhc29uO1xuXG4gIGNvbmZpZy5hc3luYyhwdWJsaXNoUmVqZWN0aW9uLCBwcm9taXNlKTtcbn1cblxuZnVuY3Rpb24gcHVibGlzaEZ1bGZpbGxtZW50KHByb21pc2UpIHtcbiAgcHVibGlzaChwcm9taXNlLCBwcm9taXNlLl9zdGF0ZSA9IEZVTEZJTExFRCk7XG59XG5cbmZ1bmN0aW9uIHB1Ymxpc2hSZWplY3Rpb24ocHJvbWlzZSkge1xuICBwdWJsaXNoKHByb21pc2UsIHByb21pc2UuX3N0YXRlID0gUkVKRUNURUQpO1xufVxuXG5leHBvcnRzLlByb21pc2UgPSBQcm9taXNlOyIsIlwidXNlIHN0cmljdFwiO1xuLyogZ2xvYmFsIHRvU3RyaW5nICovXG52YXIgaXNBcnJheSA9IHJlcXVpcmUoXCIuL3V0aWxzXCIpLmlzQXJyYXk7XG5cbi8qKlxuICBgUlNWUC5yYWNlYCBhbGxvd3MgeW91IHRvIHdhdGNoIGEgc2VyaWVzIG9mIHByb21pc2VzIGFuZCBhY3QgYXMgc29vbiBhcyB0aGVcbiAgZmlyc3QgcHJvbWlzZSBnaXZlbiB0byB0aGUgYHByb21pc2VzYCBhcmd1bWVudCBmdWxmaWxscyBvciByZWplY3RzLlxuXG4gIEV4YW1wbGU6XG5cbiAgYGBgamF2YXNjcmlwdFxuICB2YXIgcHJvbWlzZTEgPSBuZXcgUlNWUC5Qcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmVzb2x2ZShcInByb21pc2UgMVwiKTtcbiAgICB9LCAyMDApO1xuICB9KTtcblxuICB2YXIgcHJvbWlzZTIgPSBuZXcgUlNWUC5Qcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgcmVzb2x2ZShcInByb21pc2UgMlwiKTtcbiAgICB9LCAxMDApO1xuICB9KTtcblxuICBSU1ZQLnJhY2UoW3Byb21pc2UxLCBwcm9taXNlMl0pLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAvLyByZXN1bHQgPT09IFwicHJvbWlzZSAyXCIgYmVjYXVzZSBpdCB3YXMgcmVzb2x2ZWQgYmVmb3JlIHByb21pc2UxXG4gICAgLy8gd2FzIHJlc29sdmVkLlxuICB9KTtcbiAgYGBgXG5cbiAgYFJTVlAucmFjZWAgaXMgZGV0ZXJtaW5pc3RpYyBpbiB0aGF0IG9ubHkgdGhlIHN0YXRlIG9mIHRoZSBmaXJzdCBjb21wbGV0ZWRcbiAgcHJvbWlzZSBtYXR0ZXJzLiBGb3IgZXhhbXBsZSwgZXZlbiBpZiBvdGhlciBwcm9taXNlcyBnaXZlbiB0byB0aGUgYHByb21pc2VzYFxuICBhcnJheSBhcmd1bWVudCBhcmUgcmVzb2x2ZWQsIGJ1dCB0aGUgZmlyc3QgY29tcGxldGVkIHByb21pc2UgaGFzIGJlY29tZVxuICByZWplY3RlZCBiZWZvcmUgdGhlIG90aGVyIHByb21pc2VzIGJlY2FtZSBmdWxmaWxsZWQsIHRoZSByZXR1cm5lZCBwcm9taXNlXG4gIHdpbGwgYmVjb21lIHJlamVjdGVkOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgdmFyIHByb21pc2UxID0gbmV3IFJTVlAuUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlc29sdmUoXCJwcm9taXNlIDFcIik7XG4gICAgfSwgMjAwKTtcbiAgfSk7XG5cbiAgdmFyIHByb21pc2UyID0gbmV3IFJTVlAuUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3Qpe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgIHJlamVjdChuZXcgRXJyb3IoXCJwcm9taXNlIDJcIikpO1xuICAgIH0sIDEwMCk7XG4gIH0pO1xuXG4gIFJTVlAucmFjZShbcHJvbWlzZTEsIHByb21pc2UyXSkudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIC8vIENvZGUgaGVyZSBuZXZlciBydW5zIGJlY2F1c2UgdGhlcmUgYXJlIHJlamVjdGVkIHByb21pc2VzIVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSBcInByb21pc2UyXCIgYmVjYXVzZSBwcm9taXNlIDIgYmVjYW1lIHJlamVjdGVkIGJlZm9yZVxuICAgIC8vIHByb21pc2UgMSBiZWNhbWUgZnVsZmlsbGVkXG4gIH0pO1xuICBgYGBcblxuICBAbWV0aG9kIHJhY2VcbiAgQGZvciBSU1ZQXG4gIEBwYXJhbSB7QXJyYXl9IHByb21pc2VzIGFycmF5IG9mIHByb21pc2VzIHRvIG9ic2VydmVcbiAgQHBhcmFtIHtTdHJpbmd9IGxhYmVsIG9wdGlvbmFsIHN0cmluZyBmb3IgZGVzY3JpYmluZyB0aGUgcHJvbWlzZSByZXR1cm5lZC5cbiAgVXNlZnVsIGZvciB0b29saW5nLlxuICBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2UgdGhhdCBiZWNvbWVzIGZ1bGZpbGxlZCB3aXRoIHRoZSB2YWx1ZSB0aGUgZmlyc3RcbiAgY29tcGxldGVkIHByb21pc2VzIGlzIHJlc29sdmVkIHdpdGggaWYgdGhlIGZpcnN0IGNvbXBsZXRlZCBwcm9taXNlIHdhc1xuICBmdWxmaWxsZWQsIG9yIHJlamVjdGVkIHdpdGggdGhlIHJlYXNvbiB0aGF0IHRoZSBmaXJzdCBjb21wbGV0ZWQgcHJvbWlzZVxuICB3YXMgcmVqZWN0ZWQgd2l0aC5cbiovXG5mdW5jdGlvbiByYWNlKHByb21pc2VzKSB7XG4gIC8qanNoaW50IHZhbGlkdGhpczp0cnVlICovXG4gIHZhciBQcm9taXNlID0gdGhpcztcblxuICBpZiAoIWlzQXJyYXkocHJvbWlzZXMpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignWW91IG11c3QgcGFzcyBhbiBhcnJheSB0byByYWNlLicpO1xuICB9XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdLCBwcm9taXNlO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9taXNlcy5sZW5ndGg7IGkrKykge1xuICAgICAgcHJvbWlzZSA9IHByb21pc2VzW2ldO1xuXG4gICAgICBpZiAocHJvbWlzZSAmJiB0eXBlb2YgcHJvbWlzZS50aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHByb21pc2UudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZShwcm9taXNlKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuXG5leHBvcnRzLnJhY2UgPSByYWNlOyIsIlwidXNlIHN0cmljdFwiO1xuLyoqXG4gIGBSU1ZQLnJlamVjdGAgcmV0dXJucyBhIHByb21pc2UgdGhhdCB3aWxsIGJlY29tZSByZWplY3RlZCB3aXRoIHRoZSBwYXNzZWRcbiAgYHJlYXNvbmAuIGBSU1ZQLnJlamVjdGAgaXMgZXNzZW50aWFsbHkgc2hvcnRoYW5kIGZvciB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgdmFyIHByb21pc2UgPSBuZXcgUlNWUC5Qcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG4gICAgcmVqZWN0KG5ldyBFcnJvcignV0hPT1BTJykpO1xuICB9KTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIENvZGUgaGVyZSBkb2Vzbid0IHJ1biBiZWNhdXNlIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICB9KTtcbiAgYGBgXG5cbiAgSW5zdGVhZCBvZiB3cml0aW5nIHRoZSBhYm92ZSwgeW91ciBjb2RlIG5vdyBzaW1wbHkgYmVjb21lcyB0aGUgZm9sbG93aW5nOlxuXG4gIGBgYGphdmFzY3JpcHRcbiAgdmFyIHByb21pc2UgPSBSU1ZQLnJlamVjdChuZXcgRXJyb3IoJ1dIT09QUycpKTtcblxuICBwcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpe1xuICAgIC8vIENvZGUgaGVyZSBkb2Vzbid0IHJ1biBiZWNhdXNlIHRoZSBwcm9taXNlIGlzIHJlamVjdGVkIVxuICB9LCBmdW5jdGlvbihyZWFzb24pe1xuICAgIC8vIHJlYXNvbi5tZXNzYWdlID09PSAnV0hPT1BTJ1xuICB9KTtcbiAgYGBgXG5cbiAgQG1ldGhvZCByZWplY3RcbiAgQGZvciBSU1ZQXG4gIEBwYXJhbSB7QW55fSByZWFzb24gdmFsdWUgdGhhdCB0aGUgcmV0dXJuZWQgcHJvbWlzZSB3aWxsIGJlIHJlamVjdGVkIHdpdGguXG4gIEBwYXJhbSB7U3RyaW5nfSBsYWJlbCBvcHRpb25hbCBzdHJpbmcgZm9yIGlkZW50aWZ5aW5nIHRoZSByZXR1cm5lZCBwcm9taXNlLlxuICBVc2VmdWwgZm9yIHRvb2xpbmcuXG4gIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSB0aGF0IHdpbGwgYmVjb21lIHJlamVjdGVkIHdpdGggdGhlIGdpdmVuXG4gIGByZWFzb25gLlxuKi9cbmZ1bmN0aW9uIHJlamVjdChyZWFzb24pIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgdmFyIFByb21pc2UgPSB0aGlzO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgcmVqZWN0KHJlYXNvbik7XG4gIH0pO1xufVxuXG5leHBvcnRzLnJlamVjdCA9IHJlamVjdDsiLCJcInVzZSBzdHJpY3RcIjtcbmZ1bmN0aW9uIHJlc29sdmUodmFsdWUpIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUgKi9cbiAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgdmFsdWUuY29uc3RydWN0b3IgPT09IHRoaXMpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICB2YXIgUHJvbWlzZSA9IHRoaXM7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICByZXNvbHZlKHZhbHVlKTtcbiAgfSk7XG59XG5cbmV4cG9ydHMucmVzb2x2ZSA9IHJlc29sdmU7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5mdW5jdGlvbiBvYmplY3RPckZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIGlzRnVuY3Rpb24oeCkgfHwgKHR5cGVvZiB4ID09PSBcIm9iamVjdFwiICYmIHggIT09IG51bGwpO1xufVxuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHR5cGVvZiB4ID09PSBcImZ1bmN0aW9uXCI7XG59XG5cbmZ1bmN0aW9uIGlzQXJyYXkoeCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHgpID09PSBcIltvYmplY3QgQXJyYXldXCI7XG59XG5cbi8vIERhdGUubm93IGlzIG5vdCBhdmFpbGFibGUgaW4gYnJvd3NlcnMgPCBJRTlcbi8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL0RhdGUvbm93I0NvbXBhdGliaWxpdHlcbnZhciBub3cgPSBEYXRlLm5vdyB8fCBmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpOyB9O1xuXG5cbmV4cG9ydHMub2JqZWN0T3JGdW5jdGlvbiA9IG9iamVjdE9yRnVuY3Rpb247XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcbmV4cG9ydHMubm93ID0gbm93OyIsIi8vIEdlbmVyYXRlZCBieSBDb2ZmZWVTY3JpcHQgMS42LjNcbihmdW5jdGlvbigpIHtcbiAgdmFyIEV2ZW50RW1pdHRlciwgUG9zdGllLFxuICAgIF9fYmluZCA9IGZ1bmN0aW9uKGZuLCBtZSl7IHJldHVybiBmdW5jdGlvbigpeyByZXR1cm4gZm4uYXBwbHkobWUsIGFyZ3VtZW50cyk7IH07IH0sXG4gICAgX19oYXNQcm9wID0ge30uaGFzT3duUHJvcGVydHksXG4gICAgX19leHRlbmRzID0gZnVuY3Rpb24oY2hpbGQsIHBhcmVudCkgeyBmb3IgKHZhciBrZXkgaW4gcGFyZW50KSB7IGlmIChfX2hhc1Byb3AuY2FsbChwYXJlbnQsIGtleSkpIGNoaWxkW2tleV0gPSBwYXJlbnRba2V5XTsgfSBmdW5jdGlvbiBjdG9yKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gY2hpbGQ7IH0gY3Rvci5wcm90b3R5cGUgPSBwYXJlbnQucHJvdG90eXBlOyBjaGlsZC5wcm90b3R5cGUgPSBuZXcgY3RvcigpOyBjaGlsZC5fX3N1cGVyX18gPSBwYXJlbnQucHJvdG90eXBlOyByZXR1cm4gY2hpbGQ7IH0sXG4gICAgX19zbGljZSA9IFtdLnNsaWNlO1xuXG4gIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcblxuICBQb3N0aWUgPSAoZnVuY3Rpb24oX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFBvc3RpZSwgX3N1cGVyKTtcblxuICAgIFBvc3RpZS5wcm90b3R5cGUudGFyZ2V0ID0gbnVsbDtcblxuICAgIFBvc3RpZS5wcm90b3R5cGUub3JpZ2luID0gbnVsbDtcblxuICAgIGZ1bmN0aW9uIFBvc3RpZSh0YXJnZXQsIG9yaWdpbikge1xuICAgICAgaWYgKG9yaWdpbiA9PSBudWxsKSB7XG4gICAgICAgIG9yaWdpbiA9ICcqJztcbiAgICAgIH1cbiAgICAgIHRoaXMuaGFuZGxlTWVzc2FnZSA9IF9fYmluZCh0aGlzLmhhbmRsZU1lc3NhZ2UsIHRoaXMpO1xuICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFBvc3RpZSkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQb3N0aWUodGFyZ2V0LCBvcmlnaW4pO1xuICAgICAgfVxuICAgICAgUG9zdGllLl9fc3VwZXJfXy5jb25zdHJ1Y3Rvci5jYWxsKHRoaXMpO1xuICAgICAgdGhpcy50YXJnZXQgPSB0YXJnZXQ7XG4gICAgICB0aGlzLm9yaWdpbiA9IG9yaWdpbjtcbiAgICAgIHRoaXMubGlzdGVuKCk7XG4gICAgfVxuXG4gICAgLypcbiAgICBTZW5kcyBhIHBhY2thZ2Ugb3ZlciBjaGFubmVsLlxuICAgIFxuICAgIC0gYGNoYW5uZWxgIChTdHJpbmcpOiBUaGUgY2hhbm5lbCB0byBzZW5kIHRoZSBwYWNrYWdlIG92ZXJcbiAgICAtIGBwa2cuLi5gIChBcnJheS4uLik6IFRoZSBwYWNrYWdlIHRvIHNlbmQuIEl0IHdpbGwgdGFrZSBhbnkgYXJndW1lbnRzIGFmdGVyIHRoZSBmaXJzdCxcbiAgICAgIHN0aWNrIHRoZW0gaW4gYSBKU09OIGFycmF5IGFuZCB0aGVuIG9uIHRoZSBvdGhlciBlbmQgY2FsbCB0aGUgY2FsbGJhY2tcbiAgICAgIHdpdGggdGhvc2UgYXJndW1lbnRzIGFwcGxpZWQgdG8gdGhlIGNhbGxiYWNrLlxuICAgIFxuICAgIFJldHVybnMgdGhlIHJlc3VsdCBvZiB0aGUgcG9zdE1lc3NhZ2UgY2FsbC5cbiAgICAqL1xuXG5cbiAgICBQb3N0aWUucHJvdG90eXBlLnBvc3QgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjaGFubmVsLCBwYWNrZWQsIHBrZztcbiAgICAgIGNoYW5uZWwgPSBhcmd1bWVudHNbMF0sIHBrZyA9IDIgPD0gYXJndW1lbnRzLmxlbmd0aCA/IF9fc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpIDogW107XG4gICAgICBwYWNrZWQgPSB0aGlzLnBhY2soY2hhbm5lbCwgcGtnKTtcbiAgICAgIHJldHVybiB0aGlzLnRhcmdldC5wb3N0TWVzc2FnZShwYWNrZWQsIHRoaXMub3JpZ2luKTtcbiAgICB9O1xuXG4gICAgLypcbiAgICBTZXRzIHVwIHRoZSBwb3N0TWVzc2FnZSBoYW5kbGVyXG4gICAgKi9cblxuXG4gICAgUG9zdGllLnByb3RvdHlwZS5saXN0ZW4gPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICByZXR1cm4gd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCB0aGlzLmhhbmRsZU1lc3NhZ2UpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5hdHRhY2hFdmVudCgnb25tZXNzYWdlJywgdGhpcy5oYW5kbGVNZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLypcbiAgICBIYW5kbGVzIGEgcG9zdG1lc3NhZ2UgZXZlbnQuIEF0dGVtcHQgdG8gdW5wYWNrIGl0LCBhbmQgaWYgd2UgY2FuIGVtaXQgYW5cbiAgICBldmVudC5cbiAgICBcbiAgICAtIGBldmVudGAgKEV2ZW50KTogVGhlIGV2ZW50IHRvIGhhbmRsZS5cbiAgICAqL1xuXG5cbiAgICBQb3N0aWUucHJvdG90eXBlLmhhbmRsZU1lc3NhZ2UgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgdmFyIHVucGFja2FnZWQ7XG4gICAgICBpZiAodW5wYWNrYWdlZCA9IHRoaXMudW5wYWNrKGV2ZW50LmRhdGEpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmVtaXQuYXBwbHkodGhpcywgW3VucGFja2FnZWQuY2hhbm5lbF0uY29uY2F0KF9fc2xpY2UuY2FsbCh1bnBhY2thZ2VkW1wicGFja2FnZVwiXSkpKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgLypcbiAgICBUYWtlcyBhIHN0cmluZyBmcm9tIGEgcG9zdG1lc3NhZ2UgZXZlbnQgYW5kIHRyaWVzIHRvIHVucGFjayBpdC4gSWYgaXQgaXNcbiAgICBzdWNjZXNzZnVsIGl0IHdpbGwgcmV0dXJuIHRoZSB1bnBhY2tlZCBvYmplY3QsIG90aGVyd2lzZSBpdCB3aWxsIHJldHVyblxuICAgIGZhbHNlLlxuICAgIFxuICAgIC0gYGRhdGFgIChTdHJpbmcpOiBUaGUgZGF0YSB0byBhdHRlbXB0IHRvIHVucGFjay5cbiAgICBcbiAgICBSZXR1cm5zIHRoZSB1bnBhY2tlZCBkYXRhIGFzIGFuIE9iamVjdCwgb3IgYGZhbHNlYC5cbiAgICAqL1xuXG5cbiAgICBQb3N0aWUucHJvdG90eXBlLnVucGFjayA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHZhciBlcnJvciwgcGtnO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcGtnID0gSlNPTi5wYXJzZShkYXRhKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBjaGFubmVsOiBwa2cuX3Bvc3RpZS5jaGFubmVsLFxuICAgICAgICAgIFwicGFja2FnZVwiOiBwa2cuX3Bvc3RpZVtcInBhY2thZ2VcIl1cbiAgICAgICAgfTtcbiAgICAgIH0gY2F0Y2ggKF9lcnJvcikge1xuICAgICAgICBlcnJvciA9IF9lcnJvcjtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH07XG5cbiAgICAvKlxuICAgIFBhY2tzIGEgY2hhbm5lbCBzdHJpbmcgYW5kIGEgcGFja2FnZSB0byBzZW5kIGludG8gYSBTdHJpbmcgdGhhdCB3ZSBjYW4gc2VuZFxuICAgIG92ZXIgcG9zdE1lc3NhZ2UgdG8gYmUgdW5wYWNrZWQgb24gdGhlIG90aGVyIHNpZGUuXG4gICAgXG4gICAgLSBgY2hhbm5lbGAgKFN0cmluZyk6IFRoZSBjaGFubmVsIHRoZSBwYWNrYWdlIGlzIGJlaW5nIHNlbnQgb24uXG4gICAgLSBgcGtnYCAoTWl4ZWQpOiBUaGUgcGFja2FnZSB0byBwYWNrIHdpdGggdGhlIGNoYW5uZWwgaW50byB0aGUgc3RyaW5nLlxuICAgIFxuICAgIFJldHVybnMgYSBTdHJpbmcgd2hpY2ggY2FuIGJlIHVucGFja2VkIGludG8gaXRzIG9sZCByZXByZXNlbnRhdGlvbiB2aWFcbiAgICBgQHVucGFjaygpYC5cbiAgICAqL1xuXG5cbiAgICBQb3N0aWUucHJvdG90eXBlLnBhY2sgPSBmdW5jdGlvbihjaGFubmVsLCBwa2cpIHtcbiAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIF9wb3N0aWU6IHtcbiAgICAgICAgICBjaGFubmVsOiBjaGFubmVsLFxuICAgICAgICAgIFwicGFja2FnZVwiOiBwa2dcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiBQb3N0aWU7XG5cbiAgfSkoRXZlbnRFbWl0dGVyKTtcblxuICBtb2R1bGUuZXhwb3J0cyA9IFBvc3RpZTtcblxufSkuY2FsbCh0aGlzKTtcbiIsIlxuLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBnbG9iYWwgPSAoZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9KSgpO1xuXG4vKipcbiAqIFdlYlNvY2tldCBjb25zdHJ1Y3Rvci5cbiAqL1xuXG52YXIgV2ViU29ja2V0ID0gZ2xvYmFsLldlYlNvY2tldCB8fCBnbG9iYWwuTW96V2ViU29ja2V0O1xuXG4vKipcbiAqIE1vZHVsZSBleHBvcnRzLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gV2ViU29ja2V0ID8gd3MgOiBudWxsO1xuXG4vKipcbiAqIFdlYlNvY2tldCBjb25zdHJ1Y3Rvci5cbiAqXG4gKiBUaGUgdGhpcmQgYG9wdHNgIG9wdGlvbnMgb2JqZWN0IGdldHMgaWdub3JlZCBpbiB3ZWIgYnJvd3NlcnMsIHNpbmNlIGl0J3NcbiAqIG5vbi1zdGFuZGFyZCwgYW5kIHRocm93cyBhIFR5cGVFcnJvciBpZiBwYXNzZWQgdG8gdGhlIGNvbnN0cnVjdG9yLlxuICogU2VlOiBodHRwczovL2dpdGh1Yi5jb20vZWluYXJvcy93cy9pc3N1ZXMvMjI3XG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHVyaVxuICogQHBhcmFtIHtBcnJheX0gcHJvdG9jb2xzIChvcHRpb25hbClcbiAqIEBwYXJhbSB7T2JqZWN0KSBvcHRzIChvcHRpb25hbClcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gd3ModXJpLCBwcm90b2NvbHMsIG9wdHMpIHtcbiAgdmFyIGluc3RhbmNlO1xuICBpZiAocHJvdG9jb2xzKSB7XG4gICAgaW5zdGFuY2UgPSBuZXcgV2ViU29ja2V0KHVyaSwgcHJvdG9jb2xzKTtcbiAgfSBlbHNlIHtcbiAgICBpbnN0YW5jZSA9IG5ldyBXZWJTb2NrZXQodXJpKTtcbiAgfVxuICByZXR1cm4gaW5zdGFuY2U7XG59XG5cbmlmIChXZWJTb2NrZXQpIHdzLnByb3RvdHlwZSA9IFdlYlNvY2tldC5wcm90b3R5cGU7XG4iLCIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgUGFyc2VzIHRoZSBWZXlyb24gSURMXG4gKi9cblxudmFyIHZFcnJvciA9IHJlcXVpcmUoJy4uL2xpYi92ZXJyb3InKTtcbnZhciBpZGxIZWxwZXIgPSB7fTtcblxuLyoqXG4gKiBHZW5lcmF0ZXMgYW4gSURMIHdpcmUgZGVzY3JpcHRpb24gZm9yIGEgZ2l2ZW4gc2VydmljZSBieSBpdGVyYXRpbmcgb3ZlciB0aGVcbiAqIG1ldGhvZHMgaW4gdGhlIHNlcnZpY2Ugb2JqZWN0LlxuICogTWV0aG9kIG5hbWVzIGJlZ2lubmluZyB3aXRoICdfJyBhcmUgY29uc2lkZXJlZCBwcml2YXRlIGFuZCBza2lwcGVkLlxuICogQXJnIG5hbWVzIGJlZ2lubmluZyB3aXRoICckJyBhcmUgbm90IHBhcnQgb2YgdGhlIGlkbCBhbmQgYXJlIGZpbGxlZCBpbiBieVxuICogdGhlIHZleXJvbiBsaWJyYXJpZXMgKGUuZy4gJGNvbnRleHQpLlxuICogQHBhcmFtIHtvYmplY3R9IHNlcnZpY2UgYSBkZXNjcmlwdGlvbiBvZiB0aGUgc2VydmljZS4gVGhpcyBpcyBhIG1hcCBmcm9tXG4gKiBtZXRob2QgbmFtZSB0byBtZXRob2QgZGVzY3JpcHRpb24uXG4gKiBAcmV0dXJuIHtvYmplY3R9IGEgcmVwcmVzZW50YXRpb24gb2YgdGhlIGlkbC4gVGhpcyBtdXN0IG1hdGNoIHRoZSBmb3JtYXQgb2ZcbiAqIEpTT05TZXJ2aWNlU2lnbmF0dXJlIGluIFZleXJvbidzIGdvIGNvZGUuXG4gKi9cbmlkbEhlbHBlci5nZW5lcmF0ZUlkbFdpcmVEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uKHNlcnZpY2UpIHtcbiAgdmFyIGlkbFdpcmUgPSB7fTtcbiAgdmFyIG1ldGFkYXRhID0gc2VydmljZS5tZXRhZGF0YTtcbiAgZm9yICh2YXIgbWV0aG9kTmFtZSBpbiBtZXRhZGF0YSkge1xuICAgIGlmIChtZXRhZGF0YS5oYXNPd25Qcm9wZXJ0eShtZXRob2ROYW1lKSkge1xuICAgICAgdmFyIG1ldGhvZE1ldGFkYXRhID0gbWV0YWRhdGFbbWV0aG9kTmFtZV07XG5cbiAgICAgIHZhciBwYXJhbXMgPSBtZXRob2RNZXRhZGF0YS5wYXJhbXM7XG4gICAgICB2YXIgaW5BcmdzID0gW107XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcmFtcy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgcGFyYW0gPSBwYXJhbXNbaV07XG4gICAgICAgIGlmIChwYXJhbVswXSAhPT0gJyQnKSB7XG4gICAgICAgICAgaW5BcmdzLnB1c2gocGFyYW0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlkbFdpcmVbbWV0aG9kTmFtZV0gPSB7XG4gICAgICAgIEluQXJnczogaW5BcmdzLFxuICAgICAgICBOdW1PdXRBcmdzOiBtZXRob2RNZXRhZGF0YS5udW1PdXRBcmdzICsgMSxcbiAgICAgICAgSXNTdHJlYW1pbmc6IG1ldGhvZE1ldGFkYXRhLmluamVjdGlvbnNbJyRzdHJlYW0nXSAhPT0gdW5kZWZpbmVkXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBpZGxXaXJlO1xufTtcblxuLyoqXG4gKiBSZXR1cm5zIGFuIGFycmF5IG9mIHBhcmFtZXRlciBuYW1lcyBmb3IgYSBmdW5jdGlvbi5cbiAqIGZyb20gZ28vZnlwb24gKHN0YWNrIG92ZXJmbG93KSBhbmQgYmFzZWQgb24gYW5ndWxhcmpzJ3MgaW1wbGVtZW50YXRpb25cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGZ1bmMgdGhlIGZ1bmN0aW9uIG9iamVjdFxuICogQHJldHVybiB7c3RyaW5nW119IGxpc3Qgb2YgdGhlIHBhcmFtZXRlcnNcbiAqL1xudmFyIGdldFBhcmFtTmFtZXMgPSBmdW5jdGlvbihmdW5jKSB7XG4gIC8vIHJlcHJlc2VudCB0aGUgZnVuY3Rpb24gYXMgYSBzdHJpbmcgYW5kIHN0cmlwIGNvbW1lbnRzXG4gIHZhciBmblN0ciA9IGZ1bmMudG9TdHJpbmcoKS5yZXBsYWNlKC8oKFxcL1xcLy4qJCl8KFxcL1xcKltcXHNcXFNdKj9cXCpcXC8pKS9tZywgJycpO1xuICAvLyBnZXQgdGhlIGFyZ3VtZW50cyBmcm9tIHRoZSBzdHJpbmdcbiAgdmFyIHJlc3VsdCA9IGZuU3RyLnNsaWNlKGZuU3RyLmluZGV4T2YoJygnKSArIDEsIGZuU3RyLmluZGV4T2YoJyknKSkuXG4gICAgICBtYXRjaCgvKFteXFxzLF0rKS9nKTtcbiAgaWYgKHJlc3VsdCA9PT0gbnVsbCkge1xuICAgIHJlc3VsdCA9IFtdO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIFdyYXBzIGEgU2VydmljZSB3aXRoIGFubm90YXRpb25zIGZvciBlYWNoIGV4cG9ydGVkIGZ1bmN0aW9uLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge29iamVjdH0gc2VydmljZSB0aGUgc2VydmljZSB0aGF0IGlzIGJlaW5nIGV4cG9ydGVkLlxuICogQHBhcmFtIHtvYmplY3R9IGV4dHJhTWV0YWRhdGEgaWYgcHJvdmlkZWQsIGFkZHMgZXh0cmEgbWV0YWRhdGEgZm9yXG4gKiB0aGUgZnVuY3Rpb25zIGV4cG9ydGVkIChzdWNoIGFzIG51bWJlciBvZiByZXR1cm4gdmFsdWVzKS5cbiAqL1xuaWRsSGVscGVyLlNlcnZpY2VXcmFwcGVyID0gZnVuY3Rpb24oc2VydmljZSwgZXh0cmFNZXRhZGF0YSkge1xuICB0aGlzLm9iamVjdCA9IHNlcnZpY2U7XG4gIHRoaXMubWV0YWRhdGEgPSB7fTtcbiAgZXh0cmFNZXRhZGF0YSA9IGV4dHJhTWV0YWRhdGEgfHwge307XG5cbiAgZm9yICh2YXIgbWV0aG9kTmFtZSBpbiBzZXJ2aWNlKSB7XG4gICAgaWYgKHNlcnZpY2UuaGFzT3duUHJvcGVydHkobWV0aG9kTmFtZSkgJiZcbiAgICAgICAgbWV0aG9kTmFtZS5sZW5ndGggPiAwICYmIG1ldGhvZE5hbWVbMF0gIT09ICdfJykge1xuICAgICAgaWYgKG1ldGhvZE5hbWVbMF0gPj0gJ0EnICYmIG1ldGhvZE5hbWVbMF0gPD0gJ1onKSB7XG4gICAgICAgIHZhciBjYW1lbENhc2VOYW1lID0gbWV0aG9kTmFtZS5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArXG4gICAgICAgICAgbWV0aG9kTmFtZS5zbGljZSgxKTtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdNZXRob2QgbmFtZXMgbXVzdCBiZSBjYW1lbCBjYXNlLiBQZXJoYXBzIHJlbmFtZSBcXCcnICtcbiAgICAgICAgICBtZXRob2ROYW1lICsgJ1xcJyB0byBcXCcnICsgY2FtZWxDYXNlTmFtZSArICdcXCcnKTtcbiAgICAgIH1cbiAgICAgIHZhciBtZXRob2QgPSBzZXJ2aWNlW21ldGhvZE5hbWVdO1xuICAgICAgaWYgKHR5cGVvZiBtZXRob2QgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdmFyIHBhcmFtcyA9IGdldFBhcmFtTmFtZXMobWV0aG9kKTtcbiAgICAgICAgdmFyIGluamVjdGlvbnMgPSB7fTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJhbXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB2YXIgbmFtZSA9IHBhcmFtc1tpXTtcbiAgICAgICAgICBpZiAobmFtZVswXSA9PT0gJyQnKSB7XG4gICAgICAgICAgICBpbmplY3Rpb25zW25hbWVdID0gaTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1ldGFkYXRhID0ge1xuICAgICAgICAgIHBhcmFtczogcGFyYW1zLFxuICAgICAgICAgIGluamVjdGlvbnM6IGluamVjdGlvbnMsXG4gICAgICAgICAgbnVtT3V0QXJnczogMVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFdlIG9ubHkgd2FudCB0byBjb3B5IG92ZXIgdGhlIGFjY2VwdGVkIG1ldGFkYXRhIG9wdGlvbnMuXG4gICAgICAgIGlmIChleHRyYU1ldGFkYXRhW21ldGhvZE5hbWVdKSB7XG4gICAgICAgICAgdmFyIGV4dHJhID0gZXh0cmFNZXRhZGF0YVttZXRob2ROYW1lXTtcbiAgICAgICAgICBpZiAoZXh0cmEubnVtT3V0QXJncyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBtZXRhZGF0YS5udW1PdXRBcmdzID0gZXh0cmEubnVtT3V0QXJncztcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLm1ldGFkYXRhW21ldGhvZE5hbWVdID0gbWV0YWRhdGE7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5pZGxIZWxwZXIuU2VydmljZVdyYXBwZXIucHJvdG90eXBlLnZhbGlkYXRlID0gZnVuY3Rpb24oZGVmaW5pdGlvbikge1xuICBmb3IgKHZhciBuYW1lIGluIGRlZmluaXRpb24pIHtcbiAgICBpZiAoZGVmaW5pdGlvbi5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgdmFyIG1ldGFkYXRhID0gdGhpcy5tZXRhZGF0YVtuYW1lXTtcbiAgICAgIGlmICghbWV0YWRhdGEpIHtcbiAgICAgICAgcmV0dXJuIG5ldyB2RXJyb3IuQmFkQXJnRXJyb3IoJ01pc3NpbmcgbWV0aG9kOiAnICsgbmFtZSk7XG4gICAgICB9XG4gICAgICB2YXIgZXhwZWN0ZWQgPSBkZWZpbml0aW9uW25hbWVdO1xuICAgICAgdmFyIGlucHV0QXJncyA9IG1ldGFkYXRhLnBhcmFtcy5sZW5ndGggLVxuICAgICAgICAgIE9iamVjdC5rZXlzKG1ldGFkYXRhLmluamVjdGlvbnMpLmxlbmd0aDtcbiAgICAgIGlmIChpbnB1dEFyZ3MgIT09IGV4cGVjdGVkLm51bUluQXJncykge1xuICAgICAgICByZXR1cm4gbmV3IHZFcnJvci5CYWRBcmdFcnJvcignV3JvbmcgbnVtYmVyIG9mIGlucHV0IGFyZ3MgZm9yICcgK1xuICAgICAgICAgICAgbmFtZSArICcsIGdvdDogJyArIGlucHV0QXJncyArICcsIGV4cGVjdGVkOiAnICtcbiAgICAgICAgICAgIGV4cGVjdGVkLm51bUluQXJncyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChtZXRhZGF0YS5udW1PdXRBcmdzICE9PSBleHBlY3RlZC5udW1PdXRBcmdzKSB7XG4gICAgICAgIHJldHVybiBuZXcgdkVycm9yLkJhZEFyZ0Vycm9yKCdXcm9uZyBudW1iZXIgb2Ygb3V0cHV0IGFyZ3MgZm9yICcgK1xuICAgICAgICAgICAgbmFtZSArICcsIGdvdDogJyArIG1ldGFkYXRhLm51bU91dEFyZ3MgKyAnLCBleHBlY3RlZCAnICtcbiAgICAgICAgICAgIGV4cGVjdGVkLm51bU91dEFyZ3MpO1xuICAgICAgfVxuXG4gICAgICB2YXIgaGFzU3RyZWFtaW5nID0gbWV0YWRhdGEuaW5qZWN0aW9ucy5oYXNPd25Qcm9wZXJ0eSgnJHN0cmVhbScpO1xuICAgICAgdmFyIGV4cGVjdGluZ1N0cmVhbWluZyA9IChleHBlY3RlZC5pbnB1dFN0cmVhbWluZyB8fFxuICAgICAgICAgIGV4cGVjdGVkLm91dHB1dFN0cmVhbWluZyk7XG4gICAgICBpZiAoZXhwZWN0aW5nU3RyZWFtaW5nICYmICFoYXNTdHJlYW1pbmcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyB2RXJyb3IuQmFkQXJnRXJyb3IoJ0V4cGVjdGVkICcgKyBuYW1lICsgJyB0byBiZSAnICtcbiAgICAgICAgICAgICAgJ3N0cmVhbWluZycpO1xuICAgICAgfSBlbHNlIGlmICghZXhwZWN0aW5nU3RyZWFtaW5nICYmIGhhc1N0cmVhbWluZykge1xuICAgICAgICByZXR1cm4gbmV3IHZFcnJvci5CYWRBcmdFcnJvcignRXhwZWN0ZWQgJyArIG5hbWUgKyAnIHRvIG5vdCBiZSAnICtcbiAgICAgICAgICAgICAgJ3N0cmVhbWluZycpO1xuXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZm9yIChuYW1lIGluIHRoaXMubWV0YWRhdGEpIHtcbiAgICBpZiAodGhpcy5tZXRhZGF0YS5oYXNPd25Qcm9wZXJ0eShuYW1lKSAmJlxuICAgICAgICAhZGVmaW5pdGlvbi5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgcmV0dXJuIG5ldyB2RXJyb3IuQmFkQXJnRXJyb3IoJ1VuZXhwZWN0ZWQgbWV0aG9kICcgKyBuYW1lICtcbiAgICAgICAgICAnIGltcGxlbWVudGVkLicpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbnVsbDtcbn07XG5cbi8qKlxuICogRXhwb3J0IHRoZSBtb2R1bGVcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBpZGxIZWxwZXI7XG4iLCIvKipcbiAqICBAZmlsZW92ZXJ2aWV3IENsaWVudCBmb3IgdGhlIHZleXJvbiBzZXJ2aWNlLlxuICpcbiAqICBVc2FnZTpcbiAqICB2YXIgY2wgPSBuZXcgY2xpZW50KHByb3h5Q29ubmVjdGlvbik7XG4gKiAgdmFyIHNlcnZpY2UgPSBjbC5iaW5kVG8oJ0VuZHBvaW50QWRkcmVzcycsICdTZXJ2aWNlTmFtZScpO1xuICogIHJlc3VsdFByb21pc2UgPSBzZXJ2aWNlLk1ldGhvZE5hbWUoYXJnKTtcbiAqL1xuXG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJ2VzNi1wcm9taXNlJykuUHJvbWlzZTtcblxudmFyIERlZmVycmVkID0gcmVxdWlyZSgnLi4vbGliL2RlZmVycmVkJyk7XG52YXIgdkxvZyA9IHJlcXVpcmUoJy4uL2xpYi92bG9nJyk7XG52YXIgRXJyb3JDb252ZXJzaW9uID0gcmVxdWlyZSgnLi4vcHJveHkvZXJyb3JfY29udmVyc2lvbicpO1xudmFyIFN0cmVhbSA9IHJlcXVpcmUoJy4uL3Byb3h5L3N0cmVhbScpO1xudmFyIHZFcnJvciA9IHJlcXVpcmUoJy4uL2xpYi92ZXJyb3InKTtcbnZhciBNZXNzYWdlVHlwZSA9IHJlcXVpcmUoJy4uL3Byb3h5L21lc3NhZ2VfdHlwZScpO1xudmFyIEluY29taW5nUGF5bG9hZFR5cGUgPSByZXF1aXJlKCcuLi9wcm94eS9pbmNvbWluZ19wYXlsb2FkX3R5cGUnKTtcblxudmFyIE91dHN0YW5kaW5nUlBDID0gZnVuY3Rpb24ob3B0aW9ucywgY2IpIHtcbiAgdGhpcy5fcHJveHkgPSBvcHRpb25zLnByb3h5O1xuICB0aGlzLl9pZCA9IC0xO1xuICB0aGlzLl9uYW1lID0gb3B0aW9ucy5uYW1lO1xuICB0aGlzLl9tZXRob2ROYW1lID0gb3B0aW9ucy5tZXRob2ROYW1lLFxuICB0aGlzLl9hcmdzID0gb3B0aW9ucy5hcmdzO1xuICB0aGlzLl9udW1PdXRQYXJhbXMgPSBvcHRpb25zLm51bU91dFBhcmFtcztcbiAgdGhpcy5faXNTdHJlYW1pbmcgPSBvcHRpb25zLmlzU3RyZWFtaW5nIHx8IGZhbHNlO1xuICB0aGlzLl9jYiA9IGNiO1xuICB0aGlzLl9kZWYgPSBudWxsO1xufTtcblxuT3V0c3RhbmRpbmdSUEMucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX2lkID0gdGhpcy5fcHJveHkubmV4dElkKCk7XG4gIHZhciBkZWYgPSBuZXcgRGVmZXJyZWQodGhpcy5fY2IpO1xuXG4gIHZhciBzdHJlYW1pbmdEZWZlcnJlZCA9IG51bGw7XG4gIGlmICh0aGlzLl9pc1N0cmVhbWluZykge1xuICAgIHN0cmVhbWluZ0RlZmVycmVkID0gbmV3IERlZmVycmVkKCk7XG4gICAgZGVmLnN0cmVhbSA9IG5ldyBTdHJlYW0odGhpcy5faWQsIHN0cmVhbWluZ0RlZmVycmVkLnByb21pc2UsIHRydWUpO1xuICAgIGRlZi5wcm9taXNlLnN0cmVhbSA9IGRlZi5zdHJlYW07XG4gIH1cblxuICB2YXIgbWVzc2FnZSA9IHRoaXMuY29uc3RydWN0TWVzc2FnZSgpO1xuXG4gIHRoaXMuX2RlZiA9IGRlZjtcbiAgdGhpcy5fcHJveHkuc2VuZFJlcXVlc3QobWVzc2FnZSwgTWVzc2FnZVR5cGUuUkVRVUVTVCwgdGhpcywgdGhpcy5faWQpO1xuICBpZiAoc3RyZWFtaW5nRGVmZXJyZWQpIHtcbiAgICB0aGlzLl9wcm94eS5zZW5kZXJQcm9taXNlLnRoZW4oZnVuY3Rpb24od3MpIHtcbiAgICAgIHN0cmVhbWluZ0RlZmVycmVkLnJlc29sdmUod3MpO1xuICAgIH0sIGZ1bmN0aW9uKGVycikge1xuICAgICAgc3RyZWFtaW5nRGVmZXJyZWQucmVqZWN0KGVycik7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gZGVmLnByb21pc2U7XG59O1xuXG5PdXRzdGFuZGluZ1JQQy5wcm90b3R5cGUuaGFuZGxlUmVzcG9uc2UgPSBmdW5jdGlvbih0eXBlLCBkYXRhKSB7XG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgSW5jb21pbmdQYXlsb2FkVHlwZS5GSU5BTF9SRVNQT05TRTpcbiAgICAgIHRoaXMuaGFuZGxlQ29tcGxldGlvbihkYXRhKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgSW5jb21pbmdQYXlsb2FkVHlwZS5TVFJFQU1fUkVTUE9OU0U6XG4gICAgICB0aGlzLmhhbmRsZVN0cmVhbURhdGEoZGF0YSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEluY29taW5nUGF5bG9hZFR5cGUuRVJST1JfUkVTUE9OU0U6XG4gICAgICB0aGlzLmhhbmRsZUVycm9yKGRhdGEpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBJbmNvbWluZ1BheWxvYWRUeXBlLlNUUkVBTV9DTE9TRTpcbiAgICAgIHRoaXMuaGFuZGxlU3RyZWFtQ2xvc2UoKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aGlzLmhhbmRsZUVycm9yKFxuICAgICAgICAgIG5ldyB2RXJyb3IuSW50ZXJuYWxFcnJvcignUmVjaWV2ZWQgdW5rbm93biByZXNwb25zZSB0eXBlIGZyb20gd3NwcicpKTtcbiAgICAgIGJyZWFrO1xuICB9XG59O1xuXG5PdXRzdGFuZGluZ1JQQy5wcm90b3R5cGUuaGFuZGxlQ29tcGxldGlvbiA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgaWYgKGRhdGEubGVuZ3RoID09PSAxKSB7XG4gICAgZGF0YSA9IGRhdGFbMF07XG4gIH1cbiAgdGhpcy5fZGVmLnJlc29sdmUoZGF0YSk7XG4gIGlmICh0aGlzLl9kZWYuc3RyZWFtKSB7XG4gICAgdGhpcy5fZGVmLnN0cmVhbS5fcXVldWVSZWFkKG51bGwpO1xuICB9XG4gIHRoaXMuX3Byb3h5LmRlcXVldWUodGhpcy5faWQpO1xufTtcblxuT3V0c3RhbmRpbmdSUEMucHJvdG90eXBlLmhhbmRsZVN0cmVhbURhdGEgPSBmdW5jdGlvbihkYXRhKSB7XG4gIGlmICh0aGlzLl9kZWYuc3RyZWFtKSB7XG4gICAgdGhpcy5fZGVmLnN0cmVhbS5fcXVldWVSZWFkKGRhdGEpO1xuICB9IGVsc2Uge1xuICAgIHZMb2cud2FybignSWdub3Jpbmcgc3RyZWFtaW5nIG1lc3NhZ2UgZm9yIG5vbi1zdHJlYW1pbmcgZmxvdyA6ICcgK1xuICAgICAgICB0aGlzLl9pZCk7XG4gIH1cbn07XG5cbk91dHN0YW5kaW5nUlBDLnByb3RvdHlwZS5oYW5kbGVTdHJlYW1DbG9zZSA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5fZGVmLnN0cmVhbSkge1xuICAgIHRoaXMuX2RlZi5zdHJlYW0uX3F1ZXVlUmVhZChudWxsKTtcbiAgfVxufTtcblxuT3V0c3RhbmRpbmdSUEMucHJvdG90eXBlLmhhbmRsZUVycm9yID0gZnVuY3Rpb24oZGF0YSkge1xuICB2YXIgZXJyO1xuICBpZiAoZGF0YSBpbnN0YW5jZW9mIHZFcnJvci5WZXlyb25FcnJvcikge1xuICAgIGVyciA9IGRhdGE7XG4gIH0gZWxzZSB7XG4gICAgZXJyID0gRXJyb3JDb252ZXJzaW9uLnRvSlNlcnJvcihkYXRhKTtcbiAgfVxuXG4gIGlmICh0aGlzLl9kZWYuc3RyZWFtKSB7XG4gICAgdGhpcy5fZGVmLnN0cmVhbS5lbWl0KCdlcnJvcicsIGVycik7XG4gICAgdGhpcy5fZGVmLnN0cmVhbS5xdWV1ZVJlYWQobnVsbCk7XG4gIH1cbiAgdGhpcy5fZGVmLnJlamVjdChlcnIpO1xuICB0aGlzLl9wcm94eS5kZXF1ZXVlKHRoaXMuX2lkKTtcbn07XG5cblxuLyoqXG4gKiBDb25zdHJ1Y3QgYSBtZXNzYWdlIHRvIHNlbmQgdG8gdGhlIHZleXJvbiBuYXRpdmUgY29kZVxuICogQHJldHVybiB7c3RyaW5nfSBqc29uIHN0cmluZyB0byBzZW5kIHRvIGpzcHJcbiAqL1xuT3V0c3RhbmRpbmdSUEMucHJvdG90eXBlLmNvbnN0cnVjdE1lc3NhZ2UgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGpzb25NZXNzYWdlID0ge1xuICAgIG5hbWU6IHRoaXMuX25hbWUsXG4gICAgbWV0aG9kOiB0aGlzLl9tZXRob2ROYW1lLFxuICAgIGluQXJnczogdGhpcy5fYXJncyB8fCBbXSxcbiAgICBudW1PdXRBcmdzOiB0aGlzLl9udW1PdXRQYXJhbXMgfHwgMSxcbiAgICBpc1N0cmVhbWluZzogdGhpcy5faXNTdHJlYW1pbmdcbiAgfTtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGpzb25NZXNzYWdlKTtcbn07XG5cbi8qKlxuICogQ2xpZW50IGZvciB0aGUgdmV5cm9uIHNlcnZpY2UuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7T2JqZWN0fSBwcm94eUNvbm5lY3Rpb24gVmV5cm9uIHByb3h5IGNsaWVudFxuICovXG5mdW5jdGlvbiBDbGllbnQocHJveHlDb25uZWN0aW9uKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBDbGllbnQpKSB7XG4gICAgcmV0dXJuIG5ldyBDbGllbnQocHJveHlDb25uZWN0aW9uKTtcbiAgfVxuXG4gIHRoaXMuX3Byb3h5Q29ubmVjdGlvbiA9IHByb3h5Q29ubmVjdGlvbjtcbn1cblxuLyoqXG4gKiBQZXJmb3JtcyBjbGllbnQgc2lkZSBiaW5kaW5nIG9mIGEgcmVtb3RlIHNlcnZpY2UgdG8gYSBuYXRpdmUgamF2YXNjcmlwdFxuICogc3R1YiBvYmplY3QuXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSB0aGUgdmV5cm9uIG5hbWUgb2YgdGhlIHNlcnZpY2UgdG8gYmluZCB0by5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRTZXJ2aWNlU2lnbmF0dXJlIGlmIHNldCwgamF2YXNjcmlwdCBzaWduYXR1cmUgb2YgbWV0aG9kc1xuICogYXZhaWxhYmxlIGluIHRoZSByZW1vdGUgc2VydmljZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gaWYgZ2l2ZW4sIHRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgb25cbiAqIGNvbXBsZXRpb24gb2YgdGhlIGJpbmQuICBUaGUgZmlyc3QgYXJndW1lbnQgd2lsbCBiZSBhbiBlcnJvciBpZiB0aGVyZSBpc1xuICogb25lLCBhbmQgdGhlIHNlY29uZCBhcmd1bWVudCBpcyBhbiBvYmplY3Qgd2l0aCBtZXRob2RzIHRoYXQgcGVyZm9ybSBycGNzIHRvXG4gKiBzZXJ2aWNlXG4gKiBtZXRob2RzLlxuICogQHJldHVybiB7UHJvbWlzZX0gQW4gb2JqZWN0IHdpdGggbWV0aG9kcyB0aGF0IHBlcmZvcm0gcnBjcyB0byBzZXJ2aWNlIG1ldGhvZHNcbiAqL1xuQ2xpZW50LnByb3RvdHlwZS5iaW5kVG8gPSBmdW5jdGlvbihuYW1lLCBvcHRTZXJ2aWNlU2lnbmF0dXJlLCBjYWxsYmFjaykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmICh0eXBlb2Yob3B0U2VydmljZVNpZ25hdHVyZSkgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IG9wdFNlcnZpY2VTaWduYXR1cmU7XG4gICAgb3B0U2VydmljZVNpZ25hdHVyZSA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHZhciBkZWYgPSBuZXcgRGVmZXJyZWQoY2FsbGJhY2spO1xuICB2YXIgc2VydmljZVNpZ25hdHVyZVByb21pc2U7XG5cbiAgaWYgKG9wdFNlcnZpY2VTaWduYXR1cmUgIT09IHVuZGVmaW5lZCkge1xuICAgIHNlcnZpY2VTaWduYXR1cmVQcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKG9wdFNlcnZpY2VTaWduYXR1cmUpO1xuICB9IGVsc2Uge1xuICAgIHZMb2cuZGVidWcoJ1JlcXVlc3Rpbmcgc2VydmljZSBzaWduYXR1cmUgZm9yOicsIG5hbWUpO1xuICAgIHNlcnZpY2VTaWduYXR1cmVQcm9taXNlID0gc2VsZi5fcHJveHlDb25uZWN0aW9uLmdldFNlcnZpY2VTaWduYXR1cmUobmFtZSk7XG4gIH1cblxuICB2YXIgcHJvbWlzZSA9IGRlZi5wcm9taXNlO1xuICBzZXJ2aWNlU2lnbmF0dXJlUHJvbWlzZS50aGVuKGZ1bmN0aW9uKHNlcnZpY2VTaWduYXR1cmUpIHtcbiAgICB2TG9nLmRlYnVnKCdSZWNlaXZlZCBzaWduYXR1cmUgZm9yOicsIG5hbWUsIHNlcnZpY2VTaWduYXR1cmUpO1xuICAgIHZhciBib3VuZE9iamVjdCA9IHt9O1xuICAgIHZhciBiaW5kTWV0aG9kID0gZnVuY3Rpb24obWV0aG9kTmFtZSkge1xuICAgICAgdmFyIG1ldGhvZEluZm8gPSBzZXJ2aWNlU2lnbmF0dXJlW21ldGhvZE5hbWVdO1xuICAgICAgdmFyIG51bU91dFBhcmFtcyA9IG1ldGhvZEluZm8ubnVtT3V0QXJncztcbiAgICAgIGJvdW5kT2JqZWN0W21ldGhvZE5hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgICAgICAgdmFyIGNiID0gbnVsbDtcbiAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID09PSBtZXRob2RJbmZvLmluQXJncy5sZW5ndGggKyAxKSB7XG4gICAgICAgICAgY2IgPSBhcmdzW2FyZ3MubGVuZ3RoIC0gMV07XG4gICAgICAgICAgYXJncyA9IGFyZ3Muc2xpY2UoMCwgbWV0aG9kSW5mby5pbkFyZ3MubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXJncy5sZW5ndGggIT09IG1ldGhvZEluZm8uaW5BcmdzLmxlbmd0aCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBudW1iZXIgb2YgYXJndW1lbnRzIHRvIFwiJyArXG4gICAgICAgICAgICBtZXRob2ROYW1lICsgJ1wiLiBFeHBlY3RlZCAnICsgbWV0aG9kSW5mby5pbkFyZ3MubGVuZ3RoICtcbiAgICAgICAgICAgICcgYnV0IHRoZXJlIHdlcmUgJyArIGFyZ3MubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcnBjID0gbmV3IE91dHN0YW5kaW5nUlBDKHtcbiAgICAgICAgICAgcHJveHk6IHNlbGYuX3Byb3h5Q29ubmVjdGlvbixcbiAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgbWV0aG9kTmFtZTogbWV0aG9kTmFtZSxcbiAgICAgICAgICAgYXJnczogYXJncyxcbiAgICAgICAgICAgbnVtT3V0UGFyYW1zOiBudW1PdXRQYXJhbXMsXG4gICAgICAgICAgIGlzU3RyZWFtaW5nOiBtZXRob2RJbmZvLmlzU3RyZWFtaW5nXG4gICAgICAgIH0sIGNiKTtcbiAgICAgICAgcmV0dXJuIHJwYy5zdGFydCgpO1xuICAgICAgfTtcbiAgICB9O1xuXG4gICAgZm9yICh2YXIgbWV0aG9kTmFtZSBpbiBzZXJ2aWNlU2lnbmF0dXJlKSB7XG4gICAgICBpZiAoc2VydmljZVNpZ25hdHVyZS5oYXNPd25Qcm9wZXJ0eShtZXRob2ROYW1lKSkge1xuICAgICAgICBiaW5kTWV0aG9kKG1ldGhvZE5hbWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vQWxzbyBzdHViIG91dCBzaWduYXR1cmUoKSBvbiB0aGUgYm91bmQgb2JqZWN0LlxuICAgIGJvdW5kT2JqZWN0LnNpZ25hdHVyZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShzZXJ2aWNlU2lnbmF0dXJlKTtcbiAgICB9O1xuXG4gICAgZGVmLnJlc29sdmUoYm91bmRPYmplY3QpO1xuICB9KS5jYXRjaCAoZGVmLnJlamVjdCk7XG5cbiAgcmV0dXJuIHByb21pc2U7XG59O1xuXG4vKipcbiAqIEV4cG9ydCB0aGUgbW9kdWxlXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gQ2xpZW50O1xuIiwiLyoqXG4gKiAgQGZpbGVvdmVydmlldyBTZXJ2ZXIgYWxsb3dzIGNyZWF0aW9uIG9mIHNlcnZpY2VzIHRoYXQgY2FuIGJlIGludm9rZWRcbiAqICByZW1vdGVseSB2aWEgUlBDcy5cbiAqXG4gKiAgVXNhZ2U6XG4gKiAgdmFyIHZpZGVvU2VydmljZSA9IHtcbiAqICAgIHBsYXk6IHtcbiAqICAgICAgLy8gUGxheSB2aWRlb1xuICogICAgfVxuICogIH07XG4gKlxuICogIHZhciBzID0gbmV3IHNlcnZlcihwcm94eUNvbm5lY3Rpb24pO1xuICogIHMuc2VydmUoJ215bWVkaWEvdmlkZW8nLCB2aWRlb1NlcnZpY2UpO1xuICovXG5cbnZhciBEZWZlcnJlZCA9IHJlcXVpcmUoJy4vLi4vbGliL2RlZmVycmVkJyk7XG52YXIgSWRsSGVscGVyID0gcmVxdWlyZSgnLi8uLi9pZGwvaWRsJyk7XG52YXIgdkVycm9yID0gcmVxdWlyZSgnLi8uLi9saWIvdmVycm9yJyk7XG52YXIgU2VydmljZVdyYXBwZXIgPSBJZGxIZWxwZXIuU2VydmljZVdyYXBwZXI7XG5cbnZhciBuZXh0U2VydmVySUQgPSAxOyAvLyBUaGUgSUQgZm9yIHRoZSBuZXh0IHNlcnZlci5cblxuLyoqXG4gKiByZXByZXNlbnRzIGEgdmV5cm9uIHNlcnZlciB3aGljaCBhbGxvd3MgcmVnaXN0cmF0aW9uIG9mIHNlcnZpY2VzIHRoYXQgY2FuIGJlXG4gKiBpbnZva2VkIHJlbW90ZWx5IHZpYSBSUENzLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge09iamVjdH0gcm91dGVyIHRoZSBzZXJ2ZXIgcm91dGVyLlxuICovXG5mdW5jdGlvbiBTZXJ2ZXIocm91dGVyKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTZXJ2ZXIpKSB7XG4gICAgcmV0dXJuIG5ldyBTZXJ2ZXIocm91dGVyKTtcbiAgfVxuXG4gIHRoaXMuX3JvdXRlciA9IHJvdXRlcjtcbiAgdGhpcy5pZCA9IG5leHRTZXJ2ZXJJRCsrO1xuICB0aGlzLnNlcnZpY2VPYmplY3QgPSBudWxsO1xuICB0aGlzLl9rbm93blNlcnZpY2VEZWZpbml0aW9ucyA9IHt9O1xufVxuXG4vKipcbiAqIGFkZElETCBhZGRzIGFuIElETCBmaWxlIHRvIHRoZSBzZXQgb2YgZGVmaW5pdGlvbnMga25vd24gYnkgdGhlIHNlcnZlci5cbiAqIFNlcnZpY2VzIGRlZmluZWQgaW4gSURMIGZpbGVzIHBhc3NlZCBpbnRvIHRoaXMgbWV0aG9kIGNhbiBiZSB1c2VkIHRvXG4gKiBkZXNjcmliZSB0aGUgaW50ZXJmYWNlIGV4cG9ydGVkIGJ5IGEgc2VydmljZU9iamVjdCBwYXNzZWQgaW50byByZWdpc3Rlci5cbiAqIEBwYXJhbSB7b2JqZWN0fSB1cGRhdGVzIHRoZSBvdXRwdXQgb2YgdGhlIHZkbCB0b29sIG9uIGFuIGlkbC5cbiAqL1xuU2VydmVyLnByb3RvdHlwZS5hZGRJREwgPSBmdW5jdGlvbih1cGRhdGVzKSB7XG4gIHZhciBwcmVmaXggPSB1cGRhdGVzLnBhY2thZ2U7XG4gIGZvciAodmFyIGtleSBpbiB1cGRhdGVzKSB7XG4gICAgaWYgKGtleVswXSA9PT0ga2V5WzBdLnRvVXBwZXJDYXNlKCkgJiYgdXBkYXRlcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICB0aGlzLl9rbm93blNlcnZpY2VEZWZpbml0aW9uc1twcmVmaXggKyAnLicgKyBrZXldID0gdXBkYXRlc1trZXldO1xuICAgIH1cbiAgfVxufTtcblxuLy8gUmV0dXJucyBhbiBlcnJvciBpZiB0aGUgdmFsaWRhdGlvbiBvZiBtZXRhZGF0YSBmYWlsZWQuXG5TZXJ2ZXIucHJvdG90eXBlLl9nZXRBbmRWYWxpZGF0ZU1ldGFkYXRhID0gZnVuY3Rpb24oc2VydmljZU9iamVjdCxcbiAgICBzZXJ2aWNlTWV0YWRhdGEpIHtcbiAgdmFyIHNob3VsZENoZWNrRGVmaW5pdGlvbiA9IGZhbHNlO1xuICBpZiAodHlwZW9mKHNlcnZpY2VNZXRhZGF0YSkgPT09ICdzdHJpbmcnKSB7XG4gICAgc2VydmljZU1ldGFkYXRhID0gW3NlcnZpY2VNZXRhZGF0YV07XG4gIH1cblxuICBpZiAoQXJyYXkuaXNBcnJheShzZXJ2aWNlTWV0YWRhdGEpKSB7XG4gICAgc2hvdWxkQ2hlY2tEZWZpbml0aW9uID0gdHJ1ZTtcbiAgICB2YXIgc2VydmljZURlZmluaXRpb25zID0ge307XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNlcnZpY2VNZXRhZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGtleSA9IHNlcnZpY2VNZXRhZGF0YVtpXTtcbiAgICAgIHZhciBvYmplY3QgPSB0aGlzLl9rbm93blNlcnZpY2VEZWZpbml0aW9uc1trZXldO1xuICAgICAgaWYgKCFvYmplY3QpIHtcbiAgICAgICAgcmV0dXJuIG5ldyB2RXJyb3IuTm90Rm91bmRFcnJvcigndW5rbm93biBzZXJ2aWNlICcgKyBrZXkpO1xuICAgICAgfVxuICAgICAgLy8gTWVyZ2UgdGhlIHJlc3VsdHMgaW50byB0aGUgc2luZ2xlIGRlZmluaXRpb25zIG9iamVjdC5cbiAgICAgIGZvciAodmFyIGsgaW4gb2JqZWN0KSB7XG4gICAgICAgIGlmIChvYmplY3QuaGFzT3duUHJvcGVydHkoaykpIHtcbiAgICAgICAgICBzZXJ2aWNlRGVmaW5pdGlvbnNba10gPSBvYmplY3Rba107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgc2VydmljZU1ldGFkYXRhID0gc2VydmljZURlZmluaXRpb25zO1xuICB9XG5cbiAgdmFyIHdyYXBwZXIgPSBuZXcgU2VydmljZVdyYXBwZXIoc2VydmljZU9iamVjdCwgc2VydmljZU1ldGFkYXRhKTtcblxuICBpZiAoc2hvdWxkQ2hlY2tEZWZpbml0aW9uKSB7XG4gICAgdmFyIGVycjIgPSB3cmFwcGVyLnZhbGlkYXRlKHNlcnZpY2VNZXRhZGF0YSk7XG4gICAgaWYgKGVycjIpIHtcbiAgICAgIHJldHVybiBlcnIyO1xuICAgIH1cbiAgfVxuXG4gIHRoaXMuc2VydmljZU9iamVjdCA9IHdyYXBwZXI7XG5cbiAgcmV0dXJuIG51bGw7XG59O1xuXG4vKipcbiAqIFNlcnZlIHNlcnZlcyB0aGUgZ2l2ZW4gc2VydmljZSBvYmplY3QgdW5kZXIgdGhlIGdpdmVuIG5hbWUuICBJdCB3aWxsXG4gKiByZWdpc3RlciB0aGVtIHdpdGggdGhlIG1vdW50IHRhYmxlIGFuZCBtYWludGFpbiB0aGF0IHJlZ2lzdHJhdGlvbiBzbyBsb25nXG4gKiBhcyB0aGUgc3RvcCgpIG1ldGhvZCBoYXMgbm90IGJlZW4gY2FsbGVkLiAgVGhlIG5hbWUgZGV0ZXJtaW5lcyB3aGVyZVxuICogaW4gdGhlIG1vdW50IHRhYmxlJ3MgbmFtZSB0cmVlIHRoZSBuZXcgc2VydmljZXMgd2lsbCBhcHBlYXIuXG4gKlxuICogVG8gc2VydmUgbmFtZXMgb2YgdGhlIGZvcm0gXCJteW1lZGlhLypcIiBtYWtlIHRoZSBjYWxsczpcbiAqIHNlcnZlKFwibXltZWRpYVwiLCBteVNlcnZpY2UpO1xuXG4gKiBzZXJ2ZSBtYXkgYmUgY2FsbGVkIG11bHRpcGxlIHRpbWVzIHRvIHNlcnZlIHRoZSBzYW1lIHNlcnZpY2UgdW5kZXJcbiAqIG11bHRpcGxlIG5hbWVzLiAgSWYgZGlmZmVyZW50IG9iamVjdHMgYXJlIGdpdmVuIG9uIHRoZSBkaWZmZXJlbnQgY2FsbHNcbiAqIGl0IGlzIGNvbnNpZGVyZWQgYW4gZXJyb3IuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmFtZSB0byBzZXJ2ZSB1bmRlclxuICogQHBhcmFtIHtPYmplY3R9IHNlcnZpY2VPYmplY3Qgc2VydmljZSBvYmplY3QgdG8gc2VydmVcbiAqIEBwYXJhbSB7Kn0gc2VydmljZU1ldGFkYXRhIGlmIHByb3ZpZGVkIGEgc2V0IG9mIG1ldGFkYXRhIGZvciBmdW5jdGlvbnNcbiAqIGluIHRoZSBzZXJ2aWNlIChzdWNoIGFzIG51bWJlciBvZiByZXR1cm4gdmFsdWVzKS4gIEl0IGNvdWxkIGVpdGhlciBiZVxuICogcGFzc2VkIGluIGFzIGEgcHJvcGVydGllcyBvYmplY3Qgb3IgYSBzdHJpbmcgdGhhdCBpcyB0aGUgbmFtZSBvZiBhXG4gKiBzZXJ2aWNlIHRoYXQgd2FzIGRlZmluZWQgaW4gdGhlIGlkbCBmaWxlcyB0aGF0IHRoZSBzZXJ2ZXIga25vd3MgYWJvdXQuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayBpZiBwcm92aWRlZCwgdGhlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIG9uXG4gKiBjb21wbGV0aW9uLiBUaGUgb25seSBhcmd1bWVudCBpcyBhbiBlcnJvciBpZiB0aGVyZSB3YXMgb25lLlxuICogQHJldHVybiB7UHJvbWlzZX0gUHJvbWlzZSB0byBiZSBjYWxsZWQgd2hlbiBzZXJ2ZSBjb21wbGV0ZXMgb3IgZmFpbHNcbiAqIHRoZSBlbmRwb2ludCBhZGRyZXNzIG9mIHRoZSBzZXJ2ZXIgd2lsbCBiZSByZXR1cm5lZCBhcyB0aGUgdmFsdWUgb2YgcHJvbWlzZVxuICovXG5TZXJ2ZXIucHJvdG90eXBlLnNlcnZlID0gZnVuY3Rpb24obmFtZSwgc2VydmljZU9iamVjdCxcbiAgICBzZXJ2aWNlTWV0YWRhdGEsIGNhbGxiYWNrKSB7XG4gIGlmICghY2FsbGJhY2sgJiYgdHlwZW9mKHNlcnZpY2VNZXRhZGF0YSkgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IHNlcnZpY2VNZXRhZGF0YTtcbiAgICBzZXJ2aWNlTWV0YWRhdGEgPSBudWxsO1xuICB9XG5cbiAgdmFyIGVyciA9IHRoaXMuX2dldEFuZFZhbGlkYXRlTWV0YWRhdGEoc2VydmljZU9iamVjdCwgc2VydmljZU1ldGFkYXRhKTtcbiAgaWYgKGVycikge1xuICAgIHZhciBkZWYgPSBuZXcgRGVmZXJyZWQoY2FsbGJhY2spO1xuICAgIGRlZi5yZWplY3QoZXJyKTtcbiAgICByZXR1cm4gZGVmLnByb21pc2U7XG4gIH1cblxuICByZXR1cm4gdGhpcy5fcm91dGVyLnNlcnZlKG5hbWUsIHRoaXMsIGNhbGxiYWNrKTtcbn07XG5cbi8qKlxuICogU3RvcCBncmFjZWZ1bGx5IHN0b3BzIGFsbCBzZXJ2aWNlcyBvbiB0aGlzIFNlcnZlci5cbiAqIE5ldyBjYWxscyBhcmUgcmVqZWN0ZWQsIGJ1dCBhbnkgaW4tZmxpZ2h0IGNhbGxzIGFyZSBhbGxvd2VkIHRvIGNvbXBsZXRlLlxuICogQWxsIHB1Ymxpc2hlZCBuYW1lZCBhcmUgdW5tb3VudGVkLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgaWYgcHJvdmlkZWQsIHRoZSBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCBvblxuICogY29tcGxldGlvbi4gVGhlIG9ubHkgYXJndW1lbnQgaXMgYW4gZXJyb3IgaWYgdGhlcmUgd2FzIG9uZS5cbiAqIEByZXR1cm4ge1Byb21pc2V9IFByb21pc2UgdG8gYmUgY2FsbGVkIHdoZW4gc3RvcCBzZXJ2aWNlIGNvbXBsZXRlcyBvciBmYWlsc1xuICovXG5TZXJ2ZXIucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICByZXR1cm4gdGhpcy5fcm91dGVyLnN0b3BTZXJ2ZXIodGhpcywgY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZXMgYW4gSURMIHdpcmUgZGVzY3JpcHRpb24gZm9yIGFsbCB0aGUgcmVnaXN0ZXJlZCBzZXJ2aWNlc1xuICogQHJldHVybiB7T2JqZWN0LjxzdHJpbmcsIE9iamVjdD59IG1hcCBmcm9tIHNlcnZpY2UgbmFtZSB0byBpZGwgd2lyZVxuICogZGVzY3JpcHRpb25cbiAqL1xuU2VydmVyLnByb3RvdHlwZS5nZW5lcmF0ZUlkbFdpcmVEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gSWRsSGVscGVyLmdlbmVyYXRlSWRsV2lyZURlc2NyaXB0aW9uKHRoaXMuc2VydmljZU9iamVjdCk7XG59O1xuXG4vKipcbiAqIEV4cG9ydCB0aGUgbW9kdWxlXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gU2VydmVyO1xuIiwiLyoqXG4gKiBAZmlsZW92ZXJpZXcgQSByb3V0ZXIgdGhhdCBoYW5kbGVzIGluY29taW5nIHNlcnZlciBycGNzLlxuICovXG5cbnZhciBQcm9taXNlID0gcmVxdWlyZSgnZXM2LXByb21pc2UnKS5Qcm9taXNlO1xuXG52YXIgU3RyZWFtID0gcmVxdWlyZSgnLi4vcHJveHkvc3RyZWFtJyk7XG52YXIgTWVzc2FnZVR5cGUgPSByZXF1aXJlKCcuLi9wcm94eS9tZXNzYWdlX3R5cGUnKTtcbnZhciBJbmNvbWluZ1BheWxvYWRUeXBlID0gcmVxdWlyZSgnLi4vcHJveHkvaW5jb21pbmdfcGF5bG9hZF90eXBlJyk7XG52YXIgRXJyb3JDb252ZXJzaW9uID0gcmVxdWlyZSgnLi4vcHJveHkvZXJyb3JfY29udmVyc2lvbicpO1xudmFyIERlZmVycmVkID0gcmVxdWlyZSgnLi8uLi9saWIvZGVmZXJyZWQnKTtcbnZhciB2TG9nID0gcmVxdWlyZSgnLi8uLi9saWIvdmxvZycpO1xudmFyIFNpbXBsZUhhbmRsZXIgPSByZXF1aXJlKCcuLi9wcm94eS9zaW1wbGVfaGFuZGxlcicpO1xudmFyIFB1YmxpY0lkID0gcmVxdWlyZSgnLi4vc2VjdXJpdHkvcHVibGljJyk7XG5cblxudmFyIFNlcnZlclN0cmVhbSA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICB0aGlzLl9zdHJlYW0gPSBzdHJlYW07XG59O1xuXG5TZXJ2ZXJTdHJlYW0ucHJvdG90eXBlLmhhbmRsZVJlc3BvbnNlID0gZnVuY3Rpb24odHlwZSwgZGF0YSkge1xuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlIEluY29taW5nUGF5bG9hZFR5cGUuU1RSRUFNX1JFU1BPTlNFOlxuICAgICAgdGhpcy5fc3RyZWFtLl9xdWV1ZVJlYWQoZGF0YSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEluY29taW5nUGF5bG9hZFR5cGUuU1RSRUFNX0NMT1NFOlxuICAgICAgdGhpcy5fc3RyZWFtLl9xdWV1ZVJlYWQobnVsbCk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIEluY29taW5nUGF5bG9hZFR5cGUuRVJST1JfUkVTUE9OU0U6XG4gICAgICB0aGlzLl9zdHJlYW0uZW1pdCgnZXJyb3InLCBFcnJvckNvbnZlcnNpb24udG9KU2Vycm9yKGRhdGEpKTtcbiAgICAgIGJyZWFrO1xuICB9XG59O1xuXG4vKipcbiAqIEEgcm91dGVyIHRoYXQgaGFuZGxlcyByb3V0aW5nIGluY29taW5nIHJlcXVlc3RzIHRvIHRoZSByaWdodFxuICogc2VydmVyXG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIFJvdXRlciA9IGZ1bmN0aW9uKHByb3h5KSB7XG4gIHRoaXMuX3NlcnZlcnMgPSB7fTtcbiAgdGhpcy5fcHJveHkgPSBwcm94eTtcbiAgdGhpcy5fc3RyZWFtTWFwID0ge307XG4gIHByb3h5LmFkZEluY29taW5nSGFuZGxlcihJbmNvbWluZ1BheWxvYWRUeXBlLklOVk9LRV9SRVFVRVNULCB0aGlzKTtcbn07XG5cbi8qKlxuICogSW5qZWN0cyB0aGUgaW5qZWN0aW9ucyBpbnRvIHRoZSBlaWdodCBwb3NpdGlvbnMgaW4gYXJncyBhbmRcbiAqIHJldHVybnMgd2hhdCB3YXMgaW5qZWN0ZWQuXG4gKiBAcGFyYW0ge0FycmF5fSBhcmdzIFRoZSBhcmd1bWVudHMgdG8gaW5qZWN0IGludG8uXG4gKiBAcGFyYW0ge09iamVjdH0gaW5qZWN0aW9uUG9zaXRpb25zIEEgbWFwIG9mIGluamVjdGVkIHZhcmlhYmxlcyB0byB0aGVcbiAqIHBvc2l0aW9uIHRvIHB1dCBpbiBhcmdzLlxuICogQHBhcmFtIHtPYmplY3R9IGluamVjdGlvbnMgQSBtYXAgb2YgaW5qZWN0ZWQgdmFyaWFibGVzIHRvIHZhbHVlcy5cbiAqIEByZXR1cm4ge0FycmF5fSB0aGUgYXJyYXkgb2YgdmFyaWFibGVzIHRoYXQgd2VyZSBpbmplY3RlZC5cbiAqL1xudmFyIGluamVjdCA9IGZ1bmN0aW9uKGFyZ3MsIGluamVjdGlvblBvc2l0aW9ucywgaW5qZWN0aW9ucykge1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGluamVjdGlvblBvc2l0aW9ucyk7XG4gIHZhciBpbnZlcnRlZE1hcCA9IHt9O1xuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaW52ZXJ0ZWRNYXBbaW5qZWN0aW9uUG9zaXRpb25zW2tleV1dID0ga2V5O1xuICB9KTtcbiAgdmFyIHZhbHVlcyA9IGtleXMubWFwKGZ1bmN0aW9uIGdldFZhbHVlKGspIHtcbiAgICByZXR1cm4gaW5qZWN0aW9uUG9zaXRpb25zW2tdO1xuICB9KTtcbiAgdmFsdWVzLmZpbHRlcihmdW5jdGlvbiByZW1vdmVVbmRlZmluZWQodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUgIT09IHVuZGVmaW5lZDtcbiAgfSk7XG4gIHZhbHVlcy5zb3J0KCk7XG4gIHZhciBrZXlzSW5zZXJ0ZWQgPSBbXTtcbiAgdmFsdWVzLmZvckVhY2goZnVuY3Rpb24gYWN0dWFsbHlJbmplY3QocG9zKSB7XG4gICAgdmFyIGtleSA9IGludmVydGVkTWFwW3Bvc107XG4gICAgYXJncy5zcGxpY2UocG9zLCAwLCBpbmplY3Rpb25zW2tleV0pO1xuICAgIGtleXNJbnNlcnRlZC5wdXNoKGtleSk7XG4gIH0pO1xuICByZXR1cm4ga2V5c0luc2VydGVkO1xufTtcblxuLy8gV3JhcHMgdGhlIGNhbGwgdG8gdGhlIG1ldGhvZCB3aXRoIGEgdHJ5IGJsb2NrIGluIHRoZSBzbWFsbGVzdFxuLy8gZnVuY3Rpb24gcG9zc2libGUsIHNvIHRoYXQgdjggZGUtb3B0aW1pemVzIGFzIGxpdHRsZSBhcyBwb3NzaWJsZS5cblJvdXRlci5wcm90b3R5cGUuaW52b2tlTWV0aG9kID0gZnVuY3Rpb24gKHJlY2VpdmVyLCBtZXRob2QsIGFyZ3MpIHtcbiAgLy8gQ2FsbCB0aGUgcmVnaXN0ZXJlZCBtZXRob2Qgb24gdGhlIHJlcXVlc3RlZCBzZXJ2aWNlXG4gIHRyeSB7XG4gICAgcmV0dXJuIG1ldGhvZC5hcHBseShyZWNlaXZlciwgYXJncyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBpZiAoZSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICByZXR1cm4gZTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBFcnJvcihlKTtcbiAgfVxufTtcblxuLyoqXG4gKiBIYW5kbGVzIGluY29taW5nIHJlcXVlc3RzIGZyb20gdGhlIHNlcnZlciB0byBpbnZva2UgbWV0aG9kcyBvbiByZWdpc3RlcmVkXG4gKiBzZXJ2aWNlcyBpbiBKYXZhU2NyaXB0LlxuICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2VJZCBNZXNzYWdlIElkIHNldCBieSB0aGUgc2VydmVyLlxuICogQHBhcmFtIHtPYmplY3R9IHJlcXVlc3QgSW52b2NhdGlvbiByZXF1ZXN0IEpTT04uIFJlcXVlc3QncyBzdHJ1Y3R1cmUgaXNcbiAqIHtcbiAqICAgc2VydmVySWQ6IG51bWJlciAvLyB0aGUgc2VydmVyIGlkXG4gKiAgIG1ldGhvZDogc3RyaW5nIC8vIE5hbWUgb2YgdGhlIG1ldGhvZCBvbiB0aGUgc2VydmljZSB0byBjYWxsXG4gKiAgIGFyZ3M6IFtdIC8vIEFycmF5IG9mIHBvc2l0aW9uYWwgYXJndW1lbnRzIHRvIGJlIHBhc3NlZCBpbnRvIHRoZSBtZXRob2RcbiAqIH1cbiAqL1xuUm91dGVyLnByb3RvdHlwZS5oYW5kbGVSZXF1ZXN0ID0gZnVuY3Rpb24obWVzc2FnZUlkLCByZXF1ZXN0KSB7XG4gIHZhciBlcnI7XG4gIHZhciBzZXJ2ZXIgPSB0aGlzLl9zZXJ2ZXJzW3JlcXVlc3Quc2VydmVySWRdO1xuICBpZiAoIXNlcnZlcikge1xuICAgIGVyciA9IG5ldyBFcnJvcignUmVxdWVzdCBmb3IgdW5rbm93biBzZXJ2ZXIgJyArIHJlcXVlc3Quc2VydmVySWQpO1xuICAgIHRoaXMuc2VuZFJlc3VsdChtZXNzYWdlSWQsIHJlcXVlc3QubWV0aG9kLCBudWxsLCBlcnIpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBzZXJ2aWNlV3JhcHBlciA9IHNlcnZlci5zZXJ2aWNlT2JqZWN0O1xuICBpZiAoIXNlcnZpY2VXcmFwcGVyKSB7XG4gICAgZXJyID0gbmV3IEVycm9yKCdObyBzZXJ2aWNlIGZvdW5kJyk7XG4gICAgdGhpcy5zZW5kUmVzdWx0dFJlc3VsdChtZXNzYWdlSWQsIHJlcXVlc3QubWV0aG9kLCBudWxsLCBlcnIpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBzZXJ2aWNlT2JqZWN0ID0gc2VydmljZVdyYXBwZXIub2JqZWN0O1xuXG4gIC8vIEZpbmQgdGhlIG1ldGhvZFxuICB2YXIgc2VydmljZU1ldGhvZCA9IHNlcnZpY2VPYmplY3RbcmVxdWVzdC5tZXRob2RdO1xuICBpZiAoc2VydmljZU1ldGhvZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgZXJyID0gbmV3IEVycm9yKCdSZXF1ZXN0ZWQgbWV0aG9kICcgKyByZXF1ZXN0Lm1ldGhvZCArXG4gICAgICAgICcgbm90IGZvdW5kIG9uJyk7XG4gICAgdGhpcy5zZW5kUmVzdWx0KG1lc3NhZ2VJZCwgcmVxdWVzdC5tZXRob2QsIG51bGwsIGVycik7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBtZXRhZGF0YSA9IHNlcnZpY2VXcmFwcGVyLm1ldGFkYXRhW3JlcXVlc3QubWV0aG9kXTtcblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBzZW5kSW52b2NhdGlvbkVycm9yID0gZnVuY3Rpb24oZSwgbWV0YWRhdGEpIHtcbiAgICB2YXIgc3RhY2tUcmFjZTtcbiAgICBpZiAoZSBpbnN0YW5jZW9mIEVycm9yICYmIGUuc3RhY2sgIT09IHVuZGVmaW5lZCkge1xuICAgICAgc3RhY2tUcmFjZSA9IGUuc3RhY2s7XG4gICAgfVxuICAgIHZMb2cuZGVidWcoJ1JlcXVlc3RlZCBtZXRob2QgJyArIHJlcXVlc3QubWV0aG9kICtcbiAgICAgICAgJyB0aHJldyBhbiBleGNlcHRpb24gb24gaW52b2tlOiAnLCBlLCBzdGFja1RyYWNlKTtcbiAgICB2YXIgbnVtT3V0QXJncyA9IG1ldGFkYXRhLm51bU91dEFyZ3M7XG4gICAgdmFyIHJlc3VsdDtcbiAgICBzd2l0Y2ggKG51bU91dEFyZ3MpIHtcbiAgICAgIGNhc2UgMDpcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHJlc3VsdCA9IG51bGw7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmVzdWx0ID0gbmV3IEFycmF5KG51bU91dEFyZ3MpO1xuICAgIH1cbiAgICBzZWxmLnNlbmRSZXN1bHQobWVzc2FnZUlkLCByZXF1ZXN0Lm1ldGhvZCwgcmVzdWx0LCBlLFxuICAgICAgICBtZXRhZGF0YSk7XG4gIH07XG4gIHZhciBhcmdzID0gcmVxdWVzdC5hcmdzO1xuXG4gIHZhciBjb250ZXh0ID0ge1xuICAgIHN1ZmZpeDogcmVxdWVzdC5jb250ZXh0LnN1ZmZpeCxcbiAgICBuYW1lOiByZXF1ZXN0LmNvbnRleHQubmFtZSxcbiAgICByZW1vdGVJZDogbmV3IFB1YmxpY0lkKHJlcXVlc3QuY29udGV4dC5yZW1vdGVJRC5uYW1lcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3QuY29udGV4dC5yZW1vdGVJRC5oYW5kbGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLl9wcm94eSlcbiAgfTtcblxuICAvLyBDcmVhdGUgY2FsbGJhY2sgdG8gcGFzcyB0byB0aGUgZnVuY3Rpb24sIGlmIGl0IGlzIHJlcXVlc3RlZC5cbiAgdmFyIGZpbmlzaGVkID0gZmFsc2U7XG4gIHZhciBjYiA9IGZ1bmN0aW9uIGNhbGxiYWNrKGUsIHYpIHtcbiAgICBpZiAoZmluaXNoZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZmluaXNoZWQgPSB0cnVlO1xuICAgIGNvbnRleHQucmVtb3RlSWQucmVsZWFzZSgpO1xuICAgIHNlbGYuc2VuZFJlc3VsdChtZXNzYWdlSWQsIHJlcXVlc3QubWV0aG9kLCB2LCBlLCBtZXRhZGF0YSk7XG4gIH07XG5cbiAgdmFyIGluamVjdGlvbnMgPSB7XG4gICAgJHN0cmVhbTogbmV3IFN0cmVhbShtZXNzYWdlSWQsIHRoaXMuX3Byb3h5LnNlbmRlclByb21pc2UsIGZhbHNlKSxcbiAgICAkY2FsbGJhY2s6IGNiLFxuICAgICRjb250ZXh0OiBjb250ZXh0LFxuICAgICRzdWZmaXg6IGNvbnRleHQuc3VmZml4LFxuICAgICRuYW1lOiBjb250ZXh0Lm5hbWUsXG4gICAgJHJlbW90ZUlkOiBjb250ZXh0LnJlbW90ZUlkXG4gIH07XG5cbiAgdmFyIHZhcmlhYmxlcyA9IGluamVjdChhcmdzLCBtZXRhZGF0YS5pbmplY3Rpb25zLCBpbmplY3Rpb25zKTtcbiAgaWYgKHZhcmlhYmxlcy5pbmRleE9mKCckc3RyZWFtJykgIT09IC0xKSB7XG4gICAgdmFyIHN0cmVhbSA9IGluamVjdGlvbnNbJyRzdHJlYW0nXTtcbiAgICB0aGlzLl9zdHJlYW1NYXBbbWVzc2FnZUlkXSA9IHN0cmVhbTtcbiAgICB2YXIgcnBjID0gbmV3IFNlcnZlclN0cmVhbShzdHJlYW0pO1xuICAgIHRoaXMuX3Byb3h5LmFkZEluY29taW5nU3RyZWFtSGFuZGxlcihtZXNzYWdlSWQsIHJwYyk7XG4gIH1cblxuICAvLyBJbnZva2UgdGhlIG1ldGhvZFxuICB2YXIgcmVzdWx0ID0gdGhpcy5pbnZva2VNZXRob2Qoc2VydmljZU9iamVjdCwgc2VydmljZU1ldGhvZCwgYXJncyk7XG5cbiAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgc2VuZEludm9jYXRpb25FcnJvcihyZXN1bHQsIG1ldGFkYXRhKTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBOb3JtYWxpemUgcmVzdWx0IHRvIGJlIGEgcHJvbWlzZVxuICB2YXIgcmVzdWx0UHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZShyZXN1bHQpO1xuXG4gIGlmICh2YXJpYWJsZXMuaW5kZXhPZignJGNhbGxiYWNrJykgIT09IC0xKSB7XG4gICAgLy8gVGhlIGNhbGxiYWNrIHRha2VzIGNhcmUgb2Ygc2VuZGluZyB0aGUgcmVzdWx0LCBzbyB3ZSBkb24ndCB1c2UgdGhlXG4gICAgLy8gcHJvbWlzZXMuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gU2VuZCB0aGUgcmVzdWx0IGJhY2sgdG8gdGhlIHNlcnZlclxuICByZXN1bHRQcm9taXNlLnRoZW4oZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoZmluaXNoZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29udGV4dC5yZW1vdGVJZC5yZWxlYXNlKCk7XG4gICAgZmluaXNoZWQgPSB0cnVlO1xuICAgIHNlbGYuc2VuZFJlc3VsdChtZXNzYWdlSWQsIHJlcXVlc3QubWV0aG9kLCB2YWx1ZSxcbiAgICAgICAgbnVsbCwgbWV0YWRhdGEpO1xuICB9LCBmdW5jdGlvbihlcnIpIHtcbiAgICBpZiAoZmluaXNoZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZmluaXNoZWQgPSB0cnVlO1xuICAgIHNlbmRJbnZvY2F0aW9uRXJyb3IoZXJyLCBtZXRhZGF0YSk7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBTZW5kcyB0aGUgcmVzdWx0IG9mIGEgcmVxdWVzdGVkIGludm9jYXRpb24gYmFjayB0byBqc3ByXG4gKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZUlkIE1lc3NhZ2UgaWQgb2YgdGhlIG9yaWdpbmFsIGludm9jYXRpb24gcmVxdWVzdFxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmFtZSBvZiBtZXRob2RcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZSBSZXN1bHQgb2YgdGhlIGNhbGxcbiAqIEBwYXJhbSB7T2JqZWN0fSBlcnIgRXJyb3IgZnJvbSB0aGUgY2FsbFxuICogQHBhcmFtIHtPYmplY3R9IG1ldGFkYXRhIE1ldGFkYXRhIGFib3V0IHRoZSBmdW5jdGlvbi5cbiAqL1xuUm91dGVyLnByb3RvdHlwZS5zZW5kUmVzdWx0ID0gZnVuY3Rpb24obWVzc2FnZUlkLCBuYW1lLCB2YWx1ZSwgZXJyLCBtZXRhZGF0YSkge1xuICB2YXIgcmVzdWx0cyA9IFtdO1xuICBpZiAobWV0YWRhdGEpIHtcbiAgICBzd2l0Y2ggKG1ldGFkYXRhLm51bU91dEFyZ3MpIHtcbiAgICAgIGNhc2UgMDpcbiAgICAgICAgaWYgKHZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB2TG9nLmVycm9yKCdVbmV4cGVjdGVkIHJldHVybiB2YWx1ZSBmcm9tICcgKyBuYW1lICsgJzogJyArIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHRzID0gW107XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAxOlxuICAgICAgICByZXN1bHRzID0gW3ZhbHVlXTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgICBpZiAodmFsdWUubGVuZ3RoICE9PSBtZXRhZGF0YS5udW1PdXRBcmdzKSB7XG4gICAgICAgICAgICB2TG9nLmVycm9yKCdXcm9uZyBudW1iZXIgb2YgYXJndW1lbnRzIHJldHVybmVkIGJ5ICcgKyBuYW1lICtcbiAgICAgICAgICAgICAgICAnLiBleHBlY3RlZDogJyArIG1ldGFkYXRhLm51bU91dEFyZ3MgKyAnLCBnb3Q6JyArXG4gICAgICAgICAgICAgICAgdmFsdWUubGVuZ3RoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzdWx0cyA9IHZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZMb2cuZXJyb3IoJ1dyb25nIG51bWJlciBvZiBhcmd1bWVudHMgcmV0dXJuZWQgYnkgJyArIG5hbWUgK1xuICAgICAgICAgICAgICAnLiBleHBlY3RlZDogJyArIG1ldGFkYXRhLm51bU91dEFyZ3MgKyAnLCBnb3Q6IDEnKTtcbiAgICAgICAgICByZXN1bHRzID0gW3ZhbHVlXTtcbiAgICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXN1bHRzID0gW3ZhbHVlXTtcbiAgfVxuXG4gIHZhciBlcnJvclN0cnVjdCA9IG51bGw7XG4gIGlmIChlcnIgIT09IHVuZGVmaW5lZCAmJiBlcnIgIT09IG51bGwpIHtcbiAgICBlcnJvclN0cnVjdCA9IEVycm9yQ29udmVyc2lvbi50b1N0YW5kYXJkRXJyb3JTdHJ1Y3QoZXJyKTtcbiAgfVxuXG4gIC8vIElmIHRoaXMgaXMgYSBzdHJlYW1pbmcgcmVxdWVzdCwgcXVldWUgdXAgdGhlIGZpbmFsIHJlc3BvbnNlIGFmdGVyIGFsbFxuICAvLyB0aGUgb3RoZXIgc3RyZWFtIHJlcXVlc3RzIGFyZSBkb25lLlxuICB2YXIgc3RyZWFtID0gdGhpcy5fc3RyZWFtTWFwW21lc3NhZ2VJZF07XG4gIGlmIChzdHJlYW0pIHtcbiAgICAvLyBXZSBzaG91bGQgcHJvYmFibHkgcmVtb3ZlIHRoZSBzdHJlYW0gZnJvbSB0aGUgZGljdGlvbmFyeSwgYnV0IGl0J3NcbiAgICAvLyBub3QgY2xlYXIgaWYgdGhlcmUgaXMgc3RpbGwgYSByZWZlcmVuY2UgYmVpbmcgaGVsZCBlbHNld2hlcmUuICBJZiB0aGVyZVxuICAgIC8vIGlzbid0LCB0aGVuIEdDIG1pZ2h0IHByZXZlbnQgdGhpcyBmaW5hbCBtZXNzYWdlIGZyb20gYmVpbmcgc2VudCBvdXQuXG4gICAgc3RyZWFtLnNlcnZlckNsb3NlKHZhbHVlLCBlcnJvclN0cnVjdCk7XG4gICAgdGhpcy5fcHJveHkuZGVxdWV1ZShtZXNzYWdlSWQpO1xuICB9IGVsc2Uge1xuICAgIHZhciByZXNwb25zZURhdGEgPSB7XG4gICAgICByZXN1bHRzOiByZXN1bHRzLFxuICAgICAgZXJyOiBlcnJvclN0cnVjdFxuICAgIH07XG5cbiAgICB2YXIgcmVzcG9uc2VEYXRhSlNPTiA9IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlRGF0YSk7XG4gICAgdGhpcy5fcHJveHkuc2VuZFJlcXVlc3QocmVzcG9uc2VEYXRhSlNPTiwgTWVzc2FnZVR5cGUuUkVTUE9OU0UsIG51bGwsXG4gICAgICAgIG1lc3NhZ2VJZCk7XG4gIH1cbn07XG5cbi8qKlxuICogU2VydmVzIHRoZSBzZXJ2ZXIgdW5kZXIgdGhlIGdpdmVuIG5hbWVcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5hbWUgdG8gc2VydmUgdW5kZXJcbiAqIEBwYXJhbSB7VmV5cm9uLlNlcnZlcn0gVGhlIHNlcnZlciB3aG8gd2lsbCBoYW5kbGUgdGhlIHJlcXVlc3RzIGZvciB0aGlzXG4gKiBuYW1lLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSBJZiBwcm92aWRlZCwgdGhlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIHdoZW5cbiAqIHNlcnZlIGNvbXBsZXRlcy4gIFRoZSBmaXJzdCBhcmd1bWVudCBwYXNzZWQgaW4gaXMgdGhlIGVycm9yIGlmIHRoZXJlXG4gKiB3YXMgYW55IGFuZCB0aGUgc2Vjb25kIGFyZ3VtZW50IGlzIHRoZSBlbmRwb2ludC5cbiAqIEByZXR1cm4ge1Byb21pc2V9IFByb21pc2UgdG8gYmUgY2FsbGVkIHdoZW4gc2VydmUgY29tcGxldGVzIG9yIGZhaWxzXG4gKiB0aGUgZW5kcG9pbnQgc3RyaW5nIG9mIHRoZSBzZXJ2ZXIgd2lsbCBiZSByZXR1cm5lZCBhcyB0aGUgdmFsdWUgb2YgcHJvbWlzZVxuICovXG5Sb3V0ZXIucHJvdG90eXBlLnNlcnZlID0gZnVuY3Rpb24obmFtZSwgc2VydmVyLCBjYWxsYmFjaykge1xuICB2TG9nLmluZm8oJ1NlcnZpbmcgdW5kZXIgdGhlIG5hbWU6ICcsIG5hbWUpO1xuXG4gIHZhciBtZXNzYWdlSlNPTiA9IHtcbiAgICBuYW1lOiBuYW1lLFxuICAgIHNlcnZlcklkOiBzZXJ2ZXIuaWQsXG4gICAgc2VydmljZTogc2VydmVyLmdlbmVyYXRlSWRsV2lyZURlc2NyaXB0aW9uKClcbiAgfTtcblxuICB0aGlzLl9zZXJ2ZXJzW3NlcnZlci5pZF0gPSBzZXJ2ZXI7XG5cbiAgdmFyIGRlZiA9IG5ldyBEZWZlcnJlZChjYWxsYmFjayk7XG4gIHZhciBtZXNzYWdlID0gSlNPTi5zdHJpbmdpZnkobWVzc2FnZUpTT04pO1xuICB2YXIgaWQgPSB0aGlzLl9wcm94eS5pZDtcbiAgdGhpcy5fcHJveHkuaWQgKz0gMjtcbiAgdmFyIGhhbmRsZXIgPSBuZXcgU2ltcGxlSGFuZGxlcihkZWYsIHRoaXMuX3Byb3h5LCBpZCk7XG4gIC8vIFNlbmQgdGhlIHNlcnZlIHJlcXVlc3QgdG8gdGhlIHByb3h5XG4gIHRoaXMuX3Byb3h5LnNlbmRSZXF1ZXN0KG1lc3NhZ2UsIE1lc3NhZ2VUeXBlLlNFUlZFLCBoYW5kbGVyLCBpZCk7XG5cbiAgcmV0dXJuIGRlZi5wcm9taXNlO1xufTtcblxuLyoqXG4gKiBTZW5kcyBhIHN0b3Agc2VydmVyIHJlcXVlc3QgdG8ganNwci5cbiAqIEBwYXJhbSB7U2VydmVyfSBzZXJ2ZXIgU2VydmVyIG9iamVjdCB0byBzdG9wLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgaWYgcHJvdmlkZWQsIHRoZSBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCBvblxuICogY29tcGxldGlvbi4gVGhlIG9ubHkgYXJndW1lbnQgaXMgYW4gZXJyb3IgaWYgdGhlcmUgd2FzIG9uZS5cbiAqIEByZXR1cm4ge1Byb21pc2V9IFByb21pc2UgdG8gYmUgY2FsbGVkIHdoZW4gc3RvcCBzZXJ2aWNlIGNvbXBsZXRlcyBvciBmYWlsc1xuICovXG5Sb3V0ZXIucHJvdG90eXBlLnN0b3BTZXJ2ZXIgPSBmdW5jdGlvbihzZXJ2ZXIsIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICB2YXIgZGVmID0gbmV3IERlZmVycmVkKGNhbGxiYWNrKTtcbiAgdmFyIGlkID0gdGhpcy5fcHJveHkuaWQ7XG4gIHRoaXMuX3Byb3h5LmlkICs9IDI7XG4gIHZhciBoYW5kbGVyID0gbmV3IFNpbXBsZUhhbmRsZXIoZGVmLCB0aGlzLl9wcm94eSwgaWQpO1xuICAvLyBTZW5kIHRoZSBzdG9wIHJlcXVlc3QgdG8ganNwclxuICB0aGlzLl9wcm94eS5zZW5kUmVxdWVzdChzZXJ2ZXIuaWQudG9TdHJpbmcoKSwgTWVzc2FnZVR5cGUuU1RPUCwgaGFuZGxlciwgaWQpO1xuXG4gIHJldHVybiBkZWYucHJvbWlzZS50aGVuKGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgIGRlbGV0ZSBzZWxmLl9zZXJ2ZXJzW3NlcnZlci5pZF07XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSk7XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gUm91dGVyO1xuXG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IEEgbGlnaHR3ZWlnaHQgZGVmZXJyZWQgaW1wbGVtZW50YXRpb24gdXNpbmcgRVM2IFByb21pc2VcbiAqIERlZmVycmVkIGFyZSBzb21ldGltZXMgZWFzaWVyIHRvIHVzZSBzaW5jZSB0aGV5IGNhbiBiZSBwYXNzZWQgYXJvdW5kXG4gKiBhbmQgcmVqZWN0ZWQsIHJlc29sdmVkIGJ5IG90aGVyIGNvZGUgd2hlcmVhcyBQcm9taXNlIEFQSSBkb2VzIG5vdCBleHBvc2VcbiAqIHJlamVjdCBhbmQgcmVzb2x2ZSBwdWJsaWNseS5cbiAqL1xuXG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJ2VzNi1wcm9taXNlJykuUHJvbWlzZTtcblxudmFyIERlZmVycmVkID0gZnVuY3Rpb24oY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHRoaXMucHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgIHNlbGYucmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgc2VsZi5yZWplY3QgPSByZWplY3Q7XG4gIH0pO1xuXG4gIGlmIChjYikge1xuICAgIHRoaXMucHJvbWlzZS50aGVuKGZ1bmN0aW9uIHJlc29sdmUodikge1xuICAgICAgY2IobnVsbCwgdik7XG4gICAgfSwgZnVuY3Rpb24gZXJyb3IoZSkge1xuICAgICAgY2IoZSk7XG4gICAgfSlcbiAgICAuY2F0Y2goZnVuY3Rpb24oZXJyKXtcbiAgICAgIC8vIE5PVEU6IERlYnVnZ2luZyBleGNlcHRpb25zIHdpdGggdGhlIGVzNi1wcm9taXNlIGxpYnJhcnkgaXNcbiAgICAgIC8vIHByb2JsZW1hdGljIGR1ZSB0byB0aGUgd2F5IHdyYXBwaW5nIHRoZSBmdW5jdGlvbiBjYWxscyBpbiBhXG4gICAgICAvLyB0cnkvY2F0Y2ggc3dhbGxvd3MgZXhjZXB0aW9ucyAodGhyb3duIGVycm9ycywgVHlwZSBFcnJvcnMsIGlsbGVnYWxcbiAgICAgIC8vIGNvZXJjaW9uLCBldGMuKSB3aGVyZSBhbiBleHBsaWNpdCBjYWxsIHRvIHByb21pc2UuY2F0Y2goZm4pIGhhcyBiZWVuXG4gICAgICAvLyBvbWl0dGVkLiBFdmVuIGlmIHRoZSAuY2F0Y2goKSBtZXRob2QgaW52b2NhdGlvbiBpcyBhZGRlZCB0aGVyZSBpcyBub1xuICAgICAgLy8gd2F5IHRvIGJ1YmJsZSB0aGUgZXJyb3IgaW4gYSBuYXR1cmFsIHdheS4gRXJyb3JzIHdpdGhpbiB0aGUgY2F0Y2hcbiAgICAgIC8vIGZ1bmN0aW9uIGFyZSB3cmFwcGVkIGluIHRoZSBzYW1lIHByb21pc2UgdHJ5L2NhdGNoIG1hY2hpbmF0aW9uIHNvXG4gICAgICAvLyB0aHJvd2luZyB3aXRoaW4gdGhlIC5jYXRjaCgpIGNhbGxiYWNrIHdpbGwgbm90IHlpZWxkIHVzZWZ1bCBvclxuICAgICAgLy8gZGVzaXJlZCByZXN1bHRzLlxuICAgICAgLy9cbiAgICAgIC8vIFRoZXJlIGFyZSBhIGZldyBzdWdnZXN0aW9ucyBvbiBob3cgdG8gZGVhbCB3aXRoIHRoaXM6XG4gICAgICAvL1xuICAgICAgLy8gKiBVc2UgYSBiZXR0ZXIgbGlicmFyeTogaHR0cDovL2dvby5nbC9NM3FVcEdcbiAgICAgIC8vICogQnJlYWsgdGhlIGVycm9yIG91dCBvZiB0aGUgc3RhY2s6IGh0dHA6Ly9nb28uZ2wveUJMNkRpXG4gICAgICAvLyAqIFwiRG91YmxlIGNhdGNoIHBhdHRlcm5cIjogaHR0cDovL2dvby5nbC9CZ1Q4aW5cbiAgICAgIC8vXG4gICAgICAvLyBCZWxvdyBpcyBhIHByaW1pdGl2ZSB3YXkgdG8gYnJlYWsgdGhlIGVycm9yIG91dCBvZiB0aGUgd3JhcHBpbmdcbiAgICAgIC8vIHByb21pc2Ugc3RhY2sgYXMgc3VnZ2VzdGVkIGJ5IHRoZSBhdXRob3Igb2YgdGhlIGVzNi1wcm9taXNlIGxpYnJhcnkuXG4gICAgICAvLyBUaGlzIHNob3VsZCBoZWxwIHdpdGggc29tZSBvZiB0aGUgY29tbW9uIGRldmVsb3BtZW50IHByb2JsZW1zIHdoZXJlXG4gICAgICAvLyBlcnJvcnMgYXJlIHNlZW1pbmdseSBzd2FsbG93ZWQgZHVyaW5nIHRlc3RpbmcgYW5kIGZlYXR1cmVcbiAgICAgIC8vIGRldmVsb3BtZW50LlxuICAgICAgLy9cbiAgICAgIC8vIFRoaXMgdHJpY2sgaGVscHMgbmFycm93IGRvd24gdGhlIHNvdXJjZSBvZiBjb21tb24gZGV2ZWxvcG1lbnQgYnVnc1xuICAgICAgLy8gcmVsYXRlZCB0byBldmFwb3JhdGluZyBleGNlcHRpb25zLCBrZWVwIGluIG1pbmQgaXQncyBub3QgYSB0b3RhbFxuICAgICAgLy8gZml4IGFzIHRoZXJlIGFyZSBzdGlsbCBzb21lIGVycm9ycyB0aGF0IGFyZSBzdGlsbCBub3QgcHJvcGFnYXRpbmdcbiAgICAgIC8vIGNvcnJlY3RseS5cbiAgICAgIC8vXG4gICAgICAvLyBQbGVhc2Uga2VlcCB0aGlzIG5vdGUgaGVyZSB1bnRpbCBhIGJldHRlciBzb2x1dGlvbiBmb3IgZGVidWdnaW5nXG4gICAgICAvLyBleGNlcHRpb25zIHdpdGggcHJvbWlzZXMgaXMgbWFkZSBhdmFpbGFibGUuXG4gICAgICAvL1xuICAgICAgLy8gVE9ETyhqYXNvbmNhbXBiZWxsKTogRmluZCBhIGJldHRlciB3YXkgdG8gbWFuYWdlIHRoZSBwcm9ibGVtIG9mXG4gICAgICAvLyBkZWJ1Z2dpbmcgZXhjZXB0aW9ucyB3aXRoaW4gcHJvbWlzZWQgd3JhcHBlZCBjb2RlLlxuICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpe1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxufTtcblxuLyoqXG4gKiBFeHBvcnQgdGhlIG1vZHVsZVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IERlZmVycmVkO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIkZXYUFTSFwiKSkiLCIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgYnVpbHQtaW4gVmV5cm9uIGVycm9yc1xuICovXG5cbnZhciBpbmhlcml0cyA9IHJlcXVpcmUoJ3V0aWwnKS5pbmhlcml0cztcblxudmFyIHZFcnJvciA9IHt9O1xuXG4vKlxuICogTGlzdCBvZiBwcmVkZWZpbmVkIGVycm9yIGlkcy4gTWF0Y2hlcyB2ZXlyb24yL3ZFcnJvci9jb21tb24uaWRsXG4gKi9cbnZFcnJvci5JZHMgPSB7XG4gIEFib3J0ZWQ6ICd2ZXlyb24yL3ZlcnJvci5BYm9ydGVkJyxcbiAgQmFkQXJnOiAndmV5cm9uMi92ZXJyb3IuQmFkQXJnJyxcbiAgQmFkUHJvdG9jb2w6ICd2ZXlyb24yL3ZlcnJvci5CYWRQcm90b2NvbCcsXG4gIEV4aXN0czogJ3ZleXJvbjIvdmVycm9yLkV4aXN0cycsXG4gIEludGVybmFsOiAndmV5cm9uMi92ZXJyb3IuSW50ZXJuYWwnLFxuICBOb3RBdXRob3JpemVkOiAndmV5cm9uMi92ZXJyb3IuTm90QXV0aG9yaXplZCcsXG4gIE5vdEZvdW5kOiAndmV5cm9uMi92ZXJyb3IuTm90Rm91bmQnXG59O1xuXG4vKlxuICogQ3JlYXRlcyBhbiBlcnJvciBvYmplY3QgZ2l2ZW4gdGhlIElEIGFzIHRoZSBuYW1lIGFuZCBhIG1lc3NhZ2VcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgbWVzc2FnZVxuICogQHBhcmFtIHt2RXJyb3IuSWRzfSBpZCBFcnJvciBpZFxuICovXG52RXJyb3IuVmV5cm9uRXJyb3IgPSBmdW5jdGlvbihtZXNzYWdlLCBpZCkge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgdkVycm9yLlZleXJvbkVycm9yKSkge1xuICAgIHJldHVybiBuZXcgdkVycm9yLlZleXJvbkVycm9yKG1lc3NhZ2UsIGlkKTtcbiAgfVxuICBFcnJvci5jYWxsKHRoaXMpO1xuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICBpZiAoaWQpIHtcbiAgICB0aGlzLm5hbWUgPSBpZDtcbiAgfVxuICBpZiAodHlwZW9mIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdkVycm9yLlZleXJvbkVycm9yKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnN0YWNrID0gKG5ldyBFcnJvcigpKS5zdGFjaztcbiAgfVxufTtcbmluaGVyaXRzKHZFcnJvci5WZXlyb25FcnJvciwgRXJyb3IpO1xuXG4vKlxuICogVGVzdHMgaWYgdHdvIGVycm9ycyBhcmUgZXF1YWwuXG4gKiBJZiB0aGUgZXJyb3JzIGFyZSBib3RoIFZleXJvbkVycm9ycyB0aGVuIHRoaXMgcmV0dXJucyB0cnVlXG4gKiB3aGVuIHRoZWlyIG1lc3NhbmdlIGFuZCBuYW1lcyBhcmUgZXF1YWwuICBPdGhlciBjYXNlcyByZXR1cm4gZmFsc2UuXG4gKiBAcGFyYW0ge0Vycm9yfSBhIEFuIGVycm9yIHRvIGNvbXBhcmVcbiAqIEBwYXJhbSB7RXJyb3J9IGEgQW4gZXJyb3IgdG8gY29tcGFyZVxuICogQHJldHVybiB7Ym9vbGVhbn0gUmV0dXJucyB0cnVlIGlmIHRoZSBlcnJvcnMgYXJlIGVxdWFsLlxuICovXG52RXJyb3IuZXF1YWxzID0gZnVuY3Rpb24oYSwgYikge1xuICB2YXIgYWlzID0gYSBpbnN0YW5jZW9mIHZFcnJvci5WZXlyb25FcnJvcjtcbiAgdmFyIGJpcyA9IGIgaW5zdGFuY2VvZiB2RXJyb3IuVmV5cm9uRXJyb3I7XG4gIGlmIChhaXMgJiYgYmlzKSB7XG4gICAgcmV0dXJuIGEubWVzc2FnZSA9PT0gYi5tZXNzYWdlICYmIGEuaWQgPT09IGIuaWQ7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuLypcbiAqIENyZWF0ZXMgYW4gZXJyb3Igb2JqZWN0IGluZGljYXRpbmcgb3BlcmF0aW9uIGFib3J0ZWQsIGUuZy4gY29ubmVjdGlvbiBjbG9zZWQuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIG1lc3NhZ2VcbiAqL1xudkVycm9yLkFib3J0ZWRFcnJvciA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIHZFcnJvci5BYm9ydGVkRXJyb3IpKSB7XG4gICAgcmV0dXJuIG5ldyB2RXJyb3IuQWJvcnRlZEVycm9yKG1lc3NhZ2UpO1xuICB9XG4gIHZFcnJvci5WZXlyb25FcnJvci5jYWxsKHRoaXMsIG1lc3NhZ2UsIHZFcnJvci5JZHMuQWJvcnRlZCk7XG59O1xuaW5oZXJpdHModkVycm9yLkFib3J0ZWRFcnJvciwgdkVycm9yLlZleXJvbkVycm9yKTtcblxuLypcbiAqIENyZWF0ZXMgYW4gZXJyb3Igb2JqZWN0IGluZGljYXRpbmcgcmVxdWVzdGVyIHNwZWNpZmllZCBhbiBpbnZhbGlkIGFyZ3VtZW50LlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBtZXNzYWdlXG4gKiBAcmV0dXJuIHtFcnJvcn0gRXJyb3Igb2JqZWN0IHdpdGggbmFtZSBzZXQgdG8gdGhlIGJhZGFyZyBlcnJvciBpZC5cbiAqL1xudkVycm9yLkJhZEFyZ0Vycm9yID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgdkVycm9yLkJhZEFyZ0Vycm9yKSkge1xuICAgIHJldHVybiBuZXcgdkVycm9yLkJhZEFyZ0Vycm9yKG1lc3NhZ2UpO1xuICB9XG4gIHZFcnJvci5WZXlyb25FcnJvci5jYWxsKHRoaXMsIG1lc3NhZ2UsIHZFcnJvci5JZHMuQmFkQXJnKTtcbn07XG5pbmhlcml0cyh2RXJyb3IuQmFkQXJnRXJyb3IsIHZFcnJvci5WZXlyb25FcnJvcik7XG5cbi8qXG4gKiBDcmVhdGVzIGFuIGVycm9yIG9iamVjdCBpbmRpY2F0aW5nIHByb3RvY29sIG1pc21hdGNoLFxuICogaW5jbHVkaW5nIHR5cGUgb3IgYXJndW1lbnQgZXJyb3JzLlxuICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgbWVzc2FnZVxuICogQHJldHVybiB7RXJyb3J9IEVycm9yIG9iamVjdCB3aXRoIG5hbWUgc2V0IHRvIHRoZSBiYWQgcHJvdG9jb2wgZXJyb3IgaWQuXG4gKi9cbnZFcnJvci5CYWRQcm90b2NvbEVycm9yID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgdkVycm9yLkJhZFByb3RvY29sRXJyb3IpKSB7XG4gICAgcmV0dXJuIG5ldyB2RXJyb3IuQmFkUHJvdG9jb2xFcnJvcihtZXNzYWdlKTtcbiAgfVxuICB2RXJyb3IuVmV5cm9uRXJyb3IuY2FsbCh0aGlzLCBtZXNzYWdlLCB2RXJyb3IuSWRzLkJhZFByb3RvY29sKTtcbn07XG5pbmhlcml0cyh2RXJyb3IuQmFkUHJvdG9jb2xFcnJvciwgdkVycm9yLlZleXJvbkVycm9yKTtcblxuLypcbiAqIENyZWF0ZXMgYW4gZXJyb3Igb2JqZWN0IGluZGljYXRpbmcgcmVxdWVzdGVkIGVudGl0eSBhbHJlYWR5IGV4aXN0c1xuICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgbWVzc2FnZVxuICogQHJldHVybiB7RXJyb3J9IEVycm9yIG9iamVjdCB3aXRoIG5hbWUgc2V0IHRvIHRoZSBleGlzdHMgZXJyb3IgaWQuXG4gKi9cbnZFcnJvci5FeGlzdHNFcnJvciA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIHZFcnJvci5FeGlzdHNFcnJvcikpIHtcbiAgICByZXR1cm4gbmV3IHZFcnJvci5FeGlzdHNFcnJvcihtZXNzYWdlKTtcbiAgfVxuICB2RXJyb3IuVmV5cm9uRXJyb3IuY2FsbCh0aGlzLCBtZXNzYWdlLCB2RXJyb3IuSWRzLkV4aXN0cyk7XG59O1xuaW5oZXJpdHModkVycm9yLkV4aXN0c0Vycm9yLCB2RXJyb3IuVmV5cm9uRXJyb3IpO1xuXG4vKlxuICogQ3JlYXRlcyBhbiBlcnJvciBvYmplY3QgaW5kaWNhdGluZyBpbnRlcm5hbCBpbnZhcmlhbnRzIGJyb2tlbjtcbiAqIHNvbWV0aGluZyBpcyB2ZXJ5IHdyb25nXG4gKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBtZXNzYWdlXG4gKiBAcmV0dXJuIHtFcnJvcn0gRXJyb3Igb2JqZWN0IHdpdGggbmFtZSBzZXQgdG8gdGhlIGludGVybmFsIGVycm9yIGlkLlxuICovXG52RXJyb3IuSW50ZXJuYWxFcnJvciA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIHZFcnJvci5JbnRlcm5hbEVycm9yKSkge1xuICAgIHJldHVybiBuZXcgdkVycm9yLkludGVybmFsRXJyb3IobWVzc2FnZSk7XG4gIH1cbiAgdkVycm9yLlZleXJvbkVycm9yLmNhbGwodGhpcywgbWVzc2FnZSwgdkVycm9yLklkcy5JbnRlcm5hbCk7XG59O1xuaW5oZXJpdHModkVycm9yLkludGVybmFsRXJyb3IsIHZFcnJvci5WZXlyb25FcnJvcik7XG5cbi8qXG4gKiBDcmVhdGVzIGFuIGVycm9yIG9iamVjdCBpbmRpY2F0aW5nIHJlcXVlc3RlciBpc24ndCBhdXRob3JpemVkXG4gKiB0byBhY2Nlc3MgdGhlIGVudGl0eS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIG1lc3NhZ2VcbiAqIEByZXR1cm4ge0Vycm9yfSBFcnJvciBvYmplY3Qgd2l0aCBuYW1lIHNldCB0byB0aGUgbm90IGF1dGhvcml6ZWQgZXJyb3IgaWQuXG4gKi9cbnZFcnJvci5Ob3RBdXRob3JpemVkRXJyb3IgPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiB2RXJyb3IuTm90QXV0aG9yaXplZEVycm9yKSkge1xuICAgIHJldHVybiBuZXcgdkVycm9yLk5vdEF1dGhvcml6ZWRFcnJvcihtZXNzYWdlKTtcbiAgfVxuICB2RXJyb3IuVmV5cm9uRXJyb3IuY2FsbCh0aGlzLCBtZXNzYWdlLCB2RXJyb3IuSWRzLk5vdEF1dGhvcml6ZWQpO1xufTtcbmluaGVyaXRzKHZFcnJvci5Ob3RBdXRob3JpemVkRXJyb3IsIHZFcnJvci5WZXlyb25FcnJvcik7XG5cbi8qXG4gKiBDcmVhdGVzIGFuIEVycm9yIG9iamVjdCBpbmRpY2F0aW5nIHJlcXVlc3RlZCBlbnRpdHkgKGUuZy4gb2JqZWN0LCBtZXRob2QpXG4gKiBub3QgZm91bmRcbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIG1lc3NhZ2VcbiAqIEByZXR1cm4ge0Vycm9yfSBFcnJvciBvYmplY3Qgd2l0aCBuYW1lIHNldCB0byB0aGUgbm90IGZvdW5kIGVycm9yIGlkLlxuICovXG52RXJyb3IuTm90Rm91bmRFcnJvciA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIHZFcnJvci5Ob3RGb3VuZEVycm9yKSkge1xuICAgIHJldHVybiBuZXcgdkVycm9yLk5vdEZvdW5kRXJyb3IobWVzc2FnZSk7XG4gIH1cbiAgdkVycm9yLlZleXJvbkVycm9yLmNhbGwodGhpcywgbWVzc2FnZSwgdkVycm9yLklkcy5Ob3RGb3VuZCk7XG59O1xuaW5oZXJpdHModkVycm9yLk5vdEZvdW5kRXJyb3IsIHZFcnJvci5WZXlyb25FcnJvcik7XG5cbm1vZHVsZS5leHBvcnRzID0gdkVycm9yO1xuIiwiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IEEgbGlnaHR3ZWlnaHQgbG9nZ2luZyBmcmFtZXdvcmsgZm9yIEphdmFTY3JpcHQgdG8gYmUgdXNlZFxuICogaW4gcGxhY2Ugb2YgY29uc29sZSBzbyB0aGF0IHdlIGNhbiBwZXJzaXN0IHRoZSBsb2dzIGlmIG5lZWRlZCBhbmQgdHVyblxuICogbG9nZ2luZyBvZmYgYXQgZGlmZmVyZW50IGxldmVscy5cbiAqL1xudmFyIHZsb2cgPSBmdW5jdGlvbigpIHtcblxuICAvLyBkZWZhdWx0IGxldmVsIGlzIG5vbG9nXG4gIHRoaXMubGV2ZWwgPSB0aGlzLmxldmVscy5OT0xPRztcbn07XG5cbi8qKlxuICogRW51bSBmb3IgZGlmZmVyZW50IGxvZyBsZXZlbHNcbiAqIEByZWFkb25seVxuICogQGVudW0ge251bWJlcn1cbiAqL1xudmxvZy5wcm90b3R5cGUubGV2ZWxzID0ge1xuICBOT0xPRzogMCwgLy8gTm8gbG9ncyBhcmUgd3JpdHRlblxuICBFUlJPUiA6IDEsIC8vIE9ubHkgZXJyb3JzIGFyZSB3cml0dGVuXG4gIFdBUk46IDIsIC8vIE9ubHkgZXJyb3JzIGFuZCB3YXJuaW5ncyBhcmUgd3JpdHRlblxuICBERUJVRyA6IDMsIC8vIEVycm9ycywgd2FybmluZ3MgYW5kIGRlYnVnIG1lc3NhZ2VzIGFyZSB3cml0dGVuXG4gIElORk8gOiA0IC8vIEFsbCBsb2dzIGFyZSB3cml0dGVuLFxufTtcblxuLyoqXG4gKiBMb2dzIGFyZ3VtZW50cyBhcyBlcnJvcnMgdG8gdGhlIGNvbnNvbGUgaWYgbG9nIGxldmVsIGlzIGVycm9yIG9yIGhpZ2hlclxuICovXG52bG9nLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9sb2codGhpcy5sZXZlbHMuRVJST1IsIGFyZ3VtZW50cyk7XG59O1xuXG4vKipcbiAqIExvZ3MgYXJndW1lbnRzIGFzIHdhcm5pbmdzIHRvIHRoZSBjb25zb2xlIGlmIGxvZyBsZXZlbCBpcyB3YXJuaW5nIG9yIGhpZ2hlclxuICovXG52bG9nLnByb3RvdHlwZS53YXJuID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX2xvZyh0aGlzLmxldmVscy5XQVJOLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBMb2dzIGFyZ3VtZW50cyBhcyBsb2dzIHRvIHRoZSBjb25zb2xlIGlmIGxvZyBsZXZlbCBpcyBkZWJ1ZyBvciBoaWdoZXJcbiAqL1xudmxvZy5wcm90b3R5cGUuZGVidWcgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fbG9nKHRoaXMubGV2ZWxzLkRFQlVHLCBhcmd1bWVudHMpO1xufTtcblxuLyoqXG4gKiBMb2dzIGFyZ3VtZW50cyBhcyBpbmZvIHRvIHRoZSBjb25zb2xlIGlmIGxvZyBsZXZlbCBpcyBpbmZvIG9yIGhpZ2hlclxuICovXG52bG9nLnByb3RvdHlwZS5pbmZvID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX2xvZyh0aGlzLmxldmVscy5JTkZPLCBhcmd1bWVudHMpO1xufTtcblxudmxvZy5wcm90b3R5cGUuX2xvZyA9IGZ1bmN0aW9uKGxldmVsLCBhcmdzKSB7XG4gIGlmICh0aGlzLmxldmVsID49IGxldmVsKSB7XG4gICAgdGhpcy5fd3JpdGUobGV2ZWwsIGFyZ3MpO1xuICB9XG59O1xuXG52bG9nLnByb3RvdHlwZS5fd3JpdGUgPSBmdW5jdGlvbihsZXZlbCwgYXJncykge1xuICB2YXIgYyA9IHRoaXMuX2dldENvbnNvbGUoKTtcblxuICBpZiAoIWMpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgY29uc29sZUZ1bmMgPSBjLmxvZztcbiAgc3dpdGNoIChsZXZlbCkge1xuICAgIGNhc2UgdGhpcy5sZXZlbHMuRVJST1I6XG4gICAgICBjb25zb2xlRnVuYyA9IGMuZXJyb3I7XG4gICAgICBicmVhaztcbiAgICBjYXNlIHRoaXMubGV2ZWxzLldBUk46XG4gICAgICBjb25zb2xlRnVuYyA9IGMud2FybjtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgdGhpcy5sZXZlbHMuREVCVUc6XG4gICAgICBjb25zb2xlRnVuYyA9IGMubG9nO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSB0aGlzLmxldmVscy5JTkZPOlxuICAgICAgY29uc29sZUZ1bmMgPSBjLmluZm87XG4gICAgICBicmVhaztcbiAgfVxuXG4gIGNvbnNvbGVGdW5jLmFwcGx5KGMsIGFyZ3MpO1xufTtcblxudmxvZy5wcm90b3R5cGUuX2dldENvbnNvbGUgPSBmdW5jdGlvbigpIHtcbiAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybiBjb25zb2xlO1xuICB9XG5cbiAgcmV0dXJuIG51bGw7XG59O1xuXG52YXIgdmxvZ0luc3RhbmNlID0gbmV3IHZsb2coKTtcbi8qXG4gKiBFeHBvcnQgdGhlIG1vZHVsZVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IHZsb2dJbnN0YW5jZTtcbiIsIi8qKlxuICogIEBmaWxlb3ZlcnZpZXcgV2ViIFNvY2tldCBwcm92aWRlciBmb3IgTm9kZUpTXG4gKi9cblxudmFyIFdTID0gcmVxdWlyZSgnd3MnKTtcblxuLyoqXG4gKiBFeHBvcnQgbW9kdWxlXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gV1M7XG5cbiIsIi8qKlxuICogIEBmaWxlb3ZlcnZpZXcgQ2xpZW50IGxpYnJhcnkgZm9yIHRoZSBOYW1lc3BhY2UuXG4gKi9cblxudmFyIFByb21pc2UgPSByZXF1aXJlKCdlczYtcHJvbWlzZScpLlByb21pc2U7XG5cbnZhciBuYW1lVXRpbCA9IHJlcXVpcmUoJy4vdXRpbC5qcycpO1xudmFyIERlZmVycmVkID0gcmVxdWlyZSgnLi4vbGliL2RlZmVycmVkJyk7XG52YXIgdkVycm9yID0gcmVxdWlyZSgnLi4vbGliL3ZlcnJvcicpO1xuXG4vKipcbiAqIE5hbWVzcGFjZSBoYW5kbGVzIG1hbmlwdWxhdGluZyBhbmQgcXVlcnlpbmcgZnJvbSB0aGUgbW91bnQgdGFibGUuXG4gKiBAcGFyYW0ge29iamVjdH0gY2xpZW50IEEgdmV5cm9uIGNsaWVudC5cbiAqIEBwYXJhbSB7Li4uc3RyaW5nfSByb290cyByb290IGFkZHJlc3NlcyB0byB1c2UgYXMgdGhlIHJvb3QgbW91bnQgdGFibGVzLlxuICogQGNvbnN0cnVjdG9yXG4gKi9cbnZhciBOYW1lc3BhY2UgPSBmdW5jdGlvbihjbGllbnQsIHJvb3RzKSB7XG4gIHRoaXMuX2NsaWVudCA9IGNsaWVudDtcbiAgdGhpcy5fcm9vdHMgPSByb290cztcbn07XG5cbi8qXG4gKiBFcnJvciByZXR1cm5lZCB3aGVuIHJlc29sdXRpb24gaGl0cyBhIG5vbi1tb3VudCB0YWJsZS5cbiAqL1xuTmFtZXNwYWNlLmVyck5vdEFNb3VudFRhYmxlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBuZXcgdkVycm9yLlZleXJvbkVycm9yKFxuICAgICdSZXNvbHV0aW9uIHRhcmdldCBpcyBub3QgYSBtb3VudCB0YWJsZScsIHZFcnJvci5JZHMuQWJvcnRlZCk7XG59O1xuXG4vKlxuICogRXJyb3IgcmV0dXJuZWQgZnJvbSB0aGUgbW91bnQgdGFibGUgc2VydmVyIHdoZW4gcmVhZGluZyBhIG5vbi1leGlzdGFudCBuYW1lLlxuICovXG5OYW1lc3BhY2UuZXJyTm9TdWNoTmFtZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IHZFcnJvci5WZXlyb25FcnJvcihcbiAgICAnTmFtZSBkb2VzblxcJ3QgZXhpc3QnLCB2RXJyb3IuSWRzLk5vdEZvdW5kKTtcbn07XG5cbi8qXG4gKiBFcnJvciByZXR1cm5lZCBmcm9tIHRoZSBtb3VudCB0YWJsZSBzZXJ2ZXIgd2hlbiByZWFkaW5nIGEgbm9uLWV4aXN0YW50IG5hbWUuXG4gKi9cbk5hbWVzcGFjZS5lcnJOb1N1Y2hOYW1lUm9vdCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IHZFcnJvci5WZXlyb25FcnJvcihcbiAgICAnTmFtZSBkb2VzblxcJ3QgZXhpc3Q6IHJvb3Qgb2YgbmFtZXNwYWNlJywgdkVycm9yLk5vdEZvdW5kKTtcbn07XG5cbi8qXG4gKiBNYXhpbXVtIG51bWJlciBvZiBob3BzIGJldHdlZW4gc2VydmVycyB3ZSB3aWxsIG1ha2UgdG8gcmVzb2x2ZSBhIG5hbWUuXG4gKi9cbk5hbWVzcGFjZS5fbWF4RGVwdGggPSAzMjtcblxuLypcbiAqIE1ha2UgYSBuYW1lIHJlbGF0aXZlIHRvIHRoZSByb290cyBvZiB0aGlzIG5hbWVzcGFjZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIEEgbmFtZS5cbiAqIEByZXR1cm4ge0FycmF5fSBBIGxpc3Qgb2Ygcm9vdGVkIG5hbWVzLlxuICovXG5OYW1lc3BhY2UucHJvdG90eXBlLl9yb290TmFtZXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gIGlmIChuYW1lVXRpbC5pc1Jvb3RlZChuYW1lKSAmJiBuYW1lICE9PSAnLycpIHtcbiAgICByZXR1cm4gW25hbWVdO1xuICB9XG4gIHZhciBvdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9yb290cy5sZW5ndGg7IGkrKykge1xuICAgIG91dC5wdXNoKG5hbWVVdGlsLmpvaW4odGhpcy5fcm9vdHNbaV0sIG5hbWUpKTtcbiAgfVxuICByZXR1cm4gb3V0O1xufTtcblxuLypcbiAqIFV0aWxpdHkgZnVuY3Rpb24gdG8gam9pbiBhIHN1ZmZpeCB0byBhIGxpc3Qgb2Ygc2VydmVycy5cbiAqIEBwYXJhbSB7QXJyYXl9IHJlc3VsdHMgQW4gYXJyYXkgb2YgcmV0dXJuIHZhbHVlcyBmcm9tIGFcbiAqIHJlc29sdmVTdGVwIGNhbGwuICBUaGUgZmlyc3QgZWxlbWVudCBvZiB0aGUgYXJyYXkgaXMgYSBsaXN0IG9mIHNlcnZlcnMuXG4gKiBUaGUgc2Vjb25kIGVsZW1lbnQgc2hvdWxkIGJlIGEgc3RyaW5nIHN1ZmZpeC5cbiAqIEByZXR1cm4ge0FycmF5fSBsaXN0IG9mIHNlcnZlcnMgd2l0aCBzdWZmaXggYXBwZW5kZWQuXG4gKi9cbmZ1bmN0aW9uIGNvbnZlcnRTZXJ2ZXJzVG9TdHJpbmdzKHJlc3VsdHMpIHtcbiAgdmFyIHNlcnZlcnMgPSByZXN1bHRzWzBdO1xuICB2YXIgc3VmZml4ID0gcmVzdWx0c1sxXTtcbiAgdmFyIG91dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHNlcnZlcnMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgbmFtZSA9IHNlcnZlcnNbaV0uc2VydmVyO1xuICAgIGlmIChzdWZmaXggIT09ICcnKSB7XG4gICAgICBuYW1lID0gbmFtZVV0aWwuam9pbihuYW1lLCBzdWZmaXgpO1xuICAgIH1cbiAgICBvdXQucHVzaChuYW1lKTtcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG4vKlxuICogVXRpbGl0eSBmdW5jdGlvbiB0byBtYWtlIGFuIGFycmF5IG9mIG5hbWVzIHRlcm1pbmFsLlxuICogQHBhcmFtIHtBcnJheX0gbmFtZXMgTGlzdCBvZiBuYW1lcy5cbiAqIEByZXR1cm4ge0FycmF5fSBsaXN0IG9mIHRlcm1pbmFsIG5hbWVzLlxuICovXG5mdW5jdGlvbiBtYWtlQWxsVGVybWluYWwobmFtZXMpIHtcbiAgcmV0dXJuIG5hbWVzLm1hcChuYW1lVXRpbC5jb252ZXJ0VG9UZXJtaW5hbE5hbWUpO1xufVxuXG4vKlxuICogVXRpbGl0eSBmdW5jdGlvbiB0byBjaGVjayBpZiBldmVyeSBuYW1lIGluIGFuIGFycmF5IGlzIHRlcm1pbmFsLlxuICogQHBhcmFtIHtBcnJheX0gbmFtZXMgTGlzdCBvZiBuYW1lcy5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IHRydWUgaWYgZXZlcnkgbmFtZSBpbiB0aGUgaW5wdXQgd2FzIHRlcm1pbmFsLlxuICovXG5mdW5jdGlvbiBhbGxBcmVUZXJtaW5hbChuYW1lcykge1xuICByZXR1cm4gbmFtZXMuZXZlcnkobmFtZVV0aWwuaXNUZXJtaW5hbCk7XG59XG5cbi8qXG4gKiBVdGlsaXR5IG1ldGhvZCB0byB0cnkgYSBzaW5nbGUgcmVzb2x2ZSBzdGVwIGFnYWluc3QgYSBsaXN0IG9mXG4gKiBtaXJyb3JlZCBNb3VudFRhYmxlIHNlcnZlcnMuXG4gKiBAcGFyYW0ge0FycmF5fSBuYW1lcyBMaXN0IG9mIG5hbWVzIHJlcHJlc2VudGluZyBtaXJyb3JlZCBNb3VudFRhYmxlIHNlcnZlcnMuXG4gKiBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2UgdGhhdCB3aWxsIGJlIGZ1bGZpbGxlZCB3aXRoIGEgbGlzdCBvZiBmdXJ0aGVyXG4gKiByZXNvbHZlZCBuYW1lcy5cbiAqL1xuTmFtZXNwYWNlLnByb3RvdHlwZS5fcmVzb2x2ZUFnYWluc3RNb3VudFRhYmxlID0gZnVuY3Rpb24obmFtZXMpIHtcbiAgaWYgKG5hbWVzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChcbiAgICAgIG5ldyB2RXJyb3IuQmFkQXJnRXJyb3IoJ05vIHNlcnZlcnMgdG8gcmVzb2x2ZSBxdWVyeS4nKSk7XG4gIH1cblxuICAvLyBUT0RPKG1hdHRyKTogTWF5YmUgbWFrZSB0aGlzIHRha2UgYSBzZXJ2aWNlIHNpZ25hdHVyZS5cbiAgLy8gVGhhdCB3b3VsZCBiZSBtb3JlIGVmZmljaWVudCwgYnV0IHdlIHdvdWxkIG5lZWQgdG8gZG8gZXJyb3IgaGFuZGxpbmdcbiAgLy8gZGlmZmVyZW50bHkuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgdmFyIG5hbWUgPSBuYW1lVXRpbC5jb252ZXJ0VG9UZXJtaW5hbE5hbWUobmFtZXNbMF0pO1xuICByZXR1cm4gdGhpcy5fY2xpZW50LmJpbmRUbyhuYW1lKS50aGVuKGZ1bmN0aW9uIG9uQmluZChzZXJ2aWNlKSB7XG4gICAgaWYgKHNlcnZpY2UucmVzb2x2ZVN0ZXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgTmFtZXNwYWNlLmVyck5vdEFNb3VudFRhYmxlKCk7XG4gICAgfVxuICAgIHJldHVybiBzZXJ2aWNlLnJlc29sdmVTdGVwKCkudGhlbihjb252ZXJ0U2VydmVyc1RvU3RyaW5ncyk7XG4gIH0pLmNhdGNoKGZ1bmN0aW9uIG9uRXJyb3IoZXJyKSB7XG4gICAgaWYgKHZFcnJvci5lcXVhbHMoZXJyLCBOYW1lc3BhY2UuZXJyTm9TdWNoTmFtZSgpKSB8fFxuICAgICAgICB2RXJyb3IuZXF1YWxzKGVyciwgTmFtZXNwYWNlLmVyck5vU3VjaE5hbWVSb290KCkpIHx8XG4gICAgICAgIG5hbWVzLmxlbmd0aCA8PSAxKSB7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBzZWxmLl9yZXNvbHZlQWdhaW5zdE1vdW50VGFibGUobmFtZXMuc2xpY2UoMSkpO1xuICAgIH1cbiAgfSk7XG59O1xuXG4vKlxuICogVXRpbGl0eSBtZXRob2QgdG8gdHJ5IGEgc2VxdWVuY2Ugb2YgcmVzb2x2ZXMgdW50aWwgdGhlIHJlc3VsdGluZyBuYW1lcyBhcmVcbiAqIGVudGlyZWx5IHRlcm1pbmFsLlxuICogQHBhcmFtIHtBcnJheX0gY3VyciBMaXN0IG9mIGVxdWl2YWxlbnQgbmFtZXMgdG8gdHJ5IG9uIHRoaXMgc3RlcC5cbiAqIEBwYXJhbSB7QXJyYXl9IGxhc3QgTGlzdCBvZiBuYW1lcyB0aGF0IHdlcmUgdHJpZWQgb24gdGhlIHByZXZpb3VzIHN0ZXAuXG4gKiBAcGFyYW0ge251bWJlcn0gZGVwdGggVGhlIGN1cnJlbnQgZGVwdGggb2YgdGhlIHJlY3Vyc2l2ZSB0cmF2ZXJzYWwuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBoYW5kbGVFcnJvcnMgQSBmdW5jdGlvbiB0aGF0IGVycm9ycyB3aWxsIGJlIHBhc3NlZCB0b1xuICogZm9yIHNwZWNpYWwgaGFuZGxpbmcgZGVwZW5kaW5nIG9uIHRoZSBjYWxsZXIuXG4gKiBAcmV0dXJuIHtQcm9taXNlfSBhIHByb21pc2UgdGhhdCB3aWxsIGJlIGZ1bGZpbGxlZCB3aXRoIGEgbGlzdCBvZiB0ZXJtaW5hbFxuICogbmFtZXMuXG4gKi9cbk5hbWVzcGFjZS5wcm90b3R5cGUuX3Jlc29sdmVMb29wID0gZnVuY3Rpb24oY3VyciwgbGFzdCwgZGVwdGgsIGhhbmRsZUVycm9ycykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiBzZWxmLl9yZXNvbHZlQWdhaW5zdE1vdW50VGFibGUoY3VycikudGhlbihmdW5jdGlvbiBvblJlc29sdmUobmFtZXMpIHtcbiAgICBpZiAoYWxsQXJlVGVybWluYWwobmFtZXMpKSB7XG4gICAgICByZXR1cm4gbmFtZXM7XG4gICAgfVxuICAgIGRlcHRoKys7XG4gICAgaWYgKGRlcHRoID4gTmFtZXNwYWNlLl9tYXhEZXB0aCkge1xuICAgICAgdGhyb3cgbmV3IHZFcnJvci5JbnRlcm5hbEVycm9yKCdNYXhpdW11bSByZXNvbHV0aW9uIGRlcHRoIGV4Y2VlZGVkLicpO1xuICAgIH1cbiAgICByZXR1cm4gc2VsZi5fcmVzb2x2ZUxvb3AobmFtZXMsIGN1cnIsIGRlcHRoLCBoYW5kbGVFcnJvcnMpO1xuICB9LCBmdW5jdGlvbiBvbkVycm9yKGVycikge1xuICAgIHJldHVybiBoYW5kbGVFcnJvcnMoZXJyLCBjdXJyLCBsYXN0KTtcbiAgfSk7XG59O1xuXG4vKipcbiAqIHJlc29sdmVUb01vdW50VGFibGUgcmVzb2x2ZXMgYSB2ZXlyb24gbmFtZSB0byB0aGUgdGVybWluYWwgbmFtZSBvZiB0aGVcbiAqIGlubmVybW9zdCBtb3VudGFibGUgdGhhdCBvd25zIHRoZSBuYW1lLlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgVGhlIG5hbWUgdG8gcmVzb2x2ZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gaWYgZ2l2ZW4sIHRoaXMgZnVjdGlvbiB3aWxsIGJlIGNhbGxlZCBvblxuICogY29tcGxldGlvbiBvZiB0aGUgcmVzb2x2ZS4gIFRoZSBmaXJzdCBhcmd1bWVudCB3aWxsIGJlIGFuIGVycm9yIGlmIHRoZXJlXG4gKiBpcyBvbmUsIGFuZCB0aGUgc2Vjb25kIGFyZ3VtZW50IGlzIGEgbGlzdCBvZiB0ZXJtaW5hbCBuYW1lcy5cbiAqIEByZXR1cm4ge1Byb21pc2V9IEEgcHJvbWlzZSB0byBhIGxpc3Qgb2YgdGVybWluYWwgbmFtZXMuXG4gKi9cbk5hbWVzcGFjZS5wcm90b3R5cGUucmVzb2x2ZVRvTW91bnRUYWJsZSA9IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrKSB7XG4gIHZhciBuYW1lcyA9IHRoaXMuX3Jvb3ROYW1lcyhuYW1lKTtcbiAgdmFyIGRlZmVycmVkID0gbmV3IERlZmVycmVkKGNhbGxiYWNrKTtcbiAgdmFyIGhhbmRsZUVycm9ycyA9IGZ1bmN0aW9uKGVyciwgY3VyciwgbGFzdCkge1xuICAgIGlmICh2RXJyb3IuZXF1YWxzKGVyciwgTmFtZXNwYWNlLmVyck5vU3VjaE5hbWVSb290KCkpIHx8XG4gICAgICAgIHZFcnJvci5lcXVhbHMoZXJyLCBOYW1lc3BhY2UuZXJyTm90QU1vdW50VGFibGUoKSkpIHtcbiAgICAgIHJldHVybiBtYWtlQWxsVGVybWluYWwobGFzdCk7XG4gICAgfVxuICAgIGlmICh2RXJyb3IuZXF1YWxzKGVyciwgTmFtZXNwYWNlLmVyck5vU3VjaE5hbWUoKSkpIHtcbiAgICAgIHJldHVybiBtYWtlQWxsVGVybWluYWwoY3Vycik7XG4gICAgfVxuICAgIHRocm93IGVycjtcbiAgfTtcblxuICBkZWZlcnJlZC5yZXNvbHZlKHRoaXMuX3Jlc29sdmVMb29wKG5hbWVzLCBuYW1lcywgMCwgaGFuZGxlRXJyb3JzKSk7XG5cbiAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59O1xuXG4vKipcbiAqIHJlc29sdmVNYXhpbWFsbHkgcmVzb2x2ZXMgYSB2ZXlyb24gbmFtZSBhcyBmYXIgYXMgaXQgY2FuLCB3aGV0aGVyIHRoZVxuICogdGFyZ2V0IGlzIGEgbW91bnQgdGFibGUgb3Igbm90LlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgVGhlIG5hbWUgdG8gcmVzb2x2ZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gaWYgZ2l2ZW4sIHRoaXMgZnVjdGlvbiB3aWxsIGJlIGNhbGxlZCBvblxuICogY29tcGxldGlvbiBvZiB0aGUgcmVzb2x2ZS4gIFRoZSBmaXJzdCBhcmd1bWVudCB3aWxsIGJlIGFuIGVycm9yIGlmIHRoZXJlXG4gKiBpcyBvbmUsIGFuZCB0aGUgc2Vjb25kIGFyZ3VtZW50IGlzIGEgbGlzdCBvZiB0ZXJtaW5hbCBuYW1lcy5cbiAqIEByZXR1cm4ge1Byb21pc2V9IEEgcHJvbWlzZSB0byBhIGxpc3Qgb2YgdGVybWluYWwgbmFtZXMuXG4gKi9cbk5hbWVzcGFjZS5wcm90b3R5cGUucmVzb2x2ZU1heGltYWxseSA9IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrKSB7XG4gIHZhciBuYW1lcyA9IHRoaXMuX3Jvb3ROYW1lcyhuYW1lKTtcbiAgdmFyIGRlZmVycmVkID0gbmV3IERlZmVycmVkKGNhbGxiYWNrKTtcbiAgdmFyIGhhbmRsZUVycm9ycyA9IGZ1bmN0aW9uKGVyciwgY3VyciwgbGFzdCl7XG4gICAgaWYgKHZFcnJvci5lcXVhbHMoZXJyLCBOYW1lc3BhY2UuZXJyTm9TdWNoTmFtZVJvb3QoKSkgfHxcbiAgICAgICAgdkVycm9yLmVxdWFscyhlcnIsIE5hbWVzcGFjZS5lcnJOb1N1Y2hOYW1lKCkpIHx8XG4gICAgICAgIHZFcnJvci5lcXVhbHMoZXJyLCBOYW1lc3BhY2UuZXJyTm90QU1vdW50VGFibGUoKSkpIHtcbiAgICAgIHJldHVybiBtYWtlQWxsVGVybWluYWwoY3Vycik7XG4gICAgfVxuICAgIHRocm93IGVycjtcbiAgfTtcblxuICBkZWZlcnJlZC5yZXNvbHZlKHRoaXMuX3Jlc29sdmVMb29wKG5hbWVzLCBuYW1lcywgMCwgaGFuZGxlRXJyb3JzKSk7XG5cbiAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE5hbWVzcGFjZTtcbiIsIi8qKlxuICogQGZpbGVvdmVydmlldyBIZWxwZXJzIGZvciBtYW5pcHVsYXRpbmcgdmV5cm9uIG5hbWVzLlxuICovXG5cbnZhciBfbnVtSW5pdGlhbFNsYXNoZXMgPSBmdW5jdGlvbihzKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChzLmNoYXJBdChpKSAhPT0gJy8nKSB7XG4gICAgICByZXR1cm4gaTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHMubGVuZ3RoO1xufTtcbnZhciBfbnVtVGFpbFNsYXNoZXMgPSBmdW5jdGlvbihzKSB7XG4gIGZvciAodmFyIGkgPSBzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgaWYgKHMuY2hhckF0KGkpICE9PSAnLycpIHtcbiAgICAgIHJldHVybiBzLmxlbmd0aCAtIDEgLSBpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcy5sZW5ndGg7XG59O1xuXG5cbnZhciBfcmVtb3ZlSW5pdGlhbFNsYXNoZXMgPSBmdW5jdGlvbihzKSB7XG4gIHJldHVybiBzLnJlcGxhY2UoL15cXC8qL2csICcnKTtcbn07XG52YXIgX3JlbW92ZVRhaWxTbGFzaGVzID0gZnVuY3Rpb24ocykge1xuICByZXR1cm4gcy5yZXBsYWNlKC9cXC8qJC9nLCAnJyk7XG59O1xuXG52YXIgX2pvaW5OYW1lUGFydHNPbkFycmF5ID0gZnVuY3Rpb24ocGFydHMpIHtcbiAgaWYgKHBhcnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiAnJztcbiAgfVxuXG4gIHZhciBuYW1lID0gcGFydHNbMF07XG4gIGZvciAodmFyIGkgPSAxOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYWRkZWRQYXJ0ID0gcGFydHNbaV07XG5cbiAgICB2YXIgbnVtTmFtZVNsYXNoZXMgPSBfbnVtVGFpbFNsYXNoZXMobmFtZSk7XG4gICAgdmFyIG51bUFkZGVkUGFydFNsYXNoZXMgPSBfbnVtSW5pdGlhbFNsYXNoZXMoYWRkZWRQYXJ0KTtcblxuICAgIGlmIChudW1OYW1lU2xhc2hlcyA9PT0gMCAmJiBudW1BZGRlZFBhcnRTbGFzaGVzID09PSAwKSB7XG4gICAgICBuYW1lICs9ICcvJyArIGFkZGVkUGFydDtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChudW1BZGRlZFBhcnRTbGFzaGVzID4gbnVtTmFtZVNsYXNoZXMpIHtcbiAgICAgIG5hbWUgPSBfcmVtb3ZlVGFpbFNsYXNoZXMobmFtZSk7XG4gICAgICBuYW1lICs9IGFkZGVkUGFydDtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSArPSBfcmVtb3ZlSW5pdGlhbFNsYXNoZXMoYWRkZWRQYXJ0KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZTtcbn07XG5cbi8qKlxuICogSm9pbnMgcGFydHMgb2YgYSBuYW1lIGludG8gYSB3aG9sZS5cbiAqIEl0IHByZXNlcnZlcyB0aGUgcm9vdGVkbmVzcyBhbmQgdGVybWluYWxpdHkgb2YgdGhlIG5hbWUgY29tcG9uZW50cy5cbiAqIEV4YW1wbGVzOlxuICogam9pbihbJ2EsIGInXSkgLT4gJ2EvYidcbiAqIGpvaW4oJy9hL2IvJywgJy8vZCcpIC0+ICcvYS9iLy9kJ1xuICogam9pbignLy9hL2InLCAnYy8nKSAtPiAnLy9hL2IvYy8nXG4gKiBAcGFyYW0ge2FycmF5IHwgdmFyYXJnc30gRWl0aGVyIGEgc2luZ2xlIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHN0cmluZ3NcbiAqIHRvIGpvaW4gb3IgYSB2YXJpYWJsZSBudW1iZXIgb2Ygc3RyaW5nIGFyZ3VtZW50cyB0aGF0IHdpbGwgYmUgam9pbmVkLlxuICogQHJldHVybiB7c3RyaW5nfSBBIGpvaW5lZCBzdHJpbmdcbiAqL1xudmFyIGpvaW4gPSBmdW5jdGlvbihwYXJ0cykge1xuICBpZiAoQXJyYXkuaXNBcnJheShwYXJ0cykpIHtcbiAgICByZXR1cm4gX2pvaW5OYW1lUGFydHNPbkFycmF5KHBhcnRzKTtcbiAgfVxuICByZXR1cm4gX2pvaW5OYW1lUGFydHNPbkFycmF5KEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xufTtcblxuLyoqXG4gICogRGV0ZXJtaW5lcyBpZiBhIG5hbWUgaXMgcm9vdGVkLCB0aGF0IGlzIGJlZ2lubmluZyB3aXRoIGEgc2luZ2xlICcvJy5cbiAgKiBAcGFyYW0ge3N0cmluZ30gVGhlIHZleXJvbiBuYW1lLlxuICAqIEByZXR1cm4ge2Jvb2xlYW59IFRydWUgaWYgdGhlIG5hbWUgaXMgcm9vdGVkLCBmYWxzZSBvdGhlcndpc2UuXG4gICovXG52YXIgaXNSb290ZWQgPSBmdW5jdGlvbihuYW1lKSB7XG4gIHJldHVybiBfbnVtSW5pdGlhbFNsYXNoZXMobmFtZSkgPT09IDE7XG59O1xuXG4vKipcbiAgKiBEZXRlcm1pbmVzIGlmIGEgbmFtZSBpcyB0ZXJtaW5hbCwgbWVhbmluZyB0aGF0IGl0IGNvcnJlc3BvbmRzIHRvIGEgZmluYWxcbiAgKiBlbmRwb2ludCBhbmQgbmFtZSBhbmQgZG9lcyBub3QgbmVlZCB0byBiZSByZXNvbHZlZCBmdXJ0aGVyLlxuICAqIEBwYXJhbSB7c3RyaW5nfSBUaGUgdmV5cm9uIG5hbWUuXG4gICogQHJldHVybiB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgbmFtZSBpcyBhIHRlcm1pbmFsIG5hbWUsIGZhbHNlIG90aGVyd2lzZS5cbiAgKi9cbnZhciBpc1Rlcm1pbmFsID0gZnVuY3Rpb24obmFtZSkge1xuICB2YXIgbnVtSW5pdGlhbFNsYXNoZXMgPSBfbnVtSW5pdGlhbFNsYXNoZXMobmFtZSk7XG4gIGlmIChudW1Jbml0aWFsU2xhc2hlcyA+PSAyKSB7XG4gICAgLy8gSWYgdGhlIG5hbWUgYmVnaW5zIHdpdGggJy8vJywgaXQgaXMgdGVybWluYWwuXG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAobnVtSW5pdGlhbFNsYXNoZXMgPT09IDEpIHtcbiAgICAvLyBJZiB0aGUgbmFtZSBiZWdpbnMgd2l0aCBhIHNpbmdsZSBzbGFzaCwgaXQgaXMgdGVybWluYWwgaWYgdGhlcmUgYXJlIG5vXG4gICAgLy8gbW9yZSBzbGFzaGVzIChpbmRleE9mID09PSAtMSkgb3IgaWYgdGhlIG5leHQgc2xhc2ggaXMgYSBkb3VibGUgc2xhc2guXG4gICAgdmFyIG5leHRTbGFzaEluZGV4ID0gbmFtZS5zdWJzdHIoMSkuaW5kZXhPZignLycpO1xuICAgIHZhciBuZXh0RG91YmxlU2xhc2hJbmRleCA9IG5hbWUuc3Vic3RyKDEpLmluZGV4T2YoJy8vJyk7XG4gICAgcmV0dXJuIG5leHRTbGFzaEluZGV4ID09PSBuZXh0RG91YmxlU2xhc2hJbmRleDtcbiAgfSBlbHNlIHtcbiAgICAvLyBJZiB0aGVyZSBhcmUgbm8gaW5pdGlhbCBzbGFzaGVzLCBpdCBpcyBvbmx5IHRlcm1pbmFsIGlmIGl0IGlzIHRoZSBlbXB0eVxuICAgIC8vIHN0cmluZy5cbiAgICByZXR1cm4gbmFtZS5sZW5ndGggPT09IDA7XG4gIH1cbn07XG5cbi8qKlxuICAqIENvbnZlcnRzIGEgdmV5cm9uIG5hbWUgdG8gYSB0ZXJtaW5hbCBuYW1lLiBUaGlzIGlzIHVzZWQgdG8gZ2VuZXJhdGUgYSBmaW5hbFxuICAqIG5hbWUgd2hlbiBhIG5hbWUgaGFzIGZpbmlzaGVkIHJlc29sdmluZy5cbiAgKiBAcGFyYW0ge3N0cmluZ30gVGhlIGluaXRpYWwgdmV5cm9uIG5hbWUuXG4gICogQHJldHVybiB7c3RyaW5nfSBBIHRlcm1pbmFsIHZleXJvbiBuYW1lLlxuICAqL1xudmFyIGNvbnZlcnRUb1Rlcm1pbmFsTmFtZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgLy8gJycgLT4gJycgYW5kICcvJyAtPiAnJ1xuICBpZiAobmFtZSA9PT0gJycgfHwgbmFtZSA9PT0gJy8nKSB7XG4gICAgcmV0dXJuICcnO1xuICB9XG5cbiAgaWYgKGlzUm9vdGVkKG5hbWUpKSB7XG4gICAgaWYgKG5hbWUuc3Vic3RyKDEpLmluZGV4T2YoJy8nKSA9PT0gLTEpIHtcbiAgICAgIC8vICcvZW5kcG9pbnQnIC0+ICcvZW5kcG9pbnQnXG4gICAgICByZXR1cm4gbmFtZTtcbiAgICB9XG4gICAgaWYgKG5hbWUuc3Vic3RyKDEpLmluZGV4T2YoJy8nKSA9PT0gbmFtZS5sZW5ndGggLSAyKSB7XG4gICAgICAvLyAnL2VuZHBvaW50LycgLT4gJy9lbmRwb2ludCdcbiAgICAgIHJldHVybiBuYW1lLnN1YnN0cmluZygwLCBuYW1lLmxlbmd0aCAtIDEpO1xuICAgIH1cbiAgICAvLyAnL2VuZHBvaW50L3NvbWV0aGluZycgLT4gJy9lbmRwb2ludC8vc29tZXRoaW5nJ1xuICAgIC8vICcvZW5kcG9pbnQvL3NvbWV0aGluZyAtPiAnL2VuZHBvaW50Ly9zb21ldGhpbmcnXG4gICAgcmV0dXJuIG5hbWUucmVwbGFjZSgvXihcXC9bXi9dKz8pWy9dKlxcLy8sICckMS8vJyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gJy8vLy8vc29tZXRoaW5nJyAtPiAnLy9zb21ldGhpbmcnXG4gICAgcmV0dXJuICcvLycgKyBfcmVtb3ZlSW5pdGlhbFNsYXNoZXMobmFtZSk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBqb2luOiBqb2luLFxuICBpc1Rlcm1pbmFsOiBpc1Rlcm1pbmFsLFxuICBpc1Jvb3RlZDogaXNSb290ZWQsXG4gIGNvbnZlcnRUb1Rlcm1pbmFsTmFtZTogY29udmVydFRvVGVybWluYWxOYW1lXG59O1xuIiwiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IGNvbnZlcnNpb24gYmV0d2VlbiBKYXZhU2NyaXB0IGFuZCB2ZXlyb24yL3ZlcnJvciBFcnJvciBvYmplY3RcbiAqL1xuXG52YXIgdkVycm9yID0gcmVxdWlyZSgnLi8uLi9saWIvdmVycm9yJyk7XG5cbnZhciBlYyA9IHt9O1xuXG4vKlxuICogSW1wbGVtZW50cyB0aGUgc2FtZSBzdHJ1Y3R1cmUgYXMgU3RhbmRhcmQgc3RydWN0IGluIHZleXJvbjIvdmVycm9yXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IElkIGlkIG9mIHRoZSBlcnJvciwgd2hpY2ggaW4gSmF2YVNjcmlwdCwgY29ycmVzcG9uZHMgdG8gdGhlXG4gKiBuYW1lIHByb3BlcnR5IG9mIGFuIEVycm9yIG9iamVjdC5cbiAqL1xudmFyIF9zdGFuZGFyZCA9IGZ1bmN0aW9uKGlkLCBtZXNzYWdlKSB7XG4gIHRoaXMuaUQgPSBpZDtcbiAgdGhpcy5tc2cgPSBtZXNzYWdlO1xufTtcblxuLypcbiAqIENvbnZlcnRzIGZyb20gYSBKYXZhU2NyaXB0IGVycm9yIG9iamVjdCB0byB2ZXJyb3Igc3RhbmRhcmQgc3RydWN0IHdoaWNoXG4gKiB3c3ByIGV4cGVjdHMgYXMgZXJyb3IgZm9ybWF0LlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7RXJyb3J9IGVyciBKYXZhU2NyaXB0IGVycm9yIG9iamVjdFxuICogQHJldHVybiB7X3N0YW5kYXJkfSB2ZXJyb3Igc3RhbmRhcmQgc3RydWN0XG4gKi9cbmVjLnRvU3RhbmRhcmRFcnJvclN0cnVjdCA9IGZ1bmN0aW9uKGVycikge1xuICB2YXIgZXJySWQgPSAnJzsgLy8gZW1wdHkgSUQgaW5kaWNhdGUgYW4gdW5rbm93biBlcnJvclxuICB2YXIgZXJyTWVzc2FnZSA9ICcnO1xuICBpZiAoZXJyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICBlcnJNZXNzYWdlID0gZXJyLm1lc3NhZ2U7XG4gICAgaWYgKGVyci5uYW1lICE9PSAnRXJyb3InKSB7IC8vIGRlZmF1bHQgbmFtZSBpcyBjb25zaWRlcmVkIHVua25vd25cbiAgICAgIGVycklkID0gZXJyLm5hbWU7XG4gICAgfVxuICB9IGVsc2UgaWYgKGVyciAhPT0gdW5kZWZpbmVkICYmIGVyciAhPT0gbnVsbCkge1xuICAgIGVyck1lc3NhZ2UgPSBlcnIgKyAnJztcbiAgfVxuXG4gIHJldHVybiBuZXcgX3N0YW5kYXJkKGVycklkLCBlcnJNZXNzYWdlKTtcbn07XG5cbnZhciBlcnJJZENvbnN0ck1hcCA9IHt9O1xuZXJySWRDb25zdHJNYXBbdkVycm9yLklkcy5BYm9ydGVkXSA9IHZFcnJvci5BYm9ydGVkRXJyb3I7XG5lcnJJZENvbnN0ck1hcFt2RXJyb3IuSWRzLkJhZEFyZ10gPSB2RXJyb3IuQmFkQXJnRXJyb3I7XG5lcnJJZENvbnN0ck1hcFt2RXJyb3IuSWRzLkJhZFByb3RvY29sXSA9IHZFcnJvci5CYWRQcm90b2NvbEVycm9yO1xuZXJySWRDb25zdHJNYXBbdkVycm9yLklkcy5FeGlzdHNdID0gdkVycm9yLkV4aXN0c0Vycm9yO1xuZXJySWRDb25zdHJNYXBbdkVycm9yLklkcy5JbnRlcm5hbF0gPSB2RXJyb3IuSW50ZXJuYWxFcnJvcjtcbmVycklkQ29uc3RyTWFwW3ZFcnJvci5JZHMuTm90QXV0aG9yaXplZF0gPSB2RXJyb3IuTm90QXV0aG9yaXplZEVycm9yO1xuZXJySWRDb25zdHJNYXBbdkVycm9yLklkcy5Ob3RGb3VuZF0gPSB2RXJyb3IuTm90Rm91bmRFcnJvcjtcblxuLypcbiAqIENvbnZlcnRzIGZyb20gYSB2ZXJyb3Igc3RhbmRhcmQgc3RydWN0IHdoaWNoIGNvbWVzIGZyb20gd3NwciB0byBKYXZhU2NyaXB0XG4gKiBFcnJvciBvYmplY3QgZW5zdXJpbmcgbWVzc2FnZSBhbmQgbmFtZSBhcmUgc2V0IHByb3Blcmx5XG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtfc3RhbmRhcmR9IHZlcnIgdmVycm9yIHN0YW5kYXJkIHN0cnVjdFxuICogQHJldHVybiB7RXJyb3J9IEphdmFTY3JpcHQgZXJyb3Igb2JqZWN0XG4gKi9cbmVjLnRvSlNlcnJvciA9IGZ1bmN0aW9uKHZlcnIpIHtcbiAgdmFyIGVycjtcblxuICB2YXIgRXJySWRDb25zdHIgPSBlcnJJZENvbnN0ck1hcFt2ZXJyLmlEXTtcbiAgaWYoRXJySWRDb25zdHIpIHtcbiAgICBlcnIgPSBuZXcgRXJySWRDb25zdHIodmVyci5tc2cpO1xuICB9IGVsc2Uge1xuICAgIGVyciA9IG5ldyB2RXJyb3IuVmV5cm9uRXJyb3IodmVyci5tc2csIHZlcnIuaUQpO1xuICB9XG5cbiAgZXJyLnN0YWNrID0gJyc7IC8vIHN0YWNrIGRvZXMgbm90IG1ha2Ugc2Vuc2UgZnJvbSBhIHJlbW90ZSBleGVjdXRpb25cbiAgcmV0dXJuIGVycjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZWM7XG4iLCIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgRW51bSBmb3IgaW5jb21pbmcgcGF5bG9hZCB0eXBlc1xuICovXG5cbnZhciBJbmNvbWluZ1BheWxvYWRUeXBlID0ge1xuICBGSU5BTF9SRVNQT05TRTogMCwgLy8gRmluYWwgcmVzcG9uc2UgdG8gYSBjYWxsIG9yaWdpbmF0aW5nIGZyb20gSlNcbiAgU1RSRUFNX1JFU1BPTlNFOiAxLCAvLyBTdHJlYW0gcmVzcG9uc2UgdG8gYSBjYWxsIG9yaWdpbmF0aW5nIGZyb20gSlNcbiAgRVJST1JfUkVTUE9OU0U6IDIsIC8vIEVycm9yIHJlc3BvbnNlIHRvIGEgY2FsbCBvcmlnaW5hdGluZyBmcm9tIEpTXG4gIElOVk9LRV9SRVFVRVNUOiAzLCAvLyBSZXF1ZXN0IHRvIGludm9rZSBhIG1ldGhvZCBpbiBKUyBvcmlnaW5hdGluZyBmcm9tIHNlcnZlclxuICBTVFJFQU1fQ0xPU0U6IDQgIC8vIFJlc3BvbnNlIHNheWluZyB0aGF0IHRoZSBzdHJlYW0gaXMgY2xvc2VkLlxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbmNvbWluZ1BheWxvYWRUeXBlO1xuIiwiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IEVudW0gZm9yIG91dGdvaW5nIG1lc3NhZ2UgdHlwZXNcbiAqL1xuXG52YXIgTWVzc2FnZVR5cGUgPSB7XG4gIFJFUVVFU1Q6IDAsIC8vIFJlcXVlc3QgdG8gaW52b2tlIGEgbWV0aG9kIG9uIGEgVmV5cm9uIG5hbWVcbiAgU0VSVkU6IDEsIC8vIFJlcXVlc3QgdG8gc2VydmUgYSBzZXJ2ZXIgaW4gSmF2YVNjcmlwdCB1bmRlciBhIFZleXJvbiBuYW1lXG4gIFJFU1BPTlNFOiAyLCAvLyBJbmRpY2F0ZXMgYSByZXNwb25zZSBmcm9tIGEgcmVnaXN0ZXJlZCBzZXJ2aWNlIGluIEphdmFTY3JpcHRcbiAgU1RSRUFNX1ZBTFVFOiAzLCAvLyBJbmRpY2F0ZXMgYSBzdHJlYW0gdmFsdWVcbiAgU1RSRUFNX0NMT1NFOiA0LCAvLyBSZXF1ZXN0IHRvIGNsb3NlIGEgc3RyZWFtXG4gIFNJR05BVFVSRTogNSwgLy8gUmVxdWVzdCB0byBnZXQgc2lnbmF0dXJlIG9mIGEgcmVtb3RlIHNlcnZlclxuICBTVE9QOiA2LCAvLyBSZXF1ZXN0IHRvIHN0b3AgYSBzZXJ2ZXJcbiAgQkxFU1M6IDgsIC8vIEJsZXNzZXMgYW4gaWRlbnRpdHlcbiAgVU5MSU5LX0lEOiA5LCAvLyBVbmxpbmtzIGFuIGlkZW50aXR5XG4gIE5FV19JRDogMTBcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWVzc2FnZVR5cGU7XG4iLCIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgQW4gb2JqZWN0IHRoYXQgaGFuZGxlcyBtYXJzaGFsaW5nIGFuZCB1bm1hcnNoYWxcbiAqIG1lc3NhZ2VzIGZyb20gdGhlIG5hdGl2ZSB2ZXlyb24gaW1wbGVtZW50YXRpb24uXG4gKi9cblxudmFyIE1lc3NhZ2VUeXBlID0gcmVxdWlyZSgnLi9tZXNzYWdlX3R5cGUnKTtcbnZhciBJbmNvbWluZ1BheWxvYWRUeXBlID0gcmVxdWlyZSgnLi9pbmNvbWluZ19wYXlsb2FkX3R5cGUnKTtcbnZhciBEZWZlcnJlZCA9IHJlcXVpcmUoJy4vLi4vbGliL2RlZmVycmVkJyk7XG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJ2VzNi1wcm9taXNlJykuUHJvbWlzZTtcbnZhciB2TG9nID0gcmVxdWlyZSgnLi8uLi9saWIvdmxvZycpO1xudmFyIFNpbXBsZUhhbmRsZXIgPSByZXF1aXJlKCcuL3NpbXBsZV9oYW5kbGVyJyk7XG5cbi8vIENhY2hlIHRoZSBzZXJ2aWNlIHNpZ25hdHVyZXMgZm9yIG9uZSBob3VyLlxudmFyIEJJTkRfQ0FDSEVfVFRMID0gMzYwMCAqIDEwMDA7XG5cbi8qKlxuICogQSBjbGllbnQgZm9yIHRoZSBuYXRpdmUgdmV5cm9uIGltcGxlbWVudGF0aW9uLlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge1Byb21pc2V9IHNlbmRlciBBIHByb21pc2UgdGhhdCBpcyByZXNvbHZlZCB3aGVuIHdlIGFyZSBhYmxlIHRvIHNlbmRcbiAqIGEgbWVzc2FnZSB0byB0aGUgbmF0aXZlIHZlcm9uIGltcGxlbWVudGF0aW9uLiBJdCBzaG91bGQgYmUgcmVzb2x2ZWQgd2l0aCBhblxuICogb2JqZWN0IHRoYXQgaGFzIGEgc2VuZCBmdW5jdGlvbiB0aGF0IHdpbGwgc2VuZCBtZXNzYWdlcyB0byB0aGUgbmF0aXZlXG4gKiBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuZnVuY3Rpb24gUHJveHkoc2VuZGVyKSB7XG4gIC8vIFdlIHVzZSBvZGQgbnVtYmVycyBmb3IgdGhlIG1lc3NhZ2UgaWRzLCBzbyB0aGF0IHRoZSBzZXJ2ZXIgY2FuIHVzZSBldmVuXG4gIC8vIG51bWJlcnMuXG4gIHRoaXMuaWQgPSAxO1xuICB0aGlzLm91dHN0YW5kaW5nUmVxdWVzdHMgPSB7fTtcbiAgdGhpcy5iaW5kQ2FjaGUgPSB7fTtcbiAgdGhpcy5faGFzUmVzb2x2ZWRDb25maWcgPSBmYWxzZTtcbiAgdGhpcy5fY29uZmlnRGVmZXJyZWQgPSBuZXcgRGVmZXJyZWQoKTtcbiAgdGhpcy5jb25maWcgPSB0aGlzLl9jb25maWdEZWZlcnJlZC5wcm9taXNlO1xuICB0aGlzLnNlbmRlclByb21pc2UgPSBzZW5kZXI7XG4gIHRoaXMuaW5jb21pbmdSZXF1ZXN0SGFuZGxlcnMgPSB7fTtcbn1cblxuLyoqXG4gKiBIYW5kbGVzIGEgbWVzc2FnZSBmcm9tIG5hdGl2ZSB2ZXlyb24gaW1wbGVtZW50YXRpb24uXG4gKiBAcGFyYW0ge09iamVjdH0gbWVzc3NhZ2UgVGhlIG1lc3NhZ2UgZnJvbSB0aGUgbmF0aXZlIHZleXJvbiBjb2RlLlxuICovXG5Qcm94eS5wcm90b3R5cGUucHJvY2VzcyA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgaWYgKHRoaXMuX2hhc1Jlc29sdmVkQ29uZmlnID09PSBmYWxzZSkgeyAvLyBmaXJzdCBtZXNzYWdlIGlzIHRoZSBjb25maWcuXG4gICAgdGhpcy5faGFzUmVzb2x2ZWRDb25maWcgPSB0cnVlO1xuICAgIHRoaXMuX2NvbmZpZ0RlZmVycmVkLnJlc29sdmUobWVzc2FnZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gTWVzc2FnZXMgb3JpZ2luYXRpbmcgZnJvbSBzZXJ2ZXIgYXJlIGV2ZW4gbnVtYmVyc1xuICB2YXIgaXNTZXJ2ZXJPcmlnaW5hdGVkTWVzc2FnZSA9IChtZXNzYWdlLmlkICUgMikgPT09IDA7XG5cbiAgdmFyIGhhbmRsZXIgPSB0aGlzLm91dHN0YW5kaW5nUmVxdWVzdHNbbWVzc2FnZS5pZF07XG5cbiAgdmFyIHBheWxvYWQ7XG4gIHRyeSB7XG4gICAgcGF5bG9hZCA9IEpTT04ucGFyc2UobWVzc2FnZS5kYXRhKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGlmICghaXNTZXJ2ZXJPcmlnaW5hdGVkTWVzc2FnZSkge1xuICAgICAgaGFuZGxlci5oYW5kbGVSZXNwb25zZShJbmNvbWluZ1BheWxvYWRUeXBlLkVSUk9SX1JFU1BPTlNFLCBtZXNzYWdlLmRhdGEpO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBJZiB3ZSBkb24ndCBrbm93IGFib3V0IHRoaXMgZmxvdywganVzdCBkcm9wIHRoZSBtZXNzYWdlLiBVbmxlc3MgaXRcbiAgLy8gb3JpZ2luYXRlZCBmcm9tIHRoZSBzZXZlci5cbiAgaWYgKCFpc1NlcnZlck9yaWdpbmF0ZWRNZXNzYWdlICYmICFoYW5kbGVyKSB7XG4gICAgdkxvZy53YXJuKCdEcm9wcGluZyBtZXNzYWdlIGZvciB1bmtub3duIGZsb3cgJyArIG1lc3NhZ2UuaWQgKyAnICcgK1xuICAgICAgICBtZXNzYWdlLmRhdGEpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICghaGFuZGxlcikge1xuICAgIGhhbmRsZXIgPSB0aGlzLmluY29taW5nUmVxdWVzdEhhbmRsZXJzW3BheWxvYWQudHlwZV07XG4gICAgaWYgKCFoYW5kbGVyKSB7XG4gICAgICB2TG9nLndhcm4oJ0Ryb3BwaW5nIG1lc3NhZ2UgZm9yIHVua25vd24gaW52b2tlIHBheWxvYWQgJyArIHBheWxvYWQudHlwZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGhhbmRsZXIuaGFuZGxlUmVxdWVzdChtZXNzYWdlLmlkLCBwYXlsb2FkLm1lc3NhZ2UpO1xuICB9IGVsc2Uge1xuICAgIGhhbmRsZXIuaGFuZGxlUmVzcG9uc2UocGF5bG9hZC50eXBlLCBwYXlsb2FkLm1lc3NhZ2UpO1xuICB9XG59O1xuXG5Qcm94eS5wcm90b3R5cGUuZGVxdWV1ZSA9IGZ1bmN0aW9uKGRlZiwgaWQpIHtcbiAgZGVsZXRlIHRoaXMub3V0c3RhbmRpbmdSZXF1ZXN0c1tpZF07XG59O1xuXG5Qcm94eS5wcm90b3R5cGUubmV4dElkID0gZnVuY3Rpb24oKSB7XG4gIHZhciBpZCA9IHRoaXMuaWQ7XG4gIHRoaXMuaWQgKz0gMjtcbiAgcmV0dXJuIGlkO1xufTtcblxuLyoqXG4gKiBHZXRzIHRoZSBzaWduYXR1cmUgaW5jbHVkaW5nIG1ldGhvZHMgbmFtZXMsIG51bWJlciBvZiBhcmd1bWVudHMgZm9yIGEgZ2l2ZW5cbiAqIHNlcnZpY2UgbmFtZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIHRoZSB2ZXlyb24gbmFtZSBvZiB0aGUgc2VydmljZSB0byBnZXQgc2lnbmF0dXJlIGZvci5cbiAqIEByZXR1cm4ge1Byb21pc2V9IFNpZ25hdHVyZSBvZiB0aGUgc2VydmljZSBpbiBKU09OIGZvcm1hdFxuICovXG5Qcm94eS5wcm90b3R5cGUuZ2V0U2VydmljZVNpZ25hdHVyZSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIGNhY2hlZEVudHJ5ID0gdGhpcy5iaW5kQ2FjaGVbbmFtZV07XG4gIHZhciBub3cgPSBuZXcgRGF0ZSgpO1xuICBpZiAoY2FjaGVkRW50cnkgJiYgbm93IC0gY2FjaGVkRW50cnkuZmV0Y2hlZCA8IEJJTkRfQ0FDSEVfVFRMKSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShjYWNoZWRFbnRyeS5zaWduYXR1cmUpO1xuICB9XG5cbiAgdmFyIGRlZiA9IG5ldyBEZWZlcnJlZCgpO1xuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgZGVmLnByb21pc2UudGhlbihmdW5jdGlvbihzaWduYXR1cmUpIHtcbiAgICBzZWxmLmJpbmRDYWNoZVtuYW1lXSA9IHtcbiAgICAgIHNpZ25hdHVyZTogc2lnbmF0dXJlLFxuICAgICAgZmV0Y2hlZDogbm93XG4gICAgfTtcbiAgfSk7XG4gIHZhciBtZXNzYWdlSlNPTiA9IHsgbmFtZTogbmFtZSB9O1xuICB2YXIgbWVzc2FnZSA9IEpTT04uc3RyaW5naWZ5KG1lc3NhZ2VKU09OKTtcblxuICB2YXIgaWQgPSB0aGlzLm5leHRJZCgpO1xuICAvLyBTZW5kIHRoZSBnZXQgc2lnbmF0dXJlIHJlcXVlc3QgdG8gdGhlIHByb3h5XG4gIHZhciBoYW5kbGVyID0gbmV3IFNpbXBsZUhhbmRsZXIoZGVmLCB0aGlzLCBpZCk7XG4gIHRoaXMuc2VuZFJlcXVlc3QobWVzc2FnZSwgTWVzc2FnZVR5cGUuU0lHTkFUVVJFLCBoYW5kbGVyLCBpZCk7XG5cbiAgcmV0dXJuIGRlZi5wcm9taXNlO1xufTtcblxuXG5Qcm94eS5wcm90b3R5cGUuYWRkSW5jb21pbmdIYW5kbGVyID0gZnVuY3Rpb24odHlwZSwgaGFuZGxlcikge1xuICB0aGlzLmluY29taW5nUmVxdWVzdEhhbmRsZXJzW3R5cGVdID0gaGFuZGxlcjtcbn07XG5cblByb3h5LnByb3RvdHlwZS5hZGRJbmNvbWluZ1N0cmVhbUhhbmRsZXIgPSBmdW5jdGlvbihpZCwgaGFuZGxlcikge1xuICB0aGlzLm91dHN0YW5kaW5nUmVxdWVzdHNbaWRdID0gaGFuZGxlcjtcbn07XG5cbi8qKlxuICogRXN0YWJsaXNoZXMgdGhlIGNvbm5lY3Rpb24gaWYgbmVlZGVkLCBmcmFtZXMgdGhlIG1lc3NhZ2Ugd2l0aCB0aGUgbmV4dCBpZCxcbiAqIGFkZHMgdGhlIGdpdmVuIGRlZmVycmVkIHRvIG91dHN0YW5kaW5nIHJlcXVlc3RzIHF1ZXVlIGFuZCBzZW5kcyB0aGUgcmVxdWVzdFxuICogdG8gdGhlIHNlcnZlclxuICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgTWVzc2FnZSB0byBzZW5kXG4gKiBAcGFyYW0ge01lc3NhZ2VUeXBlfSB0eXBlIFR5cGUgb2YgbWVzc2FnZSB0byBzZW5kXG4gKiBAcGFyYW0ge09iamVjdH0gaGFuZGxlciBBbiBvYmplY3Qgd2l0aCBhIGhhbmRsZVJlc3BvbnNlIG1ldGhvZCB0aGF0IHRha2VzXG4gKiBhIHJlc3BvbnNlIHR5cGUgYW5kIGEgbWVzc2FnZS4gIElmIG51bGwsIHRoZW4gcmVzcG9uc2VzIGZvciB0aGlzIGZsb3dcbiAqIGFyZSBpZ25vcmVkLlxuICogQHBhcmFtIHtOdW1iZXJ9IGlkIFVzZSB0aGlzIGZsb3cgaWQgaW5zdGVhZCBvZiBnZW5lcmF0aW5nXG4gKiBhIG5ldyBvbmUuXG4gKi9cblByb3h5LnByb3RvdHlwZS5zZW5kUmVxdWVzdCA9IGZ1bmN0aW9uKG1lc3NhZ2UsIHR5cGUsIGhhbmRsZXIsIGlkKSB7XG4gIGlmIChoYW5kbGVyKSB7XG4gICAgdGhpcy5vdXRzdGFuZGluZ1JlcXVlc3RzW2lkXSA9IGhhbmRsZXI7XG4gIH1cbiAgdmFyIGJvZHkgPSBKU09OLnN0cmluZ2lmeSh7IGlkOiBpZCwgZGF0YTogbWVzc2FnZSwgdHlwZTogdHlwZSB9KTtcblxuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMuc2VuZGVyUHJvbWlzZS50aGVuKGZ1bmN0aW9uKHNlbmRlcikge1xuICAgIHNlbmRlci5zZW5kKGJvZHkpO1xuICB9KS5jYXRjaChmdW5jdGlvbihlKSB7XG4gICAgdmFyIGggPSBzZWxmLm91dHN0YW5kaW5nUmVxdWVzdHNbaWRdO1xuICAgIGlmIChoKSB7XG4gICAgICBoLmhhbmRsZVJlc3BvbnNlKEluY29taW5nUGF5bG9hZFR5cGUuRVJST1JfUkVTUE9OU0UsIGUpO1xuICAgICAgZGVsZXRlIHNlbGYub3V0c3RhbmRpbmdSZXF1ZXN0c1tpZF07XG4gICAgfVxuICB9KTtcbn07XG5cbi8qKlxuICogRXhwb3J0IHRoZSBtb2R1bGVcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBQcm94eTtcbiIsIi8qKlxuICogQGZpbGVvdmVydmlldyBBIHNpbXBsZSBoYW5kbGVyIHRoYXQgcmVzb2x2ZXMgb3IgcmVqZWN0cyBhIHByb21pc2VcbiAqIG9uIGEgcmVzcG9uc2UgZnJvbSB0aGUgcHJveHkuXG4gKi9cbnZhciBJbmNvbWluZ1BheWxvYWRUeXBlID0gcmVxdWlyZSgnLi9pbmNvbWluZ19wYXlsb2FkX3R5cGUnKTtcbnZhciBFcnJvckNvbnZlcnNpb24gPSByZXF1aXJlKCcuL2Vycm9yX2NvbnZlcnNpb24nKTtcbnZhciB2RXJyb3IgPSByZXF1aXJlKCcuLy4uL2xpYi92ZXJyb3InKTtcblxuLyoqXG4gKiBBbiBvYmplY3QgdGhhdCByZWplY3RzL3Jlc29sdmVzIGEgcHJvbWlzZSBiYXNlZCBvbiBhIHJlc3BvbnNlXG4gKiBmcm9tIHRoZSBwcm94eS5cbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIGRlZiB0aGUgcHJvbWlzZSB0byByZXNvbHZlL3JlamVjdFxuICogQHBhcmFtIHByb3h5IHRoZSBwcm94eSBmcm9tIHdoaWNoIHRvIGRlcXVldWUgdGhlIGhhbmRsZXJcbiAqIEBwYXJhbSBpZCB0aGUgZmxvdyBpZCBvZiB0aGUgbWVzc2FnZVxuICovXG52YXIgSGFuZGxlciA9IGZ1bmN0aW9uKGRlZiwgcHJveHksIGlkKSB7XG4gIHRoaXMuX3Byb3h5ID0gcHJveHk7XG4gIHRoaXMuX2RlZiA9IGRlZjtcbiAgdGhpcy5faWQgPSBpZDtcbn07XG5cbkhhbmRsZXIucHJvdG90eXBlLmhhbmRsZVJlc3BvbnNlID0gZnVuY3Rpb24odHlwZSwgbWVzc2FnZSkge1xuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlIEluY29taW5nUGF5bG9hZFR5cGUuRklOQUxfUkVTUE9OU0U6XG4gICAgICB0aGlzLl9kZWYucmVzb2x2ZShtZXNzYWdlKTtcbiAgICAgIGJyZWFrO1xuICAgIGNhc2UgSW5jb21pbmdQYXlsb2FkVHlwZS5FUlJPUl9SRVNQT05TRTpcbiAgICAgIHZhciBlcnIgPSBFcnJvckNvbnZlcnNpb24udG9KU2Vycm9yKG1lc3NhZ2UpO1xuICAgICAgdGhpcy5fZGVmLnJlamVjdChlcnIpO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIHRoaXMuX2RlZi5yZWplY3QoXG4gICAgICAgICAgbmV3IHZFcnJvci5JbnRlcm5hbEVycm9yKCd1bmtub3duIHJlc3BvbnNlIHR5cGUgJyArIHR5cGUpKTtcbiAgfVxuICB0aGlzLl9wcm94eS5kZXF1ZXVlKHRoaXMuX2lkKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSGFuZGxlcjtcbiIsIi8qKlxuICogQGZpbGVvdmVydmlldyBTdHJlYW1pbmcgUlBDIGltcGxlbWVudGF0aW9uIG9uIHRvcCBvZiB3ZWJzb2NrZXRzLlxuICovXG5cbnZhciBNZXNzYWdlVHlwZSA9IHJlcXVpcmUoJy4vbWVzc2FnZV90eXBlJyk7XG52YXIgRHVwbGV4ID0gcmVxdWlyZSgnc3RyZWFtJykuRHVwbGV4O1xudmFyIGluaGVyaXRzID0gcmVxdWlyZSgndXRpbCcpLmluaGVyaXRzO1xuXG4vKlxuICogQSBzdHJlYW0gdGhhdCBhbGxvd3Mgc2VuZGluZyBhbmQgcmVjaWV2aW5nIGRhdGEgZm9yIGEgc3RyZWFtaW5nIHJwYy4gIElmXG4gKiBvbm1lc3NhZ2UgaXMgc2V0IGFuZCBhIGZ1bmN0aW9uLCBpdCB3aWxsIGJlIGNhbGxlZCB3aGVuZXZlciB0aGVyZSBpcyBkYXRhIG9uLlxuICogdGhlIHN0cmVhbS4gVGhlIHN0cmVhbSBpbXBsZW1lbnRzIHRoZSBwcm9taXNlIGFwaS4gIFdoZW4gdGhlIHJwYyBpcyBjb21wbGV0ZSxcbiAqIHRoZSBzdHJlYW0gd2lsbCBiZSBmdWxmaWxsZWQuICBJZiB0aGVyZSBpcyBhbiBlcnJvciwgdGhlbiB0aGUgc3RyZWFtIHdpbGwgYmVcbiAqIHJlamVjdGVkLlxuICogQGNvbnN0cnVjdG9yXG4gKlxuICogQHBhcmFtIHtudW1iZXJ9IGZsb3dJZCBmbG93IGlkXG4gKiBAcGFyYW0ge1Byb21pc2V9IHdlYlNvY2tldFByb21pc2UgUHJvbWlzZSBvZiBhIHdlYnNvY2tldCBjb25uZWN0aW9uIHdoZW5cbiAqIGl0J3MgZXN0YWJsaXNoZWRcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNDbGllbnQgaWYgc2V0LCB0aGVuIHRoaXMgaXMgdGhlIGNsaWVudCBzdHJlYW0uXG4gKi9cbnZhciBTdHJlYW0gPSBmdW5jdGlvbihmbG93SWQsIHdlYlNvY2tldFByb21pc2UsIGlzQ2xpZW50KSB7XG4gIER1cGxleC5jYWxsKHRoaXMsIHsgb2JqZWN0TW9kZTogdHJ1ZSB9KTtcbiAgdGhpcy5mbG93SWQgPSBmbG93SWQ7XG4gIHRoaXMuaXNDbGllbnQgPSBpc0NsaWVudDtcbiAgdGhpcy53ZWJTb2NrZXRQcm9taXNlID0gd2ViU29ja2V0UHJvbWlzZTtcbiAgdGhpcy5vbm1lc3NhZ2UgPSBudWxsO1xuXG4gIC8vIFRoZSBidWZmZXIgb2YgbWVzc2FnZXMgdGhhdCB3aWxsIGJlIHBhc3NlZCB0byBwdXNoXG4gIC8vIHdoZW4gdGhlIGludGVybmFsIGJ1ZmZlciBoYXMgcm9vbS5cbiAgdGhpcy53c0J1ZmZlciA9IFtdO1xuXG4gIC8vIElmIHNldCwgb2JqZWN0cyBhcmUgZGlyZWN0bHkgd3JpdHRlbiB0byB0aGUgaW50ZXJuYWwgYnVmZmVyXG4gIC8vIHJhdGhlciB0aGFuIHdzQnVmZmVyLlxuICB0aGlzLnNob3VsZFF1ZXVlID0gZmFsc2U7XG59O1xuXG5pbmhlcml0cyhTdHJlYW0sIER1cGxleCk7XG5cbi8qKlxuICogQ2xvc2VzIHRoZSBzdHJlYW0sIHRlbGxpbmcgdGhlIG90aGVyIHNpZGUgdGhhdCB0aGVyZSBpcyBubyBtb3JlIGRhdGEuXG4gKi9cblN0cmVhbS5wcm90b3R5cGUuY2xpZW50Q2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgdmFyIG9iamVjdCA9IHtcbiAgICBpZDogdGhpcy5mbG93SWQsXG4gICAgdHlwZTogTWVzc2FnZVR5cGUuU1RSRUFNX0NMT1NFXG4gIH07XG4gIER1cGxleC5wcm90b3R5cGUud3JpdGUuY2FsbCh0aGlzLCBvYmplY3QpO1xufTtcblxuU3RyZWFtLnByb3RvdHlwZS5zZXJ2ZXJDbG9zZSA9IGZ1bmN0aW9uKHZhbHVlLCBlcnIpIHtcbiAgdmFyIG9iamVjdCA9IHtcbiAgICBpZDogdGhpcy5mbG93SWQsXG4gICAgdHlwZTogTWVzc2FnZVR5cGUuUkVTUE9OU0UsXG4gICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgcmVzdWx0czogW3ZhbHVlIHx8IG51bGxdLFxuICAgICAgZXJyOiBlcnIgfHwgbnVsbFxuICAgIH0pXG4gIH07XG4gIER1cGxleC5wcm90b3R5cGUud3JpdGUuY2FsbCh0aGlzLCBvYmplY3QpO1xufTtcblxuLyoqXG4gKiBJbXBsZW1lbnRzIHRoZSBfcmVhZCBtZXRob2QgbmVlZGVkIGJ5IHRob3NlIHN1YmNsYXNzaW5nIER1cGxleC5cbiAqIFRoZSBwYXJhbWV0ZXIgcGFzc2VkIGluIGlzIGlnbm9yZWQsIHNpbmNlIGl0IGRvZXNuJ3QgcmVhbGx5IG1ha2VcbiAqIHNlbnNlIGluIG9iamVjdCBtb2RlLlxuICovXG5TdHJlYW0ucHJvdG90eXBlLl9yZWFkID0gZnVuY3Rpb24oKSB7XG4gIC8vIE9uIGEgY2FsbCB0byByZWFkLCBjb3B5IGFueSBvYmplY3RzIGluIHRoZSB3ZWJzb2NrZXQgYnVmZmVyIGludG9cbiAgLy8gdGhlIGludGVybmFsIHN0cmVhbSBidWZmZXIuICBJZiB3ZSBleGhhdXN0IHRoZSB3ZWJzb2NrZXQgYnVmZmVyXG4gIC8vIGFuZCBzdGlsbCBoYXZlIG1vcmUgcm9vbSBpbiB0aGUgaW50ZXJuYWwgYnVmZmVyLCB3ZSBzZXQgc2hvdWxkUXVldWVcbiAgLy8gc28gd2UgZGlyZWN0bHkgd3JpdGUgdG8gdGhlIGludGVybmFsIGJ1ZmZlci5cbiAgdmFyIGkgPSAwO1xuICB3aGlsZSAoaSA8IHRoaXMud3NCdWZmZXIubGVuZ3RoICYmIHRoaXMucHVzaCh0aGlzLndzQnVmZmVyW2ldKSkge1xuICAgICsraTtcbiAgfVxuICBpZiAoaSA+IDApIHtcbiAgICB0aGlzLndzQnVmZmVyID0gdGhpcy53c0J1ZmZlci5zcGxpY2UoaSk7XG4gIH1cblxuICB0aGlzLnNob3VsZFF1ZXVlID0gdGhpcy53c0J1ZmZlci5sZW5ndGggPT09IDA7XG59O1xuXG4vKipcbiAqIFF1ZXVlIHRoZSBvYmplY3QgcGFzc2VkIGluIGZvciByZWFkaW5nXG4gKi9cblN0cmVhbS5wcm90b3R5cGUuX3F1ZXVlUmVhZCA9IGZ1bmN0aW9uKG9iamVjdCkge1xuICBpZiAodGhpcy5zaG91bGRRdWV1ZSkge1xuICAgIC8vIElmIHdlIGhhdmUgcnVuIGludG8gdGhlIGxpbWl0IG9mIHRoZSBpbnRlcm5hbCBidWZmZXIsXG4gICAgLy8gdXBkYXRlIHRoaXMuc2hvdWxkUXVldWUuXG4gICAgdGhpcy5zaG91bGRRdWV1ZSA9IHRoaXMucHVzaChvYmplY3QpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMud3NCdWZmZXIucHVzaChvYmplY3QpO1xuICB9XG59O1xuXG4vKipcbiAqIFdyaXRlcyBhbiBvYmplY3QgdG8gdGhlIHN0cmVhbS5cbiAqIEBwYXJhbSB7Kn0gY2h1bmsgVGhlIGRhdGEgdG8gd3JpdGUgdG8gdGhlIHN0cmVhbS5cbiAqIEBwYXJhbSB7bnVsbH0gZW5jb2RpbmcgaWdub3JlZCBmb3Igb2JqZWN0IHN0cmVhbXMuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayBpZiBzZXQsIHRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIHdyaXRlXG4gKiBjb21wbGV0ZXMuXG4gKiBAcmV0dXJuIHtib29sZWFufSBSZXR1cm5zIGZhbHNlIGlmIHRoZSB3cml0ZSBidWZmZXIgaXMgZnVsbC5cbiAqL1xuU3RyZWFtLnByb3RvdHlwZS53cml0ZSA9IGZ1bmN0aW9uKGNodW5rLCBlbmNvZGluZywgY2FsbGJhY2spIHtcbiAgdmFyIG9iamVjdCA9IHtcbiAgICBpZDogdGhpcy5mbG93SWQsXG4gICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoY2h1bmspLFxuICAgIHR5cGU6IE1lc3NhZ2VUeXBlLlNUUkVBTV9WQUxVRVxuICB9O1xuICByZXR1cm4gRHVwbGV4LnByb3RvdHlwZS53cml0ZS5jYWxsKHRoaXMsIG9iamVjdCwgZW5jb2RpbmcsIGNhbGxiYWNrKTtcbn07XG5cblN0cmVhbS5wcm90b3R5cGUuX3dyaXRlID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nLCBjYWxsYmFjaykge1xuICB0aGlzLndlYlNvY2tldFByb21pc2UudGhlbihmdW5jdGlvbih3ZWJzb2NrZXQpIHtcbiAgICB3ZWJzb2NrZXQuc2VuZChKU09OLnN0cmluZ2lmeShjaHVuaykpO1xuICAgIGNhbGxiYWNrKCk7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBXcml0ZXMgYW4gb3B0aW9uYWwgb2JqZWN0IHRvIHRoZSBzdHJlYW0gYW5kIGVuZHMgdGhlIHN0cmVhbS5cbiAqIEBwYXJhbSB7Kn0gY2h1bmsgVGhlIGRhdGEgdG8gd3JpdGUgdG8gdGhlIHN0cmVhbS5cbiAqIEBwYXJhbSB7bnVsbH0gZW5jb2RpbmcgaWdub3JlZCBmb3Igb2JqZWN0IHN0cmVhbXMuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayBpZiBzZXQsIHRoZSBmdW5jdGlvbiB0byBjYWxsIHdoZW4gdGhlIHdyaXRlXG4gKiBjb21wbGV0ZXMuXG4gKi9cblN0cmVhbS5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24oY2h1bmssIGVuY29kaW5nLCBjYWxsYmFjaykge1xuICBpZiAodGhpcy5pc0NsaWVudCkge1xuICAgIGlmIChjaHVuayAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLndyaXRlKGNodW5rLCBlbmNvZGluZyk7XG4gICAgfVxuICAgIHRoaXMuY2xpZW50Q2xvc2UoKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBXZSBwcm9iYWJseSBzaG91bGRuJ3QgYWxsb3cgZGlyZWN0IGNhbGxzIHRvIGVuZCwgc2luY2Ugd2UgbmVlZFxuICAgIC8vIGEgcmV0dXJuIHZhbHVlIGhlcmUsIGJ1dCBpZiB0aGV5IGFyZSBwaXBpbmcgc3RyZWFtcywgdGhlIGRldmVsb3BlclxuICAgIC8vIHByb2JhYmx5IGRvZXNuJ3QgY2FyZSBhYm91dCB0aGUgcmV0dXJuIHZhbHVlLlxuICAgIHRoaXMuc2VydmVyQ2xvc2UoKTtcbiAgfVxuXG4gIER1cGxleC5wcm90b3R5cGUuZW5kLmNhbGwodGhpcywgbnVsbCwgbnVsbCwgY2FsbGJhY2spO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdHJlYW07XG4iLCIvKipcbiAqIEBmaWxlb3ZlcnZpZXcgV2ViU29ja2V0IGNsaWVudCBpbXBsZW1lbnRhdGlvblxuICovXG5cbnZhciBXZWJTb2NrZXQgPSByZXF1aXJlKCcuLy4uL2xpYi93ZWJzb2NrZXQnKTtcbnZhciBEZWZlcnJlZCA9IHJlcXVpcmUoJy4vLi4vbGliL2RlZmVycmVkJyk7XG52YXIgdkxvZyA9IHJlcXVpcmUoJy4vLi4vbGliL3Zsb2cnKTtcbnZhciBQcm94eSA9IHJlcXVpcmUoJy4vcHJveHknKTtcblxuLyoqXG4gKiBBIGNsaWVudCBmb3IgdGhlIHZleXJvbiBzZXJ2aWNlIHVzaW5nIHdlYnNvY2tldHMuIENvbm5lY3RzIHRvIHRoZSB2ZXlyb24gd3NwclxuICogYW5kIHBlcmZvcm1zIFJQQ3MuXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgb2Ygd3NwciB0aGF0IGNvbm5lY3RzIHRvIHRoZSB2ZXlyb24gbmV0d29ya1xuICogaWRlbnRpdHlcbiAqL1xuZnVuY3Rpb24gUHJveHlDb25uZWN0aW9uKHVybCkge1xuICB0aGlzLnVybCA9IHVybC5yZXBsYWNlKC9eKGh0dHB8aHR0cHMpLywgJ3dzJykgKyAnL3dzJztcbiAgdGhpcy5jdXJyZW50V2ViU29ja2V0UHJvbWlzZSA9IG51bGw7XG4gIC8vIFNpbmNlIHdlIGhhdmVuJ3QgZmluaXNoZWQgY29uc3RydWN0aW5nIHRoZSBQcm94eSBvYmplY3QsXG4gIC8vIHdlIGNhbid0IGNhbGwgdGhpcy5nZXRXZWJzb2NrZXQoKSB0byByZXR1cm4gdGhlIHNlbmRlciBwcm9taXNlLlxuICAvLyBJbnN0ZWFkLCB3ZSBjcmVhdGUgYSBuZXcgcHJvbWlzZSB0aGF0IHdpbGwgZXZlbnR1YWxseSBjYWxsXG4gIC8vIGdldFdlYnNvY2tldCBhbmQgb25seSByZXNvbHZlIHRoZSBwcm9taXNlIGFmdGVyIFByb3h5LmNhbGxcbiAgLy8gaGFzIGNvbXBsZXRlZC5cbiAgdmFyIGRlZiA9IG5ldyBEZWZlcnJlZCgpO1xuICBQcm94eS5jYWxsKHRoaXMsIGRlZi5wcm9taXNlKTtcbiAgZGVmLnJlc29sdmUodGhpcy5nZXRXZWJTb2NrZXQoKSk7XG59XG5cblByb3h5Q29ubmVjdGlvbi5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFByb3h5LnByb3RvdHlwZSk7XG5cblByb3h5Q29ubmVjdGlvbi5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBQcm94eUNvbm5lY3Rpb247XG5cbi8qKlxuICogQ29ubmVjdHMgdG8gdGhlIHNlcnZlciBhbmQgcmV0dXJucyBhbiBvcGVuIHdlYiBzb2NrZXQgY29ubmVjdGlvblxuICogQHJldHVybiB7cHJvbWlzZX0gYSBwcm9taXNlIHRoYXQgd2lsbCBiZSBmdWxmaWxsZWQgd2l0aCBhIHdlYnNvY2tldCBvYmplY3RcbiAqIHdoZW4gdGhlIGNvbm5lY3Rpb24gaXMgZXN0YWJsaXNoZWQuXG4gKi9cblByb3h5Q29ubmVjdGlvbi5wcm90b3R5cGUuZ2V0V2ViU29ja2V0ID0gZnVuY3Rpb24oKSB7XG4gIC8vIFdlIGFyZSBlaXRoZXIgY29ubmVjdGluZyBvciBhbHJlYWR5IGNvbm5lY3RlZCwgcmV0dXJuIHRoZSBzYW1lIHByb21pc2VcbiAgaWYgKHRoaXMuY3VycmVudFdlYlNvY2tldFByb21pc2UpIHtcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50V2ViU29ja2V0UHJvbWlzZTtcbiAgfVxuXG4gIC8vIFRPRE8oYmpvcm5pY2spOiBJbXBsZW1lbnQgYSB0aW1lb3V0IG1lY2hhbmlzbS5cbiAgdmFyIHdlYnNvY2tldCA9IG5ldyBXZWJTb2NrZXQodGhpcy51cmwpO1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBkZWZlcnJlZCA9IG5ldyBEZWZlcnJlZCgpO1xuICB0aGlzLmN1cnJlbnRXZWJTb2NrZXRQcm9taXNlID0gZGVmZXJyZWQucHJvbWlzZTtcbiAgd2Vic29ja2V0Lm9ub3BlbiA9IGZ1bmN0aW9uKCkge1xuICAgIHZMb2cuaW5mbygnQ29ubmVjdGVkIHRvIHByb3h5IGF0Jywgc2VsZi51cmwpO1xuICAgIGRlZmVycmVkLnJlc29sdmUod2Vic29ja2V0KTtcbiAgfTtcbiAgdmFyIGNvbmZpZ0RlZmVycmVkID0gdGhpcy5fY29uZmlnRGVmZXJyZWQ7XG4gIHdlYnNvY2tldC5vbmVycm9yID0gZnVuY3Rpb24oZSkge1xuICAgIHZMb2cuZXJyb3IoJ0ZhaWxlZCB0byBjb25uZWN0IHRvIHByb3h5IGF0IHVybDonLCBzZWxmLnVybCk7XG4gICAgZGVmZXJyZWQucmVqZWN0KGUpO1xuICAgIGNvbmZpZ0RlZmVycmVkLnJlamVjdChcbiAgICAgICdQcm94eSBjb25uZWN0aW9uIGNsb3NlZCwgZmFpbGVkIHRvIGdldCBjb25maWcgJyArIGUpO1xuICB9O1xuXG4gIHdlYnNvY2tldC5vbm1lc3NhZ2UgPSBmdW5jdGlvbihmcmFtZSkge1xuICAgIHZhciBtZXNzYWdlO1xuICAgIHRyeSB7XG4gICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShmcmFtZS5kYXRhKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB2TG9nLndhcm4oJ0ZhaWxlZCB0byBwYXJzZSAnICsgZnJhbWUuZGF0YSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgc2VsZi5wcm9jZXNzKG1lc3NhZ2UpO1xuICB9O1xuXG4gIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xufTtcblxuLyoqXG4gKiBFeHBvcnQgdGhlIG1vZHVsZVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IFByb3h5Q29ubmVjdGlvbjtcbiIsIi8qKlxuICogQGZpbGVvdmVydmlldyBWZXlyb24gUnVudGltZVxuICovXG5cbnZhciBQcm9taXNlID0gcmVxdWlyZSgnZXM2LXByb21pc2UnKS5Qcm9taXNlO1xuXG52YXIgU2VydmVyID0gcmVxdWlyZSgnLi4vaXBjL3NlcnZlcicpO1xudmFyIFNlcnZlclJvdXRlciA9IHJlcXVpcmUoJy4uL2lwYy9zZXJ2ZXJfcm91dGVyJyk7XG52YXIgQ2xpZW50ID0gcmVxdWlyZSgnLi4vaXBjL2NsaWVudCcpO1xudmFyIFByb3h5Q29ubmVjdGlvbiA9IHJlcXVpcmUoJy4uL3Byb3h5L3dlYnNvY2tldCcpO1xudmFyIE1lc3NhZ2VUeXBlID0gcmVxdWlyZSgnLi4vcHJveHkvbWVzc2FnZV90eXBlJyk7XG52YXIgTmFtZXNwYWNlID0gcmVxdWlyZSgnLi4vbmFtZXNwYWNlL25hbWVzcGFjZScpO1xudmFyIFByaXZhdGVJZCA9IHJlcXVpcmUoJy4uL3NlY3VyaXR5L3ByaXZhdGUnKTtcbnZhciBQdWJsaWNJZCA9IHJlcXVpcmUoJy4uL3NlY3VyaXR5L3B1YmxpYycpO1xudmFyIERlZmVycmVkID0gcmVxdWlyZSgnLi4vbGliL2RlZmVycmVkJyk7XG52YXIgU2ltcGxlSGFuZGxlciA9IHJlcXVpcmUoJy4uL3Byb3h5L3NpbXBsZV9oYW5kbGVyJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gUnVudGltZTtcblxuZnVuY3Rpb24gUnVudGltZShvcHRpb25zKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBSdW50aW1lKSkge1xuICAgIHJldHVybiBuZXcgUnVudGltZShvcHRpb25zKTtcbiAgfVxuXG4gIHRoaXMuaWRlbnRpdHlOYW1lID0gb3B0aW9ucy5pZGVudGl0eU5hbWU7XG4gIHRoaXMuX3dzcHIgPSBvcHRpb25zLndzcHI7XG4gIHRoaXMuaWRlbnRpdHkgPSBuZXcgUHJpdmF0ZUlkKHRoaXMuX2dldFByb3h5Q29ubmVjdGlvbigpKTtcbn1cblxuLyoqXG4gKiBQZXJmb3JtcyBjbGllbnQgc2lkZSBiaW5kaW5nIG9mIGEgcmVtb3RlIHNlcnZpY2UgdG8gYSBuYXRpdmUgamF2YXNjcmlwdFxuICogc3R1YiBvYmplY3QuXG4gKlxuICogVXNhZ2U6XG4gKiB2YXIgc2VydmljZSA9IHJ1bnRpbWUuYmluZFRvKCdFbmRwb2ludEFkZHJlc3MnLCAnU2VydmljZU5hbWUnKVxuICogdmFyIHJlc3VsdFByb21pc2UgPSBzZXJ2aWNlLk1ldGhvZE5hbWUoYXJnKTtcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSB0aGUgdmV5cm9uIG5hbWUgb2YgdGhlIHNlcnZpY2UgdG8gYmluZCB0by5cbiAqIEBwYXJhbSB7b2JqZWN0fSBvcHRTZXJ2aWNlU2lnbmF0dXJlIGlmIHNldCwgamF2YXNjcmlwdCBzaWduYXR1cmUgb2YgbWV0aG9kc1xuICogYXZhaWxhYmxlIGluIHRoZSByZW1vdGUgc2VydmljZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gaWYgZ2l2ZW4sIHRoaXMgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgb25cbiAqIGNvbXBsZXRpb24gb2YgdGhlIGJpbmQuICBUaGUgZmlyc3QgYXJndW1lbnQgd2lsbCBiZSBhbiBlcnJvciBpZiB0aGVyZSBpc1xuICogb25lLCBhbmQgdGhlIHNlY29uZCBhcmd1bWVudCBpcyBhbiBvYmplY3Qgd2l0aCBtZXRob2RzIHRoYXQgcGVyZm9ybSBycGNzIHRvXG4gKiBzZXJ2aWNlXG4gKiBtZXRob2RzLlxuICogQHJldHVybiB7UHJvbWlzZX0gQW4gb2JqZWN0IHdpdGggbWV0aG9kcyB0aGF0IHBlcmZvcm0gcnBjcyB0byBzZXJ2aWNlIG1ldGhvZHNcbiAqXG4gKi9cblJ1bnRpbWUucHJvdG90eXBlLmJpbmRUbyA9IGZ1bmN0aW9uKG5hbWUsIG9wdFNlcnZpY2VTaWduYXR1cmUsIGNhbGxiYWNrKSB7XG4gIHZhciBjbGllbnQgPSB0aGlzLl9nZXRDbGllbnQoKTtcbiAgcmV0dXJuIGNsaWVudC5iaW5kVG8obmFtZSwgb3B0U2VydmljZVNpZ25hdHVyZSwgY2FsbGJhY2spO1xufTtcblxuLyoqXG4gKiBBIFZleXJvbiBzZXJ2ZXIgYWxsb3dzIHJlZ2lzdHJhdGlvbiBvZiBzZXJ2aWNlcyB0aGF0IGNhbiBiZVxuICogaW52b2tlZCByZW1vdGVseSB2aWEgUlBDcy5cbiAqXG4gKiBVc2FnZTpcbiAqIHZhciB2aWRlb1NlcnZpY2UgPSB7XG4gKiAgIHBsYXk6IGZ1bmN0aW9uKHZpZGVvTmFtZSkge1xuICogICAgIC8vIFBsYXkgdmlkZW9cbiAqICAgfVxuICogfTtcbiAqXG4gKiB2YXIgc2VydmljZSA9IHJ1bnRpbWUuc2VydmUoJ215bWVkaWEvdmlkZW8nLCB2aWRlb1NlcnZpY2UpXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgTmFtZSB0byBzZXJ2ZSB1bmRlclxuICogQHBhcmFtIHtPYmplY3R9IHNlcnZpY2VPYmplY3Qgc2VydmljZSBvYmplY3QgdG8gc2VydmVcbiAqIEBwYXJhbSB7Kn0gc2VydmljZU1ldGFkYXRhIGlmIHByb3ZpZGVkIGEgc2V0IG9mIG1ldGFkYXRhIGZvciBmdW5jdGlvbnNcbiAqIGluIHRoZSBzZXJ2aWNlIChzdWNoIGFzIG51bWJlciBvZiByZXR1cm4gdmFsdWVzKS4gIEl0IGNvdWxkIGVpdGhlciBiZVxuICogcGFzc2VkIGluIGFzIGEgcHJvcGVydGllcyBvYmplY3Qgb3IgYSBzdHJpbmcgdGhhdCBpcyB0aGUgbmFtZSBvZiBhXG4gKiBzZXJ2aWNlIHRoYXQgd2FzIGRlZmluZWQgaW4gdGhlIGlkbCBmaWxlcyB0aGF0IHRoZSBzZXJ2ZXIga25vd3MgYWJvdXQuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayBpZiBwcm92aWRlZCwgdGhlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIG9uXG4gKiBjb21wbGV0aW9uLiBUaGUgb25seSBhcmd1bWVudCBpcyBhbiBlcnJvciBpZiB0aGVyZSB3YXMgb25lLlxuICogQHJldHVybiB7UHJvbWlzZX0gUHJvbWlzZSB0byBiZSBjYWxsZWQgd2hlbiBzZXJ2ZSBjb21wbGV0ZXMgb3IgZmFpbHNcbiAqIHRoZSBlbmRwb2ludCBhZGRyZXNzIG9mIHRoZSBzZXJ2ZXIgd2lsbCBiZSByZXR1cm5lZCBhcyB0aGUgdmFsdWUgb2YgcHJvbWlzZVxuICovXG5SdW50aW1lLnByb3RvdHlwZS5zZXJ2ZSA9IGZ1bmN0aW9uKG5hbWUsIHNlcnZpY2VPYmplY3QsIHNlcnZpY2VNZXRhZGF0YSxcbiAgICBjYWxsYmFjaykge1xuICB2YXIgc2VydmVyID0gdGhpcy5fZ2V0U2VydmVyKCk7XG4gIHJldHVybiBzZXJ2ZXIuc2VydmUobmFtZSwgc2VydmljZU9iamVjdCwgc2VydmljZU1ldGFkYXRhLCBjYWxsYmFjayk7XG59O1xuXG4vKipcbiAqIGFkZElETCBhZGRzIGFuIElETCBmaWxlIHRvIHRoZSBzZXQgb2YgZGVmaW5pdGlvbnMga25vd24gYnkgdGhlIHNlcnZlci5cbiAqIFNlcnZpY2VzIGRlZmluZWQgaW4gSURMIGZpbGVzIHBhc3NlZCBpbnRvIHRoaXMgbWV0aG9kIGNhbiBiZSB1c2VkIHRvXG4gKiBkZXNjcmliZSB0aGUgaW50ZXJmYWNlIGV4cG9ydGVkIGJ5IGEgc2VydmljZU9iamVjdCBwYXNzZWQgaW50byByZWdpc3Rlci5cbiAqIEBwYXJhbSB7b2JqZWN0fSB1cGRhdGVzIHRoZSBvdXRwdXQgb2YgdGhlIHZkbCB0b29sIG9uIGFuIGlkbC5cbiAqL1xuUnVudGltZS5wcm90b3R5cGUuYWRkSURMID0gZnVuY3Rpb24odXBkYXRlcykge1xuICB2YXIgc2VydmVyID0gdGhpcy5fZ2V0U2VydmVyKCk7XG4gIHJldHVybiBzZXJ2ZXIuYWRkSURMKHVwZGF0ZXMpO1xufTtcblxuLyoqXG4gKiBHZXQgb3IgY3JlYXRlcyBhIG5ldyBwcm94eSBjb25uZWN0aW9uXG4gKiBAcmV0dXJuIHtQcm94eUNvbm5lY3Rpb259IEEgcHJveHkgY29ubmVjdGlvblxuICovXG5SdW50aW1lLnByb3RvdHlwZS5fZ2V0UHJveHlDb25uZWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gIGlmICghdGhpcy5fcHJveHlDb25uZWN0aW9uKSB7XG4gICAgdGhpcy5fcHJveHlDb25uZWN0aW9uID0gbmV3IFByb3h5Q29ubmVjdGlvbih0aGlzLl93c3ByKTtcbiAgfVxuICByZXR1cm4gdGhpcy5fcHJveHlDb25uZWN0aW9uO1xufTtcblxuLyoqXG4gKiBHZXQgb3IgY3JlYXRlcyBhIHJvdXRlclxuICogQHJldHVybiB7U2VydmVyUm91dGVyfSBBIHJvdXRlclxuICovXG5SdW50aW1lLnByb3RvdHlwZS5fZ2V0Um91dGVyID0gZnVuY3Rpb24oKSB7XG4gIGlmICghdGhpcy5fcm91dGVyKSB7XG4gICAgdGhpcy5fcm91dGVyID0gbmV3IFNlcnZlclJvdXRlcihcbiAgICAgICAgdGhpcy5fZ2V0UHJveHlDb25uZWN0aW9uKCkpO1xuICB9XG4gIHJldHVybiB0aGlzLl9yb3V0ZXI7XG59O1xuXG5cbi8qKlxuICogR2V0IG9yIGNyZWF0ZXMgYSBjbGllbnRcbiAqIEByZXR1cm4ge0NsaWVudH0gQSBjbGllbnRcbiAqL1xuUnVudGltZS5wcm90b3R5cGUuX2dldENsaWVudCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9jbGllbnQgPSB0aGlzLl9jbGllbnQgfHwgbmV3IENsaWVudCh0aGlzLl9nZXRQcm94eUNvbm5lY3Rpb24oKSk7XG4gIHJldHVybiB0aGlzLl9jbGllbnQ7XG59O1xuXG4vKipcbiAqIEdldCBvciBjcmVhdGVzIGEgc2VydmVyXG4gKiBAcmV0dXJuIHtTZXJ2ZXJ9IEEgc2VydmVyXG4gKi9cblJ1bnRpbWUucHJvdG90eXBlLl9nZXRTZXJ2ZXIgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fc2VydmVyID0gdGhpcy5fc2VydmVyIHx8IG5ldyBTZXJ2ZXIodGhpcy5fZ2V0Um91dGVyKCkpO1xuICByZXR1cm4gdGhpcy5fc2VydmVyO1xufTtcblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgTmFtZXNwYWNlXG4gKiBAcmV0dXJuIHtQcm9taXNlfSBBIHByb21pc2UgdGhhdCByZXNvbHZlcyB0byBhIE5hbWVzcGFjZSBpbnN0YW5jZS5cbiAqL1xuUnVudGltZS5wcm90b3R5cGUubmV3TmFtZXNwYWNlID0gZnVuY3Rpb24ocm9vdHMpIHtcbiAgdmFyIHJ0ID0gdGhpcztcbiAgdmFyIHByb3h5ID0gdGhpcy5fZ2V0UHJveHlDb25uZWN0aW9uKCk7XG5cbiAgaWYgKHJvb3RzKSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShuZXcgTmFtZXNwYWNlKHRoaXMuX2dldENsaWVudCgpLCByb290cykpO1xuICB9XG5cbiAgLy8gV2UgaGF2ZSB0byBhc2sgZm9yIHRoZSB3ZWJzb2NrZXQgbm93LCBvdGhlcndpc2UgdGhlIGNvbmZpZ1xuICAvLyB3b250IGFycml2ZSB1bnRpbCB0aGUgZmlyc3QgdGltZSBzb21lb25lIHRyaWVzIHRvIG1ha2UgYSBjYWxsXG4gIC8vIHdoaWNoIGlzIGRlYWRsb2NrIHByb25lLlxuICBwcm94eS5nZXRXZWJTb2NrZXQoKTtcbiAgcmV0dXJuIHByb3h5LmNvbmZpZy50aGVuKGZ1bmN0aW9uKGNvbmZpZykge1xuICAgIHJldHVybiBuZXcgTmFtZXNwYWNlKHJ0Ll9nZXRDbGllbnQoKSwgY29uZmlnLm1vdW50dGFibGVSb290KTtcbiAgfSk7XG59O1xuXG4vKipcbiAqIFRPRE8oYmpvcm5pY2spOiBUaGlzIHNob3VsZCBwcm9iYWJseSBwcm9kdWNlIGEgUHJpdmF0ZUlkIGFuZCBub3QgYSBQdWJsaWNJZCxcbiAqIGJ1dCB3ZSBkb24ndCBoYXZlIFByaXZhdGVJZCBzdG9yZSB5ZXQuIFRoaXMgaXMgbW9zdGx5IHVzZWQgZm9yIHRlc3RzIGFueXdheS5cbiAqIENyZWF0ZSBhIG5ldyBJZGVudGl0eVxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgdGhlIG5hbWUgZm9yIHRoZSBpZGVudGl0eS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGNiIGlmIHByb3ZpZGVkIGEgY2FsbGJhY2sgdGhhdCB3aWxsIGJlIGNhbGxlZCB3aXRoIHRoZVxuICogbmV3IHB1YmxpY0lkLlxuICogQHJldHVybiB7UHJvbWlzZX0gQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gdGhlIG5ldyBQdWJsaWNJZFxuICovXG5SdW50aW1lLnByb3RvdHlwZS5uZXdJZGVudGl0eSA9IGZ1bmN0aW9uKG5hbWUsIGNiKSB7XG4gIHZhciBkZWYgPSBuZXcgRGVmZXJyZWQoY2IpO1xuXG4gIHZhciBwcm94eSA9IHRoaXMuX2dldFByb3h5Q29ubmVjdGlvbigpO1xuICB2YXIgaWQgPSBwcm94eS5uZXh0SWQoKTtcbiAgdmFyIGhhbmRsZXIgPSBuZXcgU2ltcGxlSGFuZGxlcihkZWYsIHByb3h5LCBpZCk7XG4gIHByb3h5LnNlbmRSZXF1ZXN0KEpTT04uc3RyaW5naWZ5KG5hbWUpLCBNZXNzYWdlVHlwZS5ORVdfSUQsIGhhbmRsZXIsIGlkKTtcbiAgcmV0dXJuIGRlZi5wcm9taXNlLnRoZW4oZnVuY3Rpb24obWVzc2FnZSkge1xuICAgIHJldHVybiBuZXcgUHVibGljSWQobWVzc2FnZS5uYW1lcywgbWVzc2FnZS5oYW5kbGUsIHByb3h5KTtcbiAgfSk7XG59O1xuIiwiLyoqXG4gKiBAZmlsZW92ZXJ2aWV3IFByaXZhdGVJZCBzdHViIGZvciB2ZXlyb24gaWRlbnRpdGllc1xuICovXG5cbnZhciBEZWZlcnJlZCA9IHJlcXVpcmUoJy4uL2xpYi9kZWZlcnJlZCcpO1xudmFyIFNpbXBsZUhhbmRsZXIgPSByZXF1aXJlKCcuLi9wcm94eS9zaW1wbGVfaGFuZGxlcicpO1xudmFyIFB1YmxpY0lkID0gcmVxdWlyZSgnLi9wdWJsaWMnKTtcbnZhciBNZXNzYWdlVHlwZSA9IHJlcXVpcmUoJy4uL3Byb3h5L21lc3NhZ2VfdHlwZScpO1xuXG4vKipcbiAqIFRoZSBwcml2YXRlIHBvcnRpb24gb2YgYSB2ZXlyb24gaWRlbnRpdHlcbiAqL1xuZnVuY3Rpb24gUHJpdmF0ZUlkKHByb3h5KSB7XG4gIHRoaXMuX3Byb3h5ID0gcHJveHk7XG59XG5cbi8qXG4gKiBCbGVzc2VzIHRoZSBnaXZlbiBQdWJsaWNJZCB3aXRoIHRoZSBnaXZlbiBjYXZlYXRzLlxuICogQHBhcmFtIHtQdWJsaWNJZH0gYmxlc3NlZSB0aGUgUHVibGljSWQgdG8gYmxlc3MuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZSB0aGUgbmFtZSB0aGUgYmxlc3MgdGhlIGlkIHVuZGVyLlxuICogQHBhcmFtIHtOdW1iZXJ9IGR1cmF0aW9uIHRoZSBkdXJhdGlvbiBvZiB0aGUgYmxlc3NpbmcgaW4gbWlsbGlzZWNvbmRzLlxuICogQHBhcmFtIHtBcnJheX0gY2F2ZWF0cyBhbiBhcnJheSBvZiBTZXJ2aWNlQ2F2YWVhdHMuXG4gKiBAcGFwcmFtIHtmdW5jdGlvbn0gY2IgYW4gb3B0aW9uYWwgY2FsbGJhY2sgdGhhdCB3aWxsIHJldHVybiB0aGUgYmxlc3NpbmdcbiAqIEByZXR1cm4ge1Byb21pc2V9IGEgcHJvbWlzZSB0aGF0IHdpbGwgYmUgcmVzb2x2ZWQgd2l0aCB0aGUgYmxlc3NpbmdcbiAqL1xuXG5Qcml2YXRlSWQucHJvdG90eXBlLmJsZXNzID0gZnVuY3Rpb24oYmxlc3NlZSwgbmFtZSwgZHVyYXRpb24sIGNhdmVhdHMsIGNiKSB7XG4gIHZhciBkZWYgPSBuZXcgRGVmZXJyZWQoY2IpO1xuICBpZiAoIShibGVzc2VlIGluc3RhbmNlb2YgUHVibGljSWQpKSB7XG4gICAgZGVmLnJlamVjdChuZXcgRXJyb3IoJ2JsZXNzZWUgc2hvdWxkIGJlIG9mIHR5cGUgUHVibGljSWQnKSk7XG4gICAgcmV0dXJuIGRlZi5wcm9taXNlO1xuICB9XG5cbiAgdmFyIG1lc3NhZ2UgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgaGFuZGxlOiBibGVzc2VlLl9pZCxcbiAgICBuYW1lOiBuYW1lLFxuICAgIGR1cmF0aW9uTXM6IGR1cmF0aW9uLFxuICAgIGNhdmVhdHM6IGNhdmVhdHNcbiAgfSk7XG4gIHZhciBpZCA9IHRoaXMuX3Byb3h5Lm5leHRJZCgpO1xuICB2YXIgaGFuZGxlciA9IG5ldyBTaW1wbGVIYW5kbGVyKGRlZiwgdGhpcy5fcHJveHksIGlkKTtcbiAgdGhpcy5fcHJveHkuc2VuZFJlcXVlc3QobWVzc2FnZSwgTWVzc2FnZVR5cGUuQkxFU1MsIGhhbmRsZXIsIGlkKTtcbiAgdmFyIHNlbGYgPSB0aGlzLl9wcm94eTtcbiAgcmV0dXJuIGRlZi5wcm9taXNlLnRoZW4oZnVuY3Rpb24obWVzc2FnZSkge1xuICAgIHZhciBpZCA9IG5ldyBQdWJsaWNJZChtZXNzYWdlLm5hbWVzLCBtZXNzYWdlLmhhbmRsZSwgc2VsZi5fcHJveHkpO1xuICAgIHJldHVybiBpZDtcbiAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFByaXZhdGVJZDtcbiIsIi8qKlxuICogQGZpbGVvdmVydmlldyBQdWJsaWNJZCBzdHViIG9mIHZleXJvbiBpZGVudGl0aWVzXG4gKi9cblxudmFyIE1lc3NhZ2VUeXBlID0gcmVxdWlyZSgnLi4vcHJveHkvbWVzc2FnZV90eXBlJyk7XG5cbi8qKlxuICogVGhlIHB1YmxpYyBwb3J0aW9uIG9mIGEgdmV5cm9uIGlkZW50aXR5LlxuICovXG5mdW5jdGlvbiBQdWJsaWNJZChuYW1lcywgaWQsIHByb3h5KSB7XG4gIHRoaXMubmFtZXMgPSBuYW1lcztcbiAgdGhpcy5faWQgPSBpZDtcbiAgdGhpcy5fY291bnQgPSAxO1xuICB0aGlzLl9wcm94eSA9IHByb3h5O1xufVxuXG4vLyBBIG5hbWUgbWF0Y2hlcyBpZiBpdCBpcyBhIHByZWZpeCBvZiB0aGUgcGF0dGVybiBvciBpZiB0aGUgcGF0dGVybiBlbmRzXG4vLyBpbiBhICcvKicgYW5kIHRoZSBwYXR0ZXJuIGlzIGEgcHJlZml4IG9mIHRoZSBuYW1lLlxuZnVuY3Rpb24gbmFtZU1hdGNoZXMobmFtZSwgcGF0dGVybikge1xuICB2YXIgcGF0aHMgPSBuYW1lLnNwbGl0KCcvJyk7XG4gIHZhciBleHBlY3RlZFBhdGhzID0gcGF0dGVybi5zcGxpdCgnLycpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGV4cGVjdGVkUGF0aHMubGVuZ3RoOyBpKyspIHtcbiAgICAvLyBJZiB0aGVyZSBpcyBhIHN0YXIgYXQgdGhlIGVuZCBvZiB0aGUgcGF0dGVybiB0aGVuXG4gICAgLy8gd2UgaGF2ZSBhIG1hdGNoLCBzaW5jZSB0aGUgcHJlZml4IG9mIHRoZSBwYXR0ZXJuXG4gICAgLy8gd2FzIG1hdGNoZWQgYnkgdGhlIG5hbWUuXG4gICAgaWYgKGV4cGVjdGVkUGF0aHNbaV0gPT09ICcqJykge1xuICAgICAgcmV0dXJuIGkgPT09IGV4cGVjdGVkUGF0aHMubGVuZ3RoIC0gMTtcbiAgICB9XG5cbiAgICAvLyBuYW1lIGlzIGEgcHJlZml4IG9mIHBhdHRlcm5cbiAgICBpZiAoaSA9PT0gcGF0aHMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAocGF0aHNbaV0gIT09IGV4cGVjdGVkUGF0aHNbaV0pIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGF0aHMubGVuZ3RoID09PSBleHBlY3RlZFBhdGhzLmxlbmd0aDtcbn1cblxuXG4vKipcbiAqIFJldHVybnMgd2hldGhlciB0aGUgUHVibGljSWQgbWF0Y2hlcyBhIHByaW5jaXBhbCBwYXR0ZXJuLiBUaGVyZVxuICogYXJlIGJhc2ljYWxseSB0d28gdHlwZXMgb2YgcGF0dGVybnMuICBBIGZpeGVkIG5hbWUgcGF0dGVyblxuICogbG9va3MgbGlrZSAnYS9iJyBhbmQgbWF0Y2hlcyBuYW1lcyAnYS9iJyBhbmQgJ2EnLCBidXQgbm90XG4gKiAnYS9iL2MnLCAnYWEnLCBvciAnYS9iYicuICdhJyBpcyBjb25zaWRlcmVkIGEgbWF0Y2ggYmVjYXVzZVxuICogdGhlIG93bmVyIG9mICdhJyBjYW4gdHJpdmlhbGx5IGNyZWF0ZSB0aGUgbmFtZSAnYS9iJy4gIEEgc3RhclxuICogcGF0dGVybiBsb29rcyBsaWtlICdhL2IvKicgYW5kIGl0IG1hdGNoZXMgYW55dGhpbmcgdGhhdCAnYS9iJyBtYXRjaGVzXG4gKiBhcyB3ZWxsIGFzIGFueSBuYW1lIGJsZXNzZWQgYnkgJ2EvYicsIGkuZSAnYS9iL2MnLCAnYS9iL2MvZCcuXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0dGVybiBUaGUgcGF0dGVybiB0byBtYXRjaCBhZ2FpbnN0LlxuICogQHJldHVybiB7Ym9vbGVhbn0gUmV0dXJucyB0cnVlIGlmZiB0aGUgUHVibGljSWQgaGFzIGEgbmFtZSB0aGF0IG1hdGNoZXNcbiAqIHRoZSBwYXR0ZXJuIHBhc3NlZCBpbi5cbiAqL1xuUHVibGljSWQucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24ocGF0dGVybikge1xuICBpZiAocGF0dGVybiA9PT0gJycgfHwgIXBhdHRlcm4pIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKG5hbWVNYXRjaGVzKHRoaXMubmFtZXNbaV0sIHBhdHRlcm4pKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufTtcblxuLyoqXG4gKiBJbmNyZW1lbnRzIHRoZSByZWZlcmVuY2UgY291bnQgb24gdGhlIFB1YmxpY0lkLiAgV2hlbiB0aGUgcmVmZXJlbmNlIGNvdW50XG4gKiBnb2VzIHRvIHplcm8sIHRoZSBQdWJsaWNJZCB3aWxsIGJlIHJlbW92ZWQgZnJvbSB0aGUgY2FjaGUgaW4gdGhlIGdvIGNvZGUuXG4gKi9cblB1YmxpY0lkLnByb3RvdHlwZS5yZXRhaW4gPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fY291bnQrKztcbn07XG5cbi8qKlxuICogRGVjcmVtZW50cyB0aGUgcmVmZXJlbmNlIGNvdW50IG9uIHRoZSBQdWJsaWNJZC4gIFdoZW4gdGhlIHJlZmVyZW5jZSBjb3VudFxuICogZ29lcyB0byB6ZXJvLCB0aGUgUHVibGljSWQgd2lsbCBiZSByZW1vdmVkIGZyb20gdGhlIGNhY2hlIGluIHRoZSBnbyBjb2RlLlxuICovXG5QdWJsaWNJZC5wcm90b3R5cGUucmVsZWFzZSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLl9jb3VudC0tO1xuICBpZiAodGhpcy5fY291bnQgPT09IDApIHtcbiAgICB2YXIgbWVzc2FnZSA9IEpTT04uc3RyaW5naWZ5KHRoaXMuX2lkKTtcbiAgICB0aGlzLl9wcm94eS5zZW5kUmVxdWVzdChtZXNzYWdlLCBNZXNzYWdlVHlwZS5VTkxJTktfSUQsIG51bGwsXG4gICAgICAgIHRoaXMuX3Byb3h5Lm5leHRJZCgpKTtcbiAgfVxufTtcblxuUHVibGljSWQucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIGlkOiB0aGlzLl9pZCxcbiAgICBuYW1lczogdGhpcy5uYW1lc1xuICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQdWJsaWNJZDtcbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vKipcbiAqICBAZmlsZW92ZXJ2aWV3IFB1YmxpYyBBUEkgYW5kIGVudHJ5IHBvaW50IHRvIHRoZSBWZXlyb24gQVBJXG4gKi9cblxudmFyIFJ1bnRpbWUgPSByZXF1aXJlKCcuL3J1bnRpbWUvcnVudGltZScpO1xudmFyIERlZmVycmVkID0gcmVxdWlyZSgnLi9saWIvZGVmZXJyZWQnKTtcbnZhciB2bG9nID0gcmVxdWlyZSgnLi9saWIvdmxvZycpO1xuXG4vKipcbiAqIEV4cG9ydHNcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGluaXQ6IGluaXQsXG4gIGxvZ0xldmVsczogcmVxdWlyZSgnLi9saWIvdmxvZycpLmxldmVscyxcbiAgbmFtZXNwYWNlVXRpbDogcmVxdWlyZSgnLi9uYW1lc3BhY2UvdXRpbCcpLFxuICBlcnJvcnM6IHJlcXVpcmUoJy4vbGliL3ZlcnJvcicpXG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIFZleXJvbiBSdW50aW1lXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIENvbmZpZ3VyYXRpb24gT3B0aW9uc1xuICovXG5mdW5jdGlvbiBpbml0KGNvbmZpZywgY2FsbGJhY2spIHtcbiAgaWYgKHR5cGVvZiBjb25maWcgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IGNvbmZpZztcbiAgICBjb25maWcgPSB7fTtcbiAgfVxuXG4gIHZsb2cubGV2ZWwgPSBjb25maWcubG9nTGV2ZWwgfHwgdmxvZy5sZXZlbDtcblxuICB2YXIgZGVmID0gbmV3IERlZmVycmVkKGNhbGxiYWNrKTtcblxuICBnZXRJZGVudGl0eShmdW5jdGlvbihlcnIsIG5hbWUpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICBkZWYucmVqZWN0KGVycik7XG4gICAgfVxuXG4gICAgdmFyIHJ0T3B0cyA9IHtcbiAgICAgIHdzcHI6IGNvbmZpZy53c3ByIHx8IHByb2Nlc3MuZW52WydXU1BSJ10gfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6ODEyNCcsXG4gICAgICBpZGVudGl0eU5hbWU6IG5hbWVcbiAgICB9O1xuXG4gICAgZGVmLnJlc29sdmUobmV3IFJ1bnRpbWUocnRPcHRzKSk7XG4gIH0pO1xuXG4gIHJldHVybiBkZWYucHJvbWlzZTtcbn1cblxuZnVuY3Rpb24gZ2V0SWRlbnRpdHkoY2FsbGJhY2spIHtcbiAgdmFyIGlzQnJvd3NlciA9ICh0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0Jyk7XG5cbiAgaWYgKCFpc0Jyb3dzZXIpIHtcbiAgICByZXR1cm4gcHJvY2Vzcy5uZXh0VGljayhjYWxsYmFjay5iaW5kKG51bGwsIG51bGwpKTtcbiAgfVxuXG4gIHZhciBQb3N0aWUgPSByZXF1aXJlKCdwb3N0aWUnKTtcbiAgdmFyIGNvbnRlbnRTY3JpcHQgPSBuZXcgUG9zdGllKHdpbmRvdyk7XG5cbiAgLy8gUnVucyB3aGVuIHRoZSBhdXRoIHJlcXVlc3Qgc3VjY2VlZHMuXG4gIGZ1bmN0aW9uIGhhbmRsZUF1dGhTdWNjZXNzKGRhdGEpIHtcbiAgICByZW1vdmVMaXN0ZW5lcnMoKTtcbiAgICBjYWxsYmFjayhudWxsLCBkYXRhLm5hbWUpO1xuICB9XG5cbiAgLy8gUnVucyB3aGVuIHRoZSBhdXRoIHJlcXVlc3QgZmFpbHMuXG4gIGZ1bmN0aW9uIGhhbmRsZUF1dGhFcnJvcihlcnIpIHtcbiAgICByZW1vdmVMaXN0ZW5lcnMoKTtcbiAgICBjYWxsYmFjayhlcnIpO1xuICB9XG5cbiAgLy8gUnVucyB3aGVuIHRoZSBleHRlbnNpb24gcmVjZWl2ZXMgdGhlIGF1dGggcmVxdWVzdFxuICBmdW5jdGlvbiBoYW5kbGVBdXRoUmVjZWl2ZWQoKXtcbiAgICAvLyBTdG9wIGFza2luZyBmb3IgYXV0aC5cbiAgICB3aW5kb3cuY2xlYXJJbnRlcnZhbChhdXRoUmVxdWVzdEludGVydmFsKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVycygpe1xuICAgIHdpbmRvdy5jbGVhckludGVydmFsKGF1dGhSZXF1ZXN0SW50ZXJ2YWwpO1xuICAgIGNvbnRlbnRTY3JpcHQucmVtb3ZlTGlzdGVuZXIoJ2F1dGg6c3VjY2VzcycsIGhhbmRsZUF1dGhTdWNjZXNzKTtcbiAgICBjb250ZW50U2NyaXB0LnJlbW92ZUxpc3RlbmVyKCdhdXRoOkVycm9yJywgaGFuZGxlQXV0aEVycm9yKTtcbiAgfVxuXG4gIGNvbnRlbnRTY3JpcHQub24oJ2F1dGg6c3VjY2VzcycsIGhhbmRsZUF1dGhTdWNjZXNzKTtcbiAgY29udGVudFNjcmlwdC5vbignYXV0aDplcnJvcicsIGhhbmRsZUF1dGhFcnJvcik7XG4gIGNvbnRlbnRTY3JpcHQub24oJ2F1dGg6cmVjZWl2ZWQnLCBoYW5kbGVBdXRoUmVjZWl2ZWQpO1xuXG4gIC8vIFJlcGVhdGVkbHkgYXNrIHRoZSBleHRlbnNpb24gdG8gYXV0aC4gIFRoZSBmaXJzdCB0aW1lIHRoaXMgcnVucywgdGhlXG4gIC8vIGV4dGVuc2lvbiBtaWdodCBub3QgYmUgcnVubmluZyB5ZXQsIHNvIHdlIG5lZWQgdG8gYXNrIGluIGEgc2V0SW50ZXJ2YWwuXG4gIC8vIFRPRE8obmxhY2Fzc2UpOiB0aW1lb3V0IHdpdGggYW4gZXJyb3IgYWZ0ZXIgWCBzZWNvbmRzXG4gIHZhciBhdXRoUmVxdWVzdEludGVydmFsID0gd2luZG93LnNldEludGVydmFsKGZ1bmN0aW9uKCl7XG4gICAgY29udGVudFNjcmlwdC5wb3N0KCdhdXRoJyk7XG4gIH0sIDIwMCk7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiRldhQVNIXCIpKSJdfQ==
