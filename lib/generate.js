
var generateStruct = (tree, info) => {}
var generateStatic = (tree, info) => {}
var generateFunction = (tree, info) => {}

var generateTree = (tree) => {
  var ret = ''
  var info = {
    exports: [],
    structs: Object.create(null),
    statics: Object.create(null),
    functions: Object.create(null),
  }
  tree.body.forEach((item) => {
    if(item.op === 'struct') {
      info.structs[item.name] = generateStruct(item, info)
    } else if(item.op === 'static') {
      let staticInfo = generateStatic(item, info)
      info.statics[item.name] = staticInfo.info
      ret += staticInfo.str
    } else if(item.op === 'function') {
      let funcInfo = generateFunction(item, info)
      info.functions[item.name] = funcInfo.info
      ret += funcInfo.str
      if(item.name[0] !== '_') info.exports.push(item.name)
    }
  })
  ret += 'return {' + info.exports.map((item) => item + ':' + item).join(',') + '}'
  return ret
}

module.exports = function(tree){
  return 'function asmModule(stdlib, foreign, heap){"use asm";' + generateTree(tree) + '}'
}
