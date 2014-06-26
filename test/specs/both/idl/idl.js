/**
 * @fileoverview Tests for IDL parsing.
 */
'use strict';

var idlHelper = require('../../../../src/idl/idl.js');

describe('IDL', function() {
  describe('generateIdlWireDescription', function() {
    it('generates an empty interface for an empty service', function() {
      expect(idlHelper.generateIdlWireDescription(
        new idlHelper.ServiceWrapper({})
      )).to.deep.equal({});
    });

    it('generates a correct idl for an empty method', function() {
      expect(idlHelper.generateIdlWireDescription(
        new idlHelper.ServiceWrapper({
          aMethod: function() {
          }
        })
      )).to.deep.equal({
          aMethod: {
            InArgs: [],
            NumOutArgs: 2,
            IsStreaming: false
          }
        });
    });

    it('generates a correct idl for a method with args',
        function() {
          expect(idlHelper.generateIdlWireDescription(
            new idlHelper.ServiceWrapper({
              bMethod: function(arg1, arg2) {
                return arg1;
              }
            }))).to.deep.equal({
              bMethod: {
                InArgs: ['arg1', 'arg2'],
                NumOutArgs: 2,
                IsStreaming: false
              }
            });
        });

    it('generated a correct idl when there are multiple methods',
        function() {
          expect(idlHelper.generateIdlWireDescription(
            new idlHelper.ServiceWrapper({
              amethod: function() {},
              bMethod: function(arg1, arg2) {
                return arg1;
              }
            }))).to.deep.equal({
              amethod: {
                InArgs: [],
                NumOutArgs: 2,
                IsStreaming: false
              },
              bMethod: {
                InArgs: ['arg1', 'arg2'],
                NumOutArgs: 2,
                IsStreaming: false
              }
            });
        });
    it('skips methods with names starting with \'_\'', function() {
      expect(idlHelper.generateIdlWireDescription(new idlHelper.ServiceWrapper({
        _SkipMe: function() {
        },
        bMethod: function(arg1, arg2) {
          return arg1;
        }
      }))).to.deep.equal({
        bMethod: {
          InArgs: ['arg1', 'arg2'],
          NumOutArgs: 2,
          IsStreaming: false
        }
      });
    });

    it('skips args names starting with \'$\'', function() {
      expect(idlHelper.generateIdlWireDescription(new idlHelper.ServiceWrapper({
        aMethod: function($First, Scnd, $Third, Frth) {
        }
      }))).to.deep.equal({
        aMethod: {
          InArgs: ['Scnd', 'Frth'],
          NumOutArgs: 2,
          IsStreaming: false
        }
      });
    });

    it('has a stream when $stream is in the argument list', function() {
      var srvc = new idlHelper.ServiceWrapper({
        meth: function(arg, $stream) {
        }
      });
      expect(idlHelper.generateIdlWireDescription(srvc)).to.deep.equal({
        meth: {
          InArgs: ['arg'],
          NumOutArgs: 2,
          IsStreaming: true
        }
      });
    });

    it('should fail when a method name starts with an uppercase letter',
      function() {
        expect(function(){
          idlHelper.ServiceWrapper({
            UppercaseMethod: function() {}
          });
        }).to.throw();
      });
  });
});

