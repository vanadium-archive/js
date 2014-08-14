/**
 * @fileoverview Tests vLog
 */
var vLog = require('../../../../src/lib/vlog.js');

describe('vLog', function() {
  var mockConsole;
  beforeEach(function() {
    mockConsole = {
      error: function() {
        this.numErrorCalls++;
        this.write.apply(this, arguments);
      },
      warn: function() {
        this.numWarnCalls++;
        this.write.apply(this, arguments);
      },
      log: function() {
        this.numLogCalls++;
        this.write.apply(this, arguments);
      },
      info: function() {
        this.numInfoCalls++;
        this.write.apply(this, arguments);
      },
      write: function() {
        var args = Array.prototype.slice.call(arguments);
        for(var i = 0; i < args.length; i++) {
          this.output += (this.output === '' ? '' : ' ') + args[i];
        }
      },
      output: '',
      numErrorCalls: 0,
      numWarnCalls: 0,
      numLogCalls: 0,
      numInfoCalls: 0
    };

    // override and mock the console
    vLog._getConsole = function() { return mockConsole; };
  });

  it('Should not write anything with default log level of NoLog', function() {
    vLog.error('foo_err');
    vLog.warn('foo_warning');
    vLog.debug('foo_debug');
    vLog.info('foo_info');

    expect(mockConsole.output).to.equal('');
    expect(mockConsole.numErrorCalls).to.equal(0);
    expect(mockConsole.numWarnCalls).to.equal(0);
    expect(mockConsole.numLogCalls).to.equal(0);
    expect(mockConsole.numInfoCalls).to.equal(0);
  });

  it('Should write errors only when level is error', function() {
    vLog.level = vLog.levels.ERROR;

    vLog.error('foo_err');
    vLog.warn('foo_warning');
    vLog.debug('foo_debug');
    vLog.info('foo_info');

    expect(mockConsole.output).to.equal('foo_err');
    expect(mockConsole.numErrorCalls).to.equal(1);
    expect(mockConsole.numWarnCalls).to.equal(0);
    expect(mockConsole.numLogCalls).to.equal(0);
    expect(mockConsole.numInfoCalls).to.equal(0);
  });

  it('Should write errors and warnings when level is warning', function() {
    vLog.level = vLog.levels.WARN;

    vLog.error('foo_err');
    vLog.warn('foo_warning');
    vLog.debug('foo_debug');
    vLog.info('foo_info');

    expect(mockConsole.output).to.equal('foo_err foo_warning');
    expect(mockConsole.numErrorCalls).to.equal(1);
    expect(mockConsole.numWarnCalls).to.equal(1);
    expect(mockConsole.numLogCalls).to.equal(0);
    expect(mockConsole.numInfoCalls).to.equal(0);
  });

  it('Should write errors, warnings and debug when level is debug', function() {
    vLog.level = vLog.levels.DEBUG;

    vLog.error('foo_err');
    vLog.warn('foo_warning');
    vLog.debug('foo_debug');
    vLog.info('foo_info');

    expect(mockConsole.output).to.equal('foo_err foo_warning foo_debug');
    expect(mockConsole.numErrorCalls).to.equal(1);
    expect(mockConsole.numWarnCalls).to.equal(1);
    expect(mockConsole.numLogCalls).to.equal(1);
    expect(mockConsole.numInfoCalls).to.equal(0);
  });

  it('Should write everything when level is info', function() {
    vLog.level = vLog.levels.INFO;

    vLog.error('foo_err');
    vLog.warn('foo_warning');
    vLog.debug('foo_debug');
    vLog.info('foo_info');

    expect(mockConsole.output).to.equal(
      'foo_err foo_warning foo_debug foo_info');
    expect(mockConsole.numErrorCalls).to.equal(1);
    expect(mockConsole.numWarnCalls).to.equal(1);
    expect(mockConsole.numLogCalls).to.equal(1);
    expect(mockConsole.numInfoCalls).to.equal(1);
  });

  it('Should be able to write multiple arguments', function() {
    vLog.level = vLog.levels.INFO;

    vLog.debug('foo_debug', 42, [1,2]);

    expect(mockConsole.output).to.equal('foo_debug 42 1,2');
  });
});
