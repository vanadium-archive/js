// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');

var ByteArrayMessageWriter = require(
    './../../src/vom/byte-array-message-writer');
var ByteArrayMessageReader = require(
    './../../src/vom/byte-array-message-reader');
var Encoder = require('./../../src/vom/encoder');
var Decoder = require('./../../src/vom/decoder');
var Time = require('../../src/gen-vdl/v.io/v23/vdlroot/time').Time;
var vdl = require('../../src/vdl');
var registry = require('../../src/vdl/native-type-registry');
require('../../src/vom/native-types'); // Register native types.

var expectedDate = new Date(1999, 9, 9, 9, 9, 999);

function encodeDecodeDate(encodeType) {
  var input = expectedDate;
  var messageWriter = new ByteArrayMessageWriter();
  var encoder = new Encoder(messageWriter);
  encoder.encode(input, encodeType);

  var messageReader = new ByteArrayMessageReader(
    messageWriter.getBytes());
  var decoder = new Decoder(messageReader);
  return decoder.decode();
}

// TODO(bprosnitz) Implement native type guessing and enable this test.
test('date - test encoding and decoding without type',
  function(t) {
  encodeDecodeDate().then(function(result) {
    t.ok(result instanceof Date, 'Decoded date should be a date object');
    var diff = Math.abs(expectedDate - result);
    t.ok(diff < 1, 'Should decode to the expected date');
    t.end();
  }).catch(t.end);
});

test('date - test encoding and decoding with type',
  function(t) {
  encodeDecodeDate(Time.prototype._type).then(function(result) {
    t.ok(result instanceof Date, 'Decoded date should be a date object');
    t.equal(result.getTime(), expectedDate.getTime(),
      'Should decode to the expected date');
    t.end();
  }).catch(t.end);
});

test('date - test fromWireValue', function(t) {
  var tests = [
    {expected: '0001-01-01'},
    {seconds: 0, nanos: 0, expected: '0001-01-01'},
    {nanos: 0, expected: '0001-01-01'},
    {seconds: 0, expected: '0001-01-01'},
    {seconds: vdl.BigInt.fromNativeNumber(0), nanos: 0, expected: '0001-01-01'},
    {nanos: 123000000, expected: '0001-01-01T00:00:00.123Z'},
    {seconds: 10, nanos: 345000000, expected: '0001-01-01T00:00:10.345Z'}
  ];
  tests.forEach(function(test) {
    var date = registry.fromWireValue(
      Time.prototype._type, test);
    t.equal(date.getTime(), Date.parse(test.expected), test.expected);
  });
  t.end();
});

test('date - test toWireValue', function(t) {
  var tests = [
    {seconds: 0, nanos: 0, date: '0001-01-01'},
    {seconds: 0, nanos: 123000000, date: '0001-01-01T00:00:00.123Z'},
    {seconds: 10, nanos: 345000000, date: '0001-01-01T00:00:10.345Z'},
    {seconds: 62135596800, nanos: 0, date: '1970-01-01'}
  ];
  tests.forEach(function(test) {
    var time = registry.fromNativeValue(Time.prototype._type,
      new Date(test.date));
    t.equal(time.seconds.val.toNativeNumberApprox(), test.seconds, test.date);
    t.equal(time.nanos.val, test.nanos, test.date);
  });
  t.end();
});
