var fs = require('fs')
var parseFile = require('./lib/parse-file')
var convert = require('./lib/convert')
var generate = require('./lib/generate')
var link = require('./lib/link')

var PEGJS_OPTIONS = {
  cache: false,
  trace: false
}

var parser = null
try {
  parser = require('./bin/parser.js')
} catch(e) {
  var peg = require('pegjs')
  var syntax = fs.readFileSync(__dirname + '/lib/syntax.pegjs', {encoding: 'utf8'})
  parser = peg.generate(syntax, PEGJS_OPTIONS)
}

exports.parse = function(str){
  return parser.parse(str)
}

exports.parseFile = function(filename){
  return parseFile(parser, filename)
}

exports._compileContentOnly = function(filename){
  return generate(convert(parseFile(parser, filename)), true)
}

exports.compile = function(filename){
  return generate(convert(parseFile(parser, filename)))
}

exports.link = function(str){
  return link(str)
}
