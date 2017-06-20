var c2js = require('../index')
var expect = require('chai').expect

var asmWrapper = function(str){
  return 'function asmModule(stdlib,foreign,heap){"use asm";' + str + '}'
}

var compile = (filename) => {
  var res = null
  try {
    res = c2js.compile(filename)
  } catch(e) {
    console.error(e.message)
    console.error(e.location)
    throw e
  }
  return res
}

describe('#compile', () => {

  it('should compile statics', () => {
    var filename = __dirname + '/compile/statics.c'
    var target = asmWrapper('var a=0;var b=1;var c=4;var d=0.0;var e=fround(-2.3);return {}')
    expect(compile(filename)).to.equal(target)
  })

})
