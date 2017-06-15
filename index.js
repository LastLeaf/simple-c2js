var fs = require('fs')
var generator = require('./lib/generator')

var PEGJS_OPTIONS = {
  cache: false,
  trace: false
}

var parser = null
try {
  parser = require('./bin/parser.js')
} catch(e) {
  var peg = require('pegjs')
  var syntax = fs.readFileSync(__dirname + '/syntax.pegjs', {encoding: 'utf8'})
  parser = peg.generate(syntax, PEGJS_OPTIONS)
}

exports.parse = function(str){
  return parser.parse(str)
}

exports.compile = function(str){
  var tree = parser.parse(str)
  return generator(tree)
}
