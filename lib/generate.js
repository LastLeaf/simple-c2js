var CompilationError = require('./error-obj').CompilationError

// utils

var POINTER_SIZE = 4
var INT_SIZE = 4
var DOUBLE_SIZE = 8
var FLOAT_SIZE = 4

var STDLIB_PRESERVE = {
  'Int8Array': '__I8__',
  'Int32Array': '__I32__',
  'Float32Array': '__F32__',
  'Float64Array': '__F64__',
  'Math.imul': '__im__',
  'Math.fround': '__f__',
}
var STDLIB_TYPES = {
  'acos': ['Math.acos', 'double', 'double'],
  'asin': ['Math.asin', 'double', 'double'],
  'atan': ['Math.atan', 'double', 'double'],
  'cos': ['Math.cos', 'double', 'double'],
  'sin': ['Math.sin', 'double', 'double'],
  'tan': ['Math.tan', 'double', 'double'],
  'exp': ['Math.exp', 'double', 'double'],
  'log': ['Math.log', 'double', 'double'],
  'ceil': ['Math.ceil', 'double', 'double'],
  'floor': ['Math.floor', 'double', 'double'],
  'sqrt': ['Math.sqrt', 'double', 'double'],
  'abs': ['Math.abs', 'int', 'int'],
  'fabs': ['Math.abs', 'double', 'double'],
  'atan2': ['Math.atan2', 'double', 'double', 'double'],
  'pow': ['Math.pow', 'double', 'double', 'double'],
  'M_E': ['Math.E', 'double'],
  'M_LN10': ['Math.LN10', 'double'],
  'M_LN2': ['Math.LN2', 'double'],
  'M_LOG2E': ['Math.LOG2E', 'double'],
  'M_LOG10E': ['Math.LOG10E', 'double'],
  'M_PI': ['Math.PI', 'double'],
  'M_SQRT1_2': ['Math.SQRT1_2', 'double'],
  'M_SQRT2': ['Math.SQRT2', 'double'],
  'INFINITY': ['Infinity', 'double'],
  'NAN': ['NaN', 'double'],
}

var imulStr = (str) => {
  return STDLIB_PRESERVE['Math.imul'] + '(' + str + ')'
}

var froundStr = (str) => {
  return STDLIB_PRESERVE['Math.fround'] + '(' + str + ')'
}

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
  // evaluate static values
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

var checkTypeConvertable = function(targetType, sourceType){
  // check whether types are convertable in asm form (numeric types or same pointer types)
  if(targetType.pointer) {
    if(targetType.pointer !== sourceType.pointer || targetType.struct !== sourceType.struct
      || ((targetType.struct || targetType.pointer) && targetType.name !== sourceType.name)
      || (!sourceType.struct && !sourceType.pointer && (sourceType.name === 'void' || sourceType.name === 'char'))
    ) {
      throw new CompilationError('Convert from incompatible types', targetType.location)
    }
  }
}

var convertTypeAndDef = function(targetType, sourceType, value){
  // convert type of literal value and combine it with type info
  checkTypeConvertable(targetType, sourceType)
  var targetTypeName = targetType.name
  if(targetType.pointer) targetTypeName = 'int'
  if(targetTypeName === 'int') return String(Math.floor(value))
  if(targetTypeName === 'double') {
    let str = String(value)
    if(str.indexOf('.') < 0) str += '.0'
    return str
  }
  if(targetTypeName === 'float') return froundStr(value)
  throw new CompilationError('Convert to invalid types', targetType.location)
}

var convertTypeStr = function(targetType, sourceType, str){
  // convert type
  checkTypeConvertable(targetType, sourceType)
  var targetTypeName = targetType.name
  if(targetTypeName.pointer) targetTypeName = 'int'
  var sourceTypeName = sourceType.name
  if(sourceTypeName.pointer) sourceTypeName = 'int'
  if(targetTypeName === sourceTypeName) return str
  if(targetTypeName === 'int' && sourceTypeName === 'float') return '~~floor(+(' + str + '))'
  if(targetTypeName === 'int' && sourceTypeName === 'double') return '~~floor(' + str + ')'
  if(targetTypeName === 'float' && sourceTypeName === 'int') return froundStr('(' + str + ')|0')
  if(targetTypeName === 'float' && sourceTypeName === 'double') return froundStr(str)
  if(targetTypeName === 'double' && sourceTypeName === 'int') return '+((' + str + ')|0)'
  if(targetTypeName === 'double' && sourceTypeName === 'float') return '+(' + str + ')'
  throw new CompilationError('Invalid return value types', targetType.location)
}

var argumentTypeDef = function(typeInfo, name){
  // combine argument names with type
  if(typeInfo.struct && !typeInfo.pointer) {
    throw new CompilationError('Function arguments cannot be struct values', typeInfo.location)
  }
  if((typeInfo.name === 'void' || typeInfo.name === 'char') && !typeInfo.pointer) {
    throw new CompilationError('Function arguments cannot be char or void types', typeInfo.location)
  }
  var typeName = typeInfo.name
  if(typeInfo.pointer) typeName = 'int'
  if(typeName === 'int') return name + '|0'
  if(typeName === 'double') return '+' + name
  if(typeName === 'float') return froundStr(name)
  throw new CompilationError('Invalid argument types', typeInfo.location)
}

// expressions

var generateExpWithType = (item, info) => {
  // TODO
  return evaluateStaticValue(item, info)
}

// statements

var generateReturn = (item, info, funcType) => {
  if(funcType.struct && !funcType.pointer) {
    throw new CompilationError('Return value type cannot be struct values', funcType.location)
  }
  if((funcType.name === 'void' || funcType.name === 'char') && !typeInfo.pointer) {
    throw new CompilationError('Return value type cannot be char or void types', funcType.location)
  }
  var {type, value} = generateExpWithType(item.body, info)
  return 'return ' + convertTypeStr(funcType, type, value) + ';'
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
  var retArr = []
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
    info.statics[name] = {
      type: typeInfo,
      value: valueInfo.value,
    }
    retArr.push(name + '=' + convertTypeAndDef(typeInfo, valueInfo.type, valueInfo.value))
  })
  return 'var ' + retArr.join(',') + ';'
}

var generateFunction = (item, info) => {
  var typeInfo = item.type
  var name = item.name
  var argsNameArr = []
  var argsInitStr = []
  item.args.forEach((item) => {
    argsNameArr.push(item.name)
    argsInitStr += item.name + '=' + argumentTypeDef(item.type, item.name) + ';'
  })
  var bodyStr = ''
  item.body.forEach((item) => {
    // TODO
    if(item.op === 'return') {
      bodyStr += generateReturn(item, info, typeInfo)
    }
  })
  info.functions[name] = {
    type: typeInfo,
    args: item.args,
  }
  return 'function ' + name + '(' + argsNameArr.join(',') + '){' + argsInitStr + bodyStr + '}'
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
      if(!item.static) info.exports.push(item.name)
    }
  })
  ret += 'return{' + info.exports.map((item) => item + ':' + item).join(',') + '}'
  return ret
}

var stdlibStr = () => {
  var map = {}
  var k = ''
  for(k in STDLIB_PRESERVE) {
    map[STDLIB_PRESERVE[k]] = k
  }
  for(k in STDLIB_TYPES) {
    map[k] = STDLIB_TYPES[k][0]
  }
  var ret = ''
  for(k in map) {
    ret += 'var ' + k + '=stdlib.' + map[k] + ';'
  }
  return ret
}

module.exports = function(tree, bareMode){
  if(bareMode) return generateTree(tree)
  return 'function asmModule(stdlib,foreign,heap){"use asm";' + stdlibStr() + generateTree(tree) + '}'
}
