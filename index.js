var fs = require('fs')
var peg = require('pegjs')
var generator = require('./generator')

var syntax = fs.readFileSync(__dirname + '/syntax.pegjs', {encoding: 'utf8'})
var parser = peg.generate(syntax)

exports.compile = function(str){
  var tree = parser.parse(str)
  return generator(tree)
}
