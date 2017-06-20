var CompilationError = require('./error-obj').CompilationError

// utils

var POINTER_SIZE = 4
var INT_SIZE = 4
var DOUBLE_SIZE = 8
var FLOAT_SIZE = 4

var getTypeSize = (typeInfo, info) => {
  if(typeInfo.pointer) return POINTER_SIZE
  if(typeInfo.name === 'int') return INT_SIZE
  if(typeInfo.name === 'double') return DOUBLE_SIZE
  if(typeInfo.name === 'float') return FLOAT_SIZE
  if(typeInfo.name === 'char') return 1
  if(typeInfo.name === 'void') throw new CompilationError('Void type does not support size evaluation', typeInfo.location)
  if(typeInfo.struct) {
    var structDef = info.structs[typeInfo.name]
    if(!structDef) throw new CompilationError('Unrecognized type: ' + typeInfo.name, typeInfo.location)
    return structDef.size
  }
  throw new CompilationError('Unrecognized type: ' + typeInfo.name, typeInfo.location)
}

// value conversion

var evaluateStaticValue = function(item, info){
  var type = {
    struct: false,
    name: 'int',
    pointer: false
  }
  var value = 0
  switch(item.op) {
    case '-n':
      var child = evaluateStaticValue(item.body, info)
      value = -child.value
      type = child.type
      break
    case 'sizeof':
      value = getTypeSize(item.body, info)
      break
    case 'cast':
      type = item.type
      value = evaluateStaticValue(item.body, info).value
      if(type === 'int') value = Math.floor(value)
      break
    case 'int':
      value = item.value
      break
    case 'float':
    case 'double':
      type.name = item.op
      value = item.value
      break
    default:
      throw new CompilationError('Non-constant values are not accepted', item.location)
  }
  return {
    type,
    value,
  }
}

var convertTypeAndDef = function(targetType, sourceType, value){
  if(targetType.pointer) {
    if(targetType.pointer !== sourceType.pointer || targetType.struct !== sourceType.struct
      || ((targetType.struct || targetType.pointer) && targetType.name !== sourceType.name)
      || (!sourceType.struct && !sourceType.pointer && (sourceType.name === 'void' || sourceType.name === 'char'))
    ) {
      throw new CompilationError('Convert from incompatible types', targetType.location)
    }
  }
  var targetTypeName = targetType.name
  if(targetType.pointer) targetTypeName = 'int'
  if(targetTypeName === 'int') return String(Math.floor(value))
  if(targetTypeName === 'double') {
    let str = String(value)
    if(str.indexOf('.') < 0) str += '.0'
    return str
  }
  if(targetTypeName === 'float') return 'fround(' + value + ')'
  throw new CompilationError('Convert to invalid types', targetType.location)
}

// overall structures

var generateStruct = (item, info) => {
  var fieldOrder = []
  var fieldMap = Object.create(null)
  var offset = 0
  item.body.forEach((item) => {
    var typeInfo = item.type
    var size = getTypeSize(typeInfo, info)
    fieldOrder.push(item.name)
    fieldMap[item.name] = {
      type: typeInfo,
      size,
      offset,
    }
    offset += size
  })
  info.structs[item.name] = {
    fieldOrder,
    fieldMap,
    size: offset,
  }
}

var generateStatic = (item, info) => {
  var ret = ''
  var typeInfo = item.type
  if(typeInfo.struct && !typeInfo.pointer) {
    throw new CompilationError('Static variables cannot be struct values', item.location)
  }
  if((typeInfo.name === 'void' || typeInfo.name === 'char') && !typeInfo.pointer) {
    throw new CompilationError('Static variables cannot be char or void types', item.location)
  }
  item.body.forEach((item) => {
    var name = item.name
    var valueInfo = evaluateStaticValue(item.value, info)
    var size = getTypeSize(typeInfo, info)
    info.statics[name] = {
      type: typeInfo,
      size,
      value: valueInfo.value,
    }
    ret += 'var ' + name + '=' + convertTypeAndDef(typeInfo, valueInfo.type, valueInfo.value) + ';'
  })
  return ret
}

var generateFunction = (item, info) => {
  // TODO
}

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
      generateStruct(item, info)
    } else if(item.op === 'static') {
      ret += generateStatic(item, info)
    } else if(item.op === 'function') {
      ret += generateFunction(item, info)
      if(item.name[0] !== '_') info.exports.push(item.name)
    }
  })
  ret += 'return {' + info.exports.map((item) => item + ':' + item).join(',') + '}'
  return ret
}

var stdlibStr = () => {
  // TODO
  return ''
}

module.exports = function(tree){
  return 'function asmModule(stdlib,foreign,heap){"use asm";' + stdlibStr() + generateTree(tree) + '}'
}
