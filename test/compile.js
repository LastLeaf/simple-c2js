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
    var target = 'function A(){return 0;}function B(A,B){A=__f__(A);B=B|0;return +(0|0);}function C(A,B){A=A|0;B=B|0;return 0;}return{fn:B,main:C}'
    expect(compileContent(filename)).to.equal(target)
  })

  it('should compile function variable definitions', () => {
    var filename = __dirname + '/compile/definition.c'
    var target = 'function main(){var a=4096,c=-1,d=0;return 8;}return{main:main}'
    expect(compileContent(filename)).to.equal(target)
  })

  it('should compile if statements', () => {
    var filename = __dirname + '/compile/if.c'
    var target = 'function main(){if(1)2;if(3){return 4;}else if(5){return 6;}else {return 7;}}return{main:main}'
    expect(compileContent(filename)).to.equal(target)
  })

  it('should compile while statements', () => {
    var filename = __dirname + '/compile/while.c'
    var target = 'function main(){while(1)2;while(3){return 4;}}return{main:main}'
    expect(compileContent(filename)).to.equal(target)
  })

  it('should compile for statements', () => {
    var filename = __dirname + '/compile/for.c'
    var target = 'function main(){for(;;){}for(1;2;3){return ~~floor(4);}}return{main:main}'
    expect(compileContent(filename)).to.equal(target)
  })

  it('should compile member operaters', () => {
    var filename = __dirname + '/compile/member.c'
    var target = 'function main(){var a=4096,b=8192,dInt=0,dDouble=0.0,dFloat=__f__(0),eInt=0,eDouble=0.0,eFloat=__f__(0),fInt=0,fDouble=0.0,fFloat=__f__(0);__I8__[(b|0+__im__((1),(~~floor(+(__F32__[(b|0+48+__im__((8),(3)))>>2<<2>>2])))))];dInt=(__I32__[(b|0+68)>>2<<2>>2])|0;dDouble=+((__I32__[(b|0+68)>>2<<2>>2])|0);dFloat=__f__((__I32__[(b|0+68)>>2<<2>>2])|0);eInt=~~floor(__F64__[(b|0+80)>>3<<3>>3]);eDouble=+(__F64__[(b|0+80)>>3<<3>>3]);eFloat=__f__(__F64__[(b|0+80)>>3<<3>>3]);fInt=~~floor(+(__F32__[(b|0+88)>>2<<2>>2]));fDouble=+(__F32__[(b|0+88)>>2<<2>>2]);fFloat=__f__(__F32__[(b|0+88)>>2<<2>>2]);return 0;}return{main:main}'
    expect(compileContent(filename)).to.equal(target)
  })

  it('should compile assignment expressions', () => {
    var filename = __dirname + '/compile/assignment.c'
    var target = ''
    expect(compileContent(filename)).to.equal(target)
  })

})

describe('#compile', () => {

  it('should wrap with proper wrapper', () => {
    var filename = __dirname + '/compile/empty.c'
    var target = 'function asmModule(__stdlib__,__foreign__,__heap__){"use asm";var __U8__=new __stdlib__.Uint8Array(__heap__);var __I8__=new __stdlib__.Int8Array(__heap__);var __U32__=new __stdlib__.Uint32Array(__heap__);var __I32__=new __stdlib__.Int32Array(__heap__);var __F32__=new __stdlib__.Float32Array(__heap__);var __F64__=new __stdlib__.Float64Array(__heap__);var __im__=__stdlib__.Math.imul;var __f__=__stdlib__.Math.fround;var acos=__stdlib__.Math.acos;var asin=__stdlib__.Math.asin;var atan=__stdlib__.Math.atan;var cos=__stdlib__.Math.cos;var sin=__stdlib__.Math.sin;var tan=__stdlib__.Math.tan;var exp=__stdlib__.Math.exp;var log=__stdlib__.Math.log;var ceil=__stdlib__.Math.ceil;var floor=__stdlib__.Math.floor;var sqrt=__stdlib__.Math.sqrt;var abs=__stdlib__.Math.abs;var fabs=__stdlib__.Math.abs;var atan2=__stdlib__.Math.atan2;var pow=__stdlib__.Math.pow;var M_E=__stdlib__.Math.E;var M_LN10=__stdlib__.Math.LN10;var M_LN2=__stdlib__.Math.LN2;var M_LOG2E=__stdlib__.Math.LOG2E;var M_LOG10E=__stdlib__.Math.LOG10E;var M_PI=__stdlib__.Math.PI;var M_SQRT1_2=__stdlib__.Math.SQRT1_2;var M_SQRT2=__stdlib__.Math.SQRT2;var INFINITY=__stdlib__.Infinity;var NAN=__stdlib__.NaN;return{}}'
    expect(c2js.compile(filename)).to.equal(target)
  })

})
