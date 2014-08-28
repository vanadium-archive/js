/**
 * @fileoverview Tests for binary writer.
 */

var test = require('prova');

var BinaryWriter = require('./binary_writer.js');
var ByteUtil = require('./byte_util.js');

test('writeByte', function(t) {
  var bw = new BinaryWriter();
  bw.writeByte(0);
  bw.writeByte(255);
  t.equal(ByteUtil.bytes2Hex(bw.getBytes()),
    ByteUtil.bytes2Hex(new Uint8Array([0, 255])));
  t.end();
});

test('writeByteArray', function(t) {
  var bw = new BinaryWriter();
  bw.writeByteArray(new Uint8Array([0, 255]));
  bw.writeByteArray(new Uint8Array([7]));
  t.equals(ByteUtil.bytes2Hex(bw.getBytes()),
    ByteUtil.bytes2Hex(new Uint8Array([0, 255, 7])));
  t.end();
});