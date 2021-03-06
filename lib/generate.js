var convert = require('./convert')
var stringify = require('./stringify')
var consts = require('./consts')

var STDLIB_ARRAY_BUFFERS = consts.STDLIB_ARRAY_BUFFERS
var STDLIB_PRESERVE = consts.STDLIB_PRESERVE
var STDLIB_TYPES = consts.STDLIB_TYPES

var generateTree = (tree) => {
  return stringify.tree(convert.tree(tree))
}

var stdlibStr = () => {
  var map = {}
  var k = ''
  for(k in STDLIB_ARRAY_BUFFERS) {
    map[STDLIB_ARRAY_BUFFERS[k]] = 'new __stdlib.' + k + '(__heap)'
  }
  for(k in STDLIB_PRESERVE) {
    map[STDLIB_PRESERVE[k]] = '__stdlib.' + k
  }
  for(k in STDLIB_TYPES) {
    map['__' + k] = '__stdlib.' + STDLIB_TYPES[k][0]
  }
  var ret = ''
  for(k in map) {
    ret += 'var ' + k + '=' + map[k] + ';'
  }
  return ret
}

module.exports = function(tree, bareMode){
  if(bareMode) return generateTree(tree)
  return 'function asmModule(__stdlib,__foreign,__heap){"use asm";' + stdlibStr() + generateTree(tree) + '}'
}
