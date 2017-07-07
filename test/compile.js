var c2js = require('../index')
var expect = require('chai').expect

var compileContent = (filename) => {
  var res = null
  try {
    res = c2js._compileContentOnly(filename)
  } catch(e) {
    console.error(e.message)
    console.error(e.location)
    throw e
  }
  return res
}

describe('#_compileContentOnly', () => {

  it('should compile statics', () => {
    var filename = __dirname + '/compile/statics.c'
    var target = 'var A=0,B=1,C=4,D=0.0,E=1.0,F=__f__(-2.3);return{}'
    expect(compileContent(filename)).to.equal(target)
  })

  it('should compile empty functions', () => {
    var filename = __dirname + '/compile/function.c'
    var target = 'function _A(){return 0;}function _B(A,B){A=__f(A);B=B|0;return +0;}function _C(A,B){A=A|0;B=B|0;var C=0;C=~~__l(+_B(__f(1),~~__l(2.0)));return C|0;}return{fn:_B,main:_C}'
    expect(compileContent(filename)).to.equal(target)
  })

  it('should compile function variable definitions', () => {
    var filename = __dirname + '/compile/definition.c'
    var target = 'function A(){var A=4096,B=-1,C=0;return 8;}return{main:A}'
    expect(compileContent(filename)).to.equal(target)
  })

  it('should compile if statements', () => {
    var filename = __dirname + '/compile/if.c'
    var target = 'function A(){if(~~floor(1.0))2;if(~~floor(+__f__(3))){return 4;}else if(5){return 6;}else {return 7;}return 0;}return{main:A}'
    expect(compileContent(filename)).to.equal(target)
  })

  it('should compile while statements', () => {
    var filename = __dirname + '/compile/while.c'
    var target = 'function A(){while(~~floor(1.0))2;while(~~floor(+__f__(3))){return 4;}return 0;}return{main:A}'
    expect(compileContent(filename)).to.equal(target)
  })

  it('should compile for statements', () => {
    var filename = __dirname + '/compile/for.c'
    var target = 'function A(){for(;;){}for(1;2;3){return ~~floor(4.0);}return 0;}return{main:A}'
    expect(compileContent(filename)).to.equal(target)
  })

  it('should compile member operaters', () => {
    var filename = __dirname + '/compile/member.c'
    var target = 'function A(){var A=4096,B=8192,C=0,D=0.0,E=__f__(0),F=0,G=0.0,H=__f__(0),I=0,J=0.0,K=__f__(0);__C__[B+__m__(1,~~floor(+__F__[B+48+__m__(8,3)<<2>>2>>2]))<<0>>0>>0];C=__I__[B+68<<2>>2>>2]|0;D=+(__I__[B+68<<2>>2>>2]|0);E=__f__(__I__[B+68<<2>>2>>2]|0);F=~~floor(+__D__[B+80<<3>>3>>3]);G=+__D__[B+80<<3>>3>>3];H=__f__(__D__[B+80<<3>>3>>3]);I=~~floor(+__F__[B+88<<2>>2>>2]);J=+__F__[B+88<<2>>2>>2];K=__f__(__F__[B+88<<2>>2>>2]);return 0;}return{main:A}'
    expect(compileContent(filename)).to.equal(target)
  })

  it('should compile assignment expressions', () => {
    var filename = __dirname + '/compile/assignment.c'
    var target = 'function A(){var A=4096,B=0;__F__[A+4<<2>>2>>2]=__f__(1);B=~~floor(+__F__[A+4<<2>>2>>2]);__I__[A<<2>>2>>2]=B;return __I__[A<<2>>2>>2]|0;}return{main:A}'
    expect(compileContent(filename)).to.equal(target)
  })

  it('should compile addition and multiplication expressions', () => {
    var filename = __dirname + '/compile/addition.c'
    var target = 'function A(){var A=1,B=0,C=0,D=0.0,E=__f__(0),F=4096;B=~~floor(+(+~~floor(+__m__(A,2)/+3)+4.0-+5));C=~~floor(+(A|0)%+(B|0));D=+(B+6-~~floor(+__f__(7))|0);E=__f__(+D*+(B|0));F=F+__m__(~~floor(+8*+D),8)|0;return ~~floor(+D*+9/+E);}return{main:A}'
    expect(compileContent(filename)).to.equal(target)
  })

})

describe('#compile', () => {

  it('should wrap with proper wrapper', () => {
    var filename = __dirname + '/compile/empty.c'
    var target = 'function asmModule(__stdlib,__foreign,__heap){"use asm";var __B=new __stdlib.Uint8Array(__heap);var __C=new __stdlib.Int8Array(__heap);var __U=new __stdlib.Uint32Array(__heap);var __I=new __stdlib.Int32Array(__heap);var __F=new __stdlib.Float32Array(__heap);var __D=new __stdlib.Float64Array(__heap);var __m=__stdlib.Math.imul;var __f=__stdlib.Math.fround;var __l=__stdlib.Math.floor;var __acos=__stdlib.Math.acos;var __asin=__stdlib.Math.asin;var __atan=__stdlib.Math.atan;var __cos=__stdlib.Math.cos;var __sin=__stdlib.Math.sin;var __tan=__stdlib.Math.tan;var __exp=__stdlib.Math.exp;var __log=__stdlib.Math.log;var __ceil=__stdlib.Math.ceil;var __floor=__stdlib.Math.floor;var __sqrt=__stdlib.Math.sqrt;var __abs=__stdlib.Math.abs;var __fabs=__stdlib.Math.abs;var __atan2=__stdlib.Math.atan2;var __pow=__stdlib.Math.pow;var __M_E=__stdlib.Math.E;var __M_LN10=__stdlib.Math.LN10;var __M_LN2=__stdlib.Math.LN2;var __M_LOG2E=__stdlib.Math.LOG2E;var __M_LOG10E=__stdlib.Math.LOG10E;var __M_PI=__stdlib.Math.PI;var __M_SQRT1_2=__stdlib.Math.SQRT1_2;var __M_SQRT2=__stdlib.Math.SQRT2;var __INFINITY=__stdlib.Infinity;var __NAN=__stdlib.NaN;return{}}'
    expect(c2js.compile(filename)).to.equal(target)
  })

})
