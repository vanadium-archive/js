/**
 * @fileoverview Tests for binary reader.
 */

var test = require('prova');

var BinaryReader = require('./../../src/vom/binary-reader.js');
var ByteUtil = require('./../../src/vdl/byte-util.js');

test('readByte', function(t) {
  var expectedBytes = [ 0x0, 0xff, 0x10, 0x20, 0x30, 0x40 ];
  var buf = new Uint8Array(expectedBytes);

  var br = new BinaryReader(buf);
  for (var i = 0; i < expectedBytes.length; i++) {
    t.equals(br.readByte(), expectedBytes[i], 'index ' + i + ' differs');
  }
  t.end();
});

test('readByteArray', function(t) {
  var expectedBytes = [ 0x00, 0xff, 0x10, 0x20, 0x30, 0x40 ];
  var br = new BinaryReader(new Uint8Array(expectedBytes));
  t.equals(ByteUtil.bytes2Hex(br.readByteArray(2)),
    ByteUtil.bytes2Hex(new Uint8Array([0x00, 0xff])));
  t.equals(ByteUtil.bytes2Hex(br.readByteArray(4)),
    ByteUtil.bytes2Hex(new Uint8Array([0x10, 0x20, 0x30, 0x40])));
  t.end();
});
