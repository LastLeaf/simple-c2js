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
    var target = 'function calc(){return (0)|0;}function fn(f,i){f=__f__(f);i=i|0;return +(0);}function main(argc,argv){argc=argc|0;argv=argv|0;return (0)|0;}return{fn:fn,main:main}'
    expect(compileContent(filename)).to.equal(target)
  })

})

describe('#compile', () => {

  it('should wrap with proper wrapper', () => {
    var filename = __dirname + '/compile/empty.c'
    var target = 'function asmModule(stdlib,foreign,heap){"use asm";var __I8__=stdlib.Int8Array;var __I32__=stdlib.Int32Array;var __F32__=stdlib.Float32Array;var __F64__=stdlib.Float64Array;var __im__=stdlib.Math.imul;var __f__=stdlib.Math.fround;var acos=stdlib.Math.acos;var asin=stdlib.Math.asin;var atan=stdlib.Math.atan;var cos=stdlib.Math.cos;var sin=stdlib.Math.sin;var tan=stdlib.Math.tan;var exp=stdlib.Math.exp;var log=stdlib.Math.log;var ceil=stdlib.Math.ceil;var floor=stdlib.Math.floor;var sqrt=stdlib.Math.sqrt;var abs=stdlib.Math.abs;var fabs=stdlib.Math.abs;var atan2=stdlib.Math.atan2;var pow=stdlib.Math.pow;var M_E=stdlib.Math.E;var M_LN10=stdlib.Math.LN10;var M_LN2=stdlib.Math.LN2;var M_LOG2E=stdlib.Math.LOG2E;var M_LOG10E=stdlib.Math.LOG10E;var M_PI=stdlib.Math.PI;var M_SQRT1_2=stdlib.Math.SQRT1_2;var M_SQRT2=stdlib.Math.SQRT2;var INFINITY=stdlib.Infinity;var NAN=stdlib.NaN;return{}}'
    expect(c2js.compile(filename)).to.equal(target)
  })

})
