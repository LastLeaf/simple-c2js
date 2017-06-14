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
      struct custom {
        int x1;
        void* y_;
      };
      int calc(){}
      int main( int a, char* _b ){
        ;
      }
    `
    var target = {
      body: [{
        op: 'macro',
        name: 'include',
        body: '<math.h>'
      }, {
        op: 'struct',
        name: 'custom',
        body: [{
          type: 'int',
          name: 'x1'
        }, {
          type: 'void*',
          name: 'y_'
        }]
      }, {
        op: 'function',
        type: 'int',
        name: 'calc',
        args: [],
        body: []
      }, {
        op: 'function',
        type: 'int',
        name: 'main',
        args: [{
          type: 'int',
          name: 'a'
        }, {
          type: 'char*',
          name: '_b'
        }],
        body: []
      }]
    }
    parseAndCompare(source, target)
  })

})
