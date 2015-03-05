var test = require('prova');
var time = require('../vdl-out/javascript-test/time');

test('time constants are Dates', function(assert) {
  var expectedTime = new Date(2012,11,15, 8,15,20, 453);
  assert.ok(time.D instanceof Date, 'constant should be a date');
  var diff = Math.abs(expectedTime - time.D);
  assert.ok(diff < 1, 'constant should be right date');
  assert.end();
});
