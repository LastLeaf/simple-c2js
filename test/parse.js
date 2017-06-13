var c2js = require('../index')
var expect = require('chai').expect

var parseAndCompare = (source, target) => {
  var res = null
  try {
    res = c2js.parse(source)
  } catch(e) {
    console.error(e)
  }
  expect(res).to.deep.equal(target)
}

describe('#parse', () => {

  it('should parse macro and functions', () => {
    var source = `
      #include <math.h>
      int calc(){}
      int main( int a, char* _b ){
        ;
      }
    `
    var target = {}
    parseAndCompare(source, target)
  })

})
