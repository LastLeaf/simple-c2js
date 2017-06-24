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
    var target = 'var a=0;var b=1;var c=4;var d=0.0,d2=1.0;var e=__f__(-2.3);return{}'
    expect(compileContent(filename)).to.equal(target)
  })

  it('should compile empty functions', () => {
    var filename = __dirname + '/compile/function.c'
    var target = 'function calc(){return 0;}function fn(f,i){f=__f__(f);i=i|0;return +((0)|0);}function main(argc,argv){argc=argc|0;argv=argv|0;return 0;}return{fn:fn,main:main}'
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

})

describe('#compile', () => {

  it('should wrap with proper wrapper', () => {
    var filename = __dirname + '/compile/empty.c'
    var target = 'function asmModule(__stdlib__,__foreign__,__heap__){"use asm";var __U8__=new __stdlib__.Uint8Array(__heap__);var __I32__=new __stdlib__.Int32Array(__heap__);var __F32__=new __stdlib__.Float32Array(__heap__);var __F64__=new __stdlib__.Float64Array(__heap__);var __im__=__stdlib__.Math.imul;var __f__=__stdlib__.Math.fround;var acos=__stdlib__.Math.acos;var asin=__stdlib__.Math.asin;var atan=__stdlib__.Math.atan;var cos=__stdlib__.Math.cos;var sin=__stdlib__.Math.sin;var tan=__stdlib__.Math.tan;var exp=__stdlib__.Math.exp;var log=__stdlib__.Math.log;var ceil=__stdlib__.Math.ceil;var floor=__stdlib__.Math.floor;var sqrt=__stdlib__.Math.sqrt;var abs=__stdlib__.Math.abs;var fabs=__stdlib__.Math.abs;var atan2=__stdlib__.Math.atan2;var pow=__stdlib__.Math.pow;var M_E=__stdlib__.Math.E;var M_LN10=__stdlib__.Math.LN10;var M_LN2=__stdlib__.Math.LN2;var M_LOG2E=__stdlib__.Math.LOG2E;var M_LOG10E=__stdlib__.Math.LOG10E;var M_PI=__stdlib__.Math.PI;var M_SQRT1_2=__stdlib__.Math.SQRT1_2;var M_SQRT2=__stdlib__.Math.SQRT2;var INFINITY=__stdlib__.Infinity;var NAN=__stdlib__.NaN;return{}}'
    expect(c2js.compile(filename)).to.equal(target)
  })

})
