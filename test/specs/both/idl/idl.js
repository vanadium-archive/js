/**
 * @fileoverview Tests for IDL parsing.
 */
'use strict';

var idlHelper = require('../../../../src/idl/idl.js');

describe('IDL', function() {
  describe('stripComments', function() {
    it('doesn\'t strip out non-comments', function() {
      var input = 'type Foo int64\ntype Bar Foo\n';
      var expectedOutput = input;
      expect(idlHelper.stripComments(input)).to.be.equal(expectedOutput);
    });

    it('strips full line comments', function() {
      var input = '// Full line comment here\ntype Bar Foo\n';
      var expectedOutput = '\ntype Bar Foo\n';
      expect(idlHelper.stripComments(input)).to.be.equal(expectedOutput);
    });

    it('strips partial line comments', function() {
      var input = 'Some important stuff // Not so important stuff\n' +
                  'more important stuff';
      var expectedOutput = 'Some important stuff \nmore important stuff';
      expect(idlHelper.stripComments(input)).to.be.equal(expectedOutput);
    });

    it('strips /**/ comments on one line.', function() {
      var input = '/* Full line comment here */\ntype Bar Foo\n';
      var expectedOutput = ' \ntype Bar Foo\n';
      expect(idlHelper.stripComments(input)).to.be.equal(expectedOutput);
    });

    it('strips /**/ comments on multiple lines', function() {
      var input = '/* Full line comment here\n' +
          '* And another line as well\n' +
          '*/\n' +
          'type Bar Foo\n';
      var expectedOutput = '\n\ntype Bar Foo\n';
      expect(idlHelper.stripComments(input)).to.be.equal(expectedOutput);
    });

    it('strips /**/ comments on multipe lines where the end line has ' +
        'non-comment', function() {
          var input = 'type Foo int\n' +
              '/* Full line comment here\n' +
              '* And another line as well\n' +
              '*/type Bar Foo\n';
          var expectedOutput = 'type Foo int\n\ntype Bar Foo\n';
          expect(idlHelper.stripComments(input)).to.be.equal(expectedOutput);
        });

    it('strips /**/ at the beginning of a line', function() {
      var input = '/* foo */ type Bar Foo';
      var expectedOutput = '  type Bar Foo';
      expect(idlHelper.stripComments(input)).to.be.equal(expectedOutput);
    });

    it('strips /**/ in the middle of a line', function() {
      var input = 'type/* foo */Bar Foo';
      var expectedOutput = 'type Bar Foo';
      expect(idlHelper.stripComments(input)).to.be.equal(expectedOutput);
    });

    it('strips /**/ at the end of a line', function() {
      var input = 'type Bar Foo /* foo */';
      var expectedOutput = 'type Bar Foo  ';
      expect(idlHelper.stripComments(input)).to.be.equal(expectedOutput);
    });

    it('ignores a /* after a //', function() {
      var input = '// /* Full line comment here\ntype Bar Foo\n';
      var expectedOutput = '\ntype Bar Foo\n';
      expect(idlHelper.stripComments(input)).to.be.equal(expectedOutput);
    });

    it('ignores a // after a /* on the same line', function() {
      var input = '/* Full line comment here //*/\ntype Bar Foo\n';
      var expectedOutput = ' \ntype Bar Foo\n';
      expect(idlHelper.stripComments(input)).to.be.equal(expectedOutput);
    });

    it('ignores a // in a /* comment starting in a differen line' , function() {
      var input = '/* Full line comment // here\n*/type Bar Foo\n';
      var expectedOutput = '\ntype Bar Foo\n';
      expect(idlHelper.stripComments(input)).to.be.equal(expectedOutput);
    });
  });

  describe('parseIDL', function() {
    it('skips over a file with no interfaces', function() {
      var input = 'type Bar Foo\n' +
          'type Struct struct {\n' +
          '  ExportedFoo Foo\n' +
          '}\n';
      expect(idlHelper.parseIDL(input)).to.deep.equal({});
    });

    it('handles a method with no arguments.', function() {
      var input = 'type Bar Foo\n' +
          'type Struct struct {\n' +
          '  ExportedFoo Foo\n' +
          '}\n' +
          'type Service interface{\n' +
          ' Add()\n' +
          '}\n';
      var expectedResult = {
        'Service' : {
          Add: {
            name: 'Add',
            numParams: 0,
            numReturnArgs: 0
          }
        }
      };
      expect(idlHelper.parseIDL(input)).to.deep.equal(expectedResult);
    });

    it('handles a method with one argument', function() {
      var input = 'type Bar Foo\n' +
          'type Struct struct {\n' +
          '  ExportedFoo Foo\n' +
          '}\n' +
          'type Service interface{\n' +
          ' Add(a int)\n' +
          '}\n';
      var expectedResult = {
        'Service' : {
          Add: {
            name: 'Add',
            numParams: 1,
            numReturnArgs: 0
          }
        }
      };
      expect(idlHelper.parseIDL(input)).to.deep.equal(expectedResult);
    });

    it('handles a method with multiple arguments', function() {
      var input = 'type Bar Foo\n' +
          'type Struct struct {\n' +
          '  ExportedFoo Foo\n' +
          '}\n' +
          'type Service interface{\n' +
          ' Add(a, b int)\n' +
          '}\n';
      var expectedResult = {
        'Service' : {
          Add: {
            name: 'Add',
            numParams: 2,
            numReturnArgs: 0
          }
        }
      };
      expect(idlHelper.parseIDL(input)).to.deep.equal(expectedResult);
    });

    it('handles a method with multiple arguments in long form', function() {
      var input = 'type Bar Foo\n' +
          'type Struct struct {\n' +
          '  ExportedFoo Foo\n' +
          '}\n' +
          'type Service interface{\n' +
          ' Add(a int, b int)\n' +
          '}\n';
      var expectedResult = {
        'Service' : {
          Add: {
            name: 'Add',
            numParams: 2,
            numReturnArgs: 0
          }
        }
      };
      expect(idlHelper.parseIDL(input)).to.deep.equal(expectedResult);
    });

    it('handles a method with a return value', function() {
      var input = 'type Bar Foo\n' +
          'type Struct struct {\n' +
          '  ExportedFoo Foo\n' +
          '}\n' +
          'type Service interface{\n' +
          ' Add(a int, b int) int\n' +
          '}\n';
      var expectedResult = {
        'Service' : {
          Add: {
            name: 'Add',
            numParams: 2,
            numReturnArgs: 1
          }
        }
      };
      expect(idlHelper.parseIDL(input)).to.deep.equal(expectedResult);
    });

    it('handles a method with multiple return values', function() {
      var input = 'type Bar Foo\n' +
          'type Struct struct {\n' +
          '  ExportedFoo Foo\n' +
          '}\n' +
          'type Service interface{\n' +
          ' Add(a int, b int) (int, error)\n' +
          '}\n';
      var expectedResult = {
        'Service' : {
          Add: {
            name: 'Add',
            numParams: 2,
            numReturnArgs: 2
          }
        }
      };
      expect(idlHelper.parseIDL(input)).to.deep.equal(expectedResult);
    });

    it('handles a method with no return values and tags', function() {
      var input = 'type Bar Foo\n' +
          'type Struct struct {\n' +
          '  ExportedFoo Foo\n' +
          '}\n' +
          'type Service interface{\n' +
          ' Add(a int, b int) {int, error}\n' +
          '}\n';
      var expectedResult = {
        'Service' : {
          Add: {
            name: 'Add',
            numParams: 2,
            numReturnArgs: 0
          }
        }
      };
      expect(idlHelper.parseIDL(input)).to.deep.equal(expectedResult);
    });

    it('handles a method with one return value and tags', function() {
      var input = 'type Bar Foo\n' +
          'type Struct struct {\n' +
          '  ExportedFoo Foo\n' +
          '}\n' +
          'type Service interface{\n' +
          ' Add(a int, b int) int {int, error}\n' +
          '}\n';
      var expectedResult = {
        'Service' : {
          Add: {
            name: 'Add',
            numParams: 2,
            numReturnArgs: 1
          }
        }
      };
      expect(idlHelper.parseIDL(input)).to.deep.equal(expectedResult);
    });

    it('handles a method with multiple return values and tags', function() {
      var input = 'type Bar Foo\n' +
          'type Struct struct {\n' +
          '  ExportedFoo Foo\n' +
          '}\n' +
          'type Service interface{\n' +
          ' Add(a int, b int) (int, error) {int, error}\n' +
          '}\n';
      var expectedResult = {
        'Service' : {
          Add: {
            name: 'Add',
            numParams: 2,
            numReturnArgs: 2
          }
        }
      };
      expect(idlHelper.parseIDL(input)).to.deep.equal(expectedResult);
    });

    it('handles multiple methods in a service', function() {
      var input = 'type Bar Foo\n' +
          'type Struct struct {\n' +
          '  ExportedFoo Foo\n' +
          '}\n' +
          'type Service interface{\n' +
          ' Add(a int, b int) (int, error)\n' +
          ' UnaryOperator()\n' +
          '}\n';
      var expectedResult = {
        'Service' : {
          Add: {
            name: 'Add',
            numParams: 2,
            numReturnArgs: 2
          },
          UnaryOperator: {
            name: 'UnaryOperator',
            numParams: 0,
            numReturnArgs: 0
          }
        }
      };
      expect(idlHelper.parseIDL(input)).to.deep.equal(expectedResult);
    });

    it('handles line breaks in param list', function() {
      var input = 'type Bar Foo\n' +
          'type Struct struct {\n' +
          '  ExportedFoo Foo\n' +
          '}\n' +
          'type Service interface{\n' +
          ' Add(a int,\n ' +
          '     b int)\n' +
          ' UnaryOperator()\n' +
          '}\n';
      var expectedResult = {
        'Service' : {
          Add: {
            name: 'Add',
            numParams: 2,
            numReturnArgs: 0
          },
          UnaryOperator: {
            name: 'UnaryOperator',
            numParams: 0,
            numReturnArgs: 0
          }
        }
      };
      expect(idlHelper.parseIDL(input)).to.deep.equal(expectedResult);
    });

    it('handles line breaks in return list', function() {
      var input = 'type Bar Foo\n' +
          'type Struct struct {\n' +
          '  ExportedFoo Foo\n' +
          '}\n' +
          'type Service interface{\n' +
          ' Add(a int, b int) (\n' +
          '   int, error)\n' +
          ' UnaryOperator()\n' +
          '}\n';
      var expectedResult = {
        'Service' : {
          Add: {
            name: 'Add',
            numParams: 2,
            numReturnArgs: 2
          },
          UnaryOperator: {
            name: 'UnaryOperator',
            numParams: 0,
            numReturnArgs: 0
          }
        }
      };
      expect(idlHelper.parseIDL(input)).to.deep.equal(expectedResult);
    });

    it('handles line breaks in tags', function() {
      var input = 'type Bar Foo\n' +
          'type Struct struct {\n' +
          '  ExportedFoo Foo\n' +
          '}\n' +
          'type Service interface{\n' +
          ' Add(a int, b int) {int,\n' +
          ' error}\n' +
          ' UnaryOperator()\n' +
          '}\n';
      var expectedResult = {
        'Service' : {
          Add: {
            name: 'Add',
            numParams: 2,
            numReturnArgs: 0
          },
          UnaryOperator: {
            name: 'UnaryOperator',
            numParams: 0,
            numReturnArgs: 0
          }
        }
      };
      expect(idlHelper.parseIDL(input)).to.deep.equal(expectedResult);
    });

    it('handles line breaks in param list and return list', function() {
      var input = 'type Bar Foo\n' +
          'type Struct struct {\n' +
          '  ExportedFoo Foo\n' +
          '}\n' +
          'type Service interface{\n' +
          ' Add(a int,\n ' +
          '     b int) (\n' +
          '    int, error)\n' +
          ' UnaryOperator()\n' +
          '}\n';
      var expectedResult = {
        'Service' : {
          Add: {
            name: 'Add',
            numParams: 2,
            numReturnArgs: 2
          },
          UnaryOperator: {
            name: 'UnaryOperator',
            numParams: 0,
            numReturnArgs: 0
          }
        }
      };
      expect(idlHelper.parseIDL(input)).to.deep.equal(expectedResult);
    });

    it('handles line breaks in return list and tags', function() {
      var input = 'type Bar Foo\n' +
          'type Struct struct {\n' +
          '  ExportedFoo Foo\n' +
          '}\n' +
          'type Service interface{\n' +
          ' Add(a int, b int) (\n' +
          '   int, error) {\n' +
          '   int, error,\n' +
          ' }\n' +
          ' UnaryOperator()\n' +
          '}\n';
      var expectedResult = {
        'Service' : {
          Add: {
            name: 'Add',
            numParams: 2,
            numReturnArgs: 2
          },
          UnaryOperator: {
            name: 'UnaryOperator',
            numParams: 0,
            numReturnArgs: 0
          }
        }
      };
      expect(idlHelper.parseIDL(input)).to.deep.equal(expectedResult);
    });

    it('handles line breaks in tags and params list', function() {
      var input = 'type Bar Foo\n' +
          'type Struct struct {\n' +
          '  ExportedFoo Foo\n' +
          '}\n' +
          'type Service interface{\n' +
          ' Add(a int,\n' +
          ' b int,\n' +
          ' ) {int,\n' +
          ' error,\n' +
          ' }\n' +
          ' UnaryOperator()\n' +
          '}\n';
      var expectedResult = {
        'Service' : {
          Add: {
            name: 'Add',
            numParams: 2,
            numReturnArgs: 0
          },
          UnaryOperator: {
            name: 'UnaryOperator',
            numParams: 0,
            numReturnArgs: 0
          }
        }
      };
      expect(idlHelper.parseIDL(input)).to.deep.equal(expectedResult);
    });

    it('handles a multiple services', function() {
      var input = 'type Bar Foo\n' +
          'type Struct struct {\n' +
          '  ExportedFoo Foo\n' +
          '}\n' +
          'type Service interface{\n' +
          ' Add()\n' +
          '}\n' +
          'type Service2 interface{\n' +
          ' Store(a int, b int)\n' +
          '}\n';
      var expectedResult = {
        'Service' : {
          Add: {
            name: 'Add',
            numParams: 0,
            numReturnArgs: 0
          }
        },
        'Service2': {
          Store: {
            name: 'Store',
            numParams: 2,
            numReturnArgs: 0
          }
        }
      };
      expect(idlHelper.parseIDL(input)).to.deep.equal(expectedResult);
    });
  });

  describe('generateIDL', function() {
    it('generates an empty package if there are no services', function() {
      expect(idlHelper.generateIDL('PN', {})).to.equal(
          'package PN\n\n');
    });

    it('generates an empty interface for an empty service', function() {
      expect(idlHelper.generateIDL('PN', {
        'SN': new idlHelper.ServiceWrapper({})
      })).to.equal(
          'package PN\n\n' +
          'type SN interface {\n' +
          '}\n');
    });

    it('generates a correct idl for an empty exported method', function() {
      expect(idlHelper.generateIDL('PN', {'SN': new idlHelper.ServiceWrapper({
        AMethod: function() {
        }
      })})).to.equal(
          'package PN\n\n' +
          'type SN interface {\n' +
          ' AMethod() (result anydata, err error)\n' +
          '}\n');
    });

    it('generates a correct idl for an exported method with args',
        function() {
          expect(idlHelper.generateIDL('PN', {
            'SN': new idlHelper.ServiceWrapper({
              BMethod: function(arg1, arg2) {
                return arg1;
              }
            })
          })).to.equal(
              'package PN\n\n' +
              'type SN interface {\n' +
              ' BMethod(arg1 anydata, arg2 anydata) (result anydata, ' +
              'err error)\n' +
              '}\n');
        });

    it('generated a correct idl when there are multiple methods',
        function() {
          expect(idlHelper.generateIDL('PN', {
            'SN': new idlHelper.ServiceWrapper({
              amethod: function() {},
              BMethod: function(arg1, arg2) {
                return arg1;
              }
            })
          })).to.equal(
             'package PN\n\n' +
             'type SN interface {\n' +
             ' Amethod() (result anydata, err error)\n' +
             ' BMethod(arg1 anydata, arg2 anydata) (result anydata, ' +
             'err error)\n' +
             '}\n');
        });
    it('skips methods with names starting with \'_\'', function() {
      expect(idlHelper.generateIDL('PN', {'SN': new idlHelper.ServiceWrapper({
        _SkipMe: function() {
        },
        BMethod: function(arg1, arg2) {
          return arg1;
        }
      })})).to.equal(
          'package PN\n\n' +
          'type SN interface {\n' +
          ' BMethod(arg1 anydata, arg2 anydata) (result anydata, err error)\n' +
          '}\n');
    });

    it('skips args names starting with \'$\'', function() {
      expect(idlHelper.generateIDL('PN', {'SN': new idlHelper.ServiceWrapper({
        AMethod: function($First, Scnd, $Third, Frth) {
        }
      })})).to.equal(
          'package PN\n\n' +
          'type SN interface {\n' +
          ' AMethod(Scnd anydata, Frth anydata) (result anydata, err error)\n' +
          '}\n');
    });

    it('has an output stream when outstream is set', function() {
      var srvc = new idlHelper.ServiceWrapper({
        meth: function(arg, $stream) {
        }
      });
      expect(idlHelper.generateIDL('PN', {'SN': srvc})).to.equal(
          'package PN\n\n' +
          'type SN interface {\n Meth(arg anydata) stream<anydata, anydata>' +
          ' (result anydata, err error)\n' +
          '}\n');
    });

    it('can generate an idl for multiple services', function() {
      var aStr = 'type A interface {\n' +
          ' M() (result anydata, err error)\n' +
          '}\n';
      var bStr = 'type B interface {\n' +
          ' W(arg anydata) (result anydata, err error)\n' +
          '}\n';
      var packageHeader = 'package PN\n\n';
      expect(
        [packageHeader + aStr + bStr, packageHeader + bStr + aStr]
      ).to.include(idlHelper.generateIDL('PN', {
        A: new idlHelper.ServiceWrapper({'M' : function() {}}),
        B: new idlHelper.ServiceWrapper({'W' : function(arg) {}})
      }));
    });
  });
});

