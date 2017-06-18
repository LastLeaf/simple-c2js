var fs = require('fs')
var parseFile = require('./lib/parse-file')
var convert = require('./lib/convert')
var generator = require('./lib/generate')

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

exports.parseFile = function(filename){
  return parseFile(parser, filename)
}

exports.compile = function(filename){
  return generator(convert(parseFile(parser, filename)))
}
