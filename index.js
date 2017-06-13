var fs = require('fs')
var peg = require('pegjs')
var generator = require('./generator')

var syntax = fs.readFileSync(__dirname + '/syntax.pegjs', {encoding: 'utf8'})
try {
var parser = peg.generate(syntax)
} catch(e) {console.info(e.location)}

var PEGJS_OPTIONS = {
  trace: true
}

exports.parse = function(str){
  return parser.parse(str, PEGJS_OPTIONS)
}

exports.compile = function(str){
  var tree = parser.parse(str, PEGJS_OPTIONS)
  return generator(tree)
}
