var c2js = require('../index')
var expect = require('chai').expect

var removeLocationFields = (obj) => {
  for(var k in obj) {
    if(k === 'location') delete obj[k]
    if(typeof(obj[k]) === 'object') removeLocationFields(obj[k])
  }
  return obj
}

var parseAndCompare = (filename, target) => {
  var res = null
  try {
    res = c2js.parseFile(filename)
  } catch(e) {
    console.error(e.message)
    console.error(e.location)
    throw e
  }
  expect(removeLocationFields(res)).to.deep.equal(target)
}

describe('#parseFile', () => {

  it('should include files', () => {
    var filename = __dirname + '/parse-file/include-1.c'
    var target = {
      "body": [
        {
          "op": "struct",
          "name": "type4",
          "body": []
        },
        {
          "op": "function",
          "static": false,
          "type": {
            "struct": false,
            "name": "int",
            "pointer": 0
          },
          "name": "func4",
          "args": [],
          "body": []
        },
        {
          "op": "struct",
          "name": "type2",
          "body": []
        },
        {
          "op": "function",
          "static": false,
          "type": {
            "struct": false,
            "name": "int",
            "pointer": 0
          },
          "name": "func2",
          "args": [],
          "body": []
        },
        {
          "op": "struct",
          "name": "type1",
          "body": []
        },
        {
          "op": "struct",
          "name": "type3",
          "body": []
        },
        {
          "op": "function",
          "static": false,
          "type": {
            "struct": false,
            "name": "int",
            "pointer": 0
          },
          "name": "func3",
          "args": [],
          "body": []
        },
        {
          "op": "function",
          "static": false,
          "type": {
            "struct": false,
            "name": "int",
            "pointer": 0
          },
          "name": "func1",
          "args": [],
          "body": []
        }
      ]
    }
    parseAndCompare(filename, target)
  })

})
