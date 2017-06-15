var fs = require('fs')
var peg = require('pegjs')

var PEGJS_OPTIONS = {
  output: 'source',
  format: 'commonjs',
  cache: false,
  trace: false
}

console.log('Generating parser using PEG.js...')

var syntax = fs.readFileSync(__dirname + '/syntax.pegjs', {encoding: 'utf8'})
var parserStr = peg.generate(syntax, PEGJS_OPTIONS)
fs.writeFile(__dirname + '/bin/parser.js', parserStr)

console.log('Parser generated.')
