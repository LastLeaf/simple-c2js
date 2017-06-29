var CompilationError = require('./error-obj').CompilationError
var consts = require('./consts')

var OP = consts.ASM_OP
var STDLIB_ARRAY_BUFFERS = consts.STDLIB_ARRAY_BUFFERS
var STDLIB_PRESERVE = consts.STDLIB_PRESERVE
var STDLIB_TYPES = consts.STDLIB_TYPES

var POINTER_SIZE = 4
var INT_SIZE = 4
var DOUBLE_SIZE = 8
var FLOAT_SIZE = 4

var DEFAULT_FUNC_VAR_VALUE = 0
var INT_TYPE = {
  struct: false,
  name: 'int',
  pointer: false,
}
var DEFAULT_FUNC_VAR_TYPE = INT_TYPE

var LITERAL_ZERO = { op: OP.LITERAL, body: '0' }

// utils

var froundTree = (body) => {
  return {
    op: OP.CALL,
    name: STDLIB_PRESERVE['Math.fround'],
    body: body
  }
}

var imulTree = (body) => {
  return {
    op: OP.CALL,
    name: STDLIB_PRESERVE['Math.imul'],
    body: body
  }
}

var cloneTypeInfo = (typeInfo) => {
  let newTypeInfo = {}
  for(let k in typeInfo) newTypeInfo[k] = typeInfo[k]
  return newTypeInfo
}

var getVarStrWithType = (item, name, info, funcInfo) => {
  var varInfo = funcInfo.vars[name] || info.statics[name]
  if(!varInfo) throw new CompilationError('Variable is not defined: ' + name, item.location)
  return {
    type: varInfo.type,
    tree: {
      op: OP.VAR,
      body: varInfo.mangle || name
    },
  }
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

var evaluateStaticValue = (item, info, throwOnNonConstant) => {
  // evaluate static values
  var type = {
    struct: false,
    unsigned: false,
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
      if(throwOnNonConstant) throw new CompilationError('Non-constant values are not accepted', item.location)
      return null
  }
  return {
    type,
    value,
  }
}

var checkTypeConvertable = (targetType, sourceType) => {
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

// value conversion

var convertTypeAndDef = (targetType, sourceType, value) => {
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
  if(targetTypeName === 'float') return froundTree(value)
  throw new CompilationError('Convert to invalid types', targetType.location)
}

var convertTypeStr = (targetType, sourceType, body) => {
  // convert type
  checkTypeConvertable(targetType, sourceType)
  var targetTypeName = targetType.name
  if(targetTypeName.pointer) targetTypeName = 'int'
  var sourceTypeName = sourceType.name
  if(sourceTypeName.pointer) sourceTypeName = 'int'
  if(targetTypeName === sourceTypeName) {
    if(sourceType.unnormalized && !targetTypeName.unnormalized) {
      if(targetTypeName === 'int') return { op: '|', left: body, right: LITERAL_ZERO }
      if(targetTypeName === 'float') return froundTree(body)
      if(targetTypeName === 'double') return { op: OP.POSITIVE, body }
    }
    return body
  }
  if(targetTypeName === 'int' && sourceTypeName === 'float') return { op: OP.BIT_REVERT, body: { op: OP.BIT_REVERT, body: { op: OP.CALL, name: 'floor', body: { op: OP.POSITIVE, body } } } }
  if(targetTypeName === 'int' && sourceTypeName === 'double') return { op: OP.BIT_REVERT, body: { op: OP.BIT_REVERT, body: { op: OP.CALL, name: 'floor', body } } }
  if(targetTypeName === 'float' && sourceTypeName === 'int') return froundTree({ op: '|', left: body, right: LITERAL_ZERO })
  if(targetTypeName === 'float' && sourceTypeName === 'double') return froundTree(body)
  if(targetTypeName === 'double' && sourceTypeName === 'int') return { op: OP.POSITIVE, body: { op: '|', left: body, right: LITERAL_ZERO } }
  if(targetTypeName === 'double' && sourceTypeName === 'float') return { op: OP.POSITIVE, body }
  throw new CompilationError('Invalid type conversion', targetType.location)
}

var argumentTypeDef = (typeInfo, name) => {
  // combine argument names with type
  if(typeInfo.struct && !typeInfo.pointer) {
    throw new CompilationError('Function arguments cannot be struct values', typeInfo.location)
  }
  if((typeInfo.name === 'void' || typeInfo.name === 'char') && !typeInfo.pointer) {
    throw new CompilationError('Function arguments cannot be char or void types', typeInfo.location)
  }
  var typeName = typeInfo.name
  if(typeInfo.pointer) typeName = 'int'
  var body = { op: OP.VAR, body: name }
  if(typeName === 'int') return { op: OP.BIT_OR, left: body, right: LITERAL_ZERO }
  if(typeName === 'double') return { op: OP.POSITIVE, body }
  if(typeName === 'float') return froundTree(body)
  throw new CompilationError('Invalid argument types', typeInfo.location)
}

// variable

var varWithType = function(item, info, funcInfo){
  return getVarStrWithType(item, item.name, info, funcInfo)
}

var memberOpWithType = function(item, info, funcInfo){
  var varInfo = getVarStrWithType(item, item.body[0], info, funcInfo)
  var name = varInfo.body
  var typeInfo = varInfo.type
  var offsetArr = []
  // convert to offset
  item.body.forEach((item, i) => {
    if(i === 0) return
    if(item.op === '[]') {
      let child = expWithType(item.body, info, funcInfo)
      if(!typeInfo.pointer) {
        throw new CompilationError('Illigal "[]" on non-pointers', item.location)
      }
      if(child.type.name !== 'int' && child.type.name !== 'float' && child.type.name !== 'double') {
        throw new CompilationError('Array indexes should be numeric', item.location)
      }
      let childStr = convertTypeStr(INT_TYPE, child.type, child.str)
      typeInfo = cloneTypeInfo(typeInfo)
      typeInfo.pointer --
      var size = getTypeSize(typeInfo, info)
      offsetArr.push(imulTree(size, childStr))
    } else {
      if(item.op === '.' && (!typeInfo.struct || typeInfo.pointer !== 0)) {
        throw new CompilationError('Illigal "." on non-structs', item.location)
      }
      if(item.op === '->' && (!typeInfo.struct || typeInfo.pointer !== 1)) {
        throw new CompilationError('Illigal "->" on non-struct pointers', item.location)
      }
      var structDef = info.structs[typeInfo.name]
      var field = structDef.fieldMap[item.body]
      if(!field) throw new CompilationError('Field is not found: ' + item.body, item.location)
      if(field.offset !== 0) {
        if(typeof(offsetArr[offsetArr.length - 1]) === 'number') {
          offsetArr[offsetArr.length - 1] += field.offset
        } else {
          offsetArr.push(field.offset)
        }
      }
      typeInfo = field.type
    }
  })
  // find suitable array buffer
  var heapType = STDLIB_ARRAY_BUFFERS.Int32Array
  var heapShift = 2
  if(typeInfo.pointer) {
    heapType = STDLIB_ARRAY_BUFFERS.Uint32Array
  } else if(typeInfo.struct) {
    throw new CompilationError('Invalid usage of struct values', item.location)
  } else if(typeInfo.name === 'char') {
    if(typeInfo.unsigned) heapType = STDLIB_ARRAY_BUFFERS.Uint8Array
    else heapType = STDLIB_ARRAY_BUFFERS.Int8Array
    heapShift = 0
  } else if(typeInfo.name === 'double') {
    heapType = STDLIB_ARRAY_BUFFERS.Float64Array
    heapShift = 3
  } else if(typeInfo.name === 'float') {
    heapType = STDLIB_ARRAY_BUFFERS.Float32Array
  } else if(typeInfo.name === 'int') {
    if(typeInfo.unsigned) heapType = STDLIB_ARRAY_BUFFERS.Uint32Array
  } else {
    throw new CompilationError('Invalid value types', item.location)
  }
  // generate body
  var plusLeft = { op: OP.VAR, body: name }
  offsetArr.forEach((item) => {
    var subtree = null
    if(typeof(item) === 'number') subtree = { op: OP.LITERAL, body: item }
    else subtree = item
    plusLeft = { op: OP.BIT_OR, left: plusLeft, right: subtree }
  })
  var body = {
    op: OP.RIGHT_SHIFT,
    left: {
      op: OP.RIGHT_SHIFT,
      left: {
        op: OP.LEFT_SHIFT,
        left: plusLeft,
        right: heapShift,
      },
      right: heapShift,
    },
    right: heapShift,
  }
  // generate type and tree
  typeInfo = cloneTypeInfo(typeInfo)
  typeInfo.unnormalized = true
  return {
    type: typeInfo,
    tree: {
      op: OP.ARRAY_MEMBER,
      name: heapType,
      body
    }
  }
}

// expression operators

var assignmentWithType = (item, info, funcInfo) => {
  var left = item.left.op === '=' ? varWithType(item.left, info, funcInfo) : memberOpWithType(item.left, info, funcInfo)
  var right = expWithType(item.right, info, funcInfo)
  return {
    type: left.type,
    str: left.str + '=' + convertTypeStr(left.type, right.type, right.str)
  }
}

var addWithType = (item, info, funcInfo) => {
  // TODO
}

var multiWithType = (item, info, funcInfo) => {
  // TODO
}

var expWithType = (item, info, funcInfo) => {
  if(item.op === '=') return assignmentWithType(item, info, funcInfo)
  if(item.op === '+-') return addWithType(item, info, funcInfo)
  if(item.op === '*/%') return multiWithType(item, info, funcInfo)
  if(item.op === 'var') return varWithType(item, info, funcInfo)
  if(item.op === 'member') return memberOpWithType(item, info, funcInfo)
  var valueInfo = evaluateStaticValue(item, info, funcInfo)
  return {
    type: valueInfo.type,
    tree: {
      op: OP.LITERAL,
      body: String(valueInfo.value)
    }
  }
}

// statements

var returnStatement = (item, info, funcInfo) => {
  var funcType = funcInfo.type
  if(funcType.struct && !funcType.pointer) {
    throw new CompilationError('Return value type cannot be struct values', funcType.location)
  }
  if((funcType.name === 'void' || funcType.name === 'char') && !funcType.pointer) {
    throw new CompilationError('Return value type cannot be char or void types', funcType.location)
  }
  var {type, str} = expWithType(item.body, info, funcInfo)
  return { op: OP.RETURN, body: convertTypeStr(funcType, type, str) }
}

var defStatement = (item, info, funcInfo) => {
  var retArr = []
  var typeInfo = item.type
  if(typeInfo.struct && !typeInfo.pointer) {
    throw new CompilationError('Function variables cannot be struct values', item.location)
  }
  if((typeInfo.name === 'void' || typeInfo.name === 'char') && !typeInfo.pointer) {
    throw new CompilationError('Function variables cannot be char or void types', item.location)
  }
  item.body.forEach((item) => {
    var name = item.name
    if(funcInfo.vars[name]) throw new CompilationError('Duplicated function variable definition', item.location)
    var valueInfo = evaluateStaticValue(item.value, info, false)
    if(valueInfo) {
      let valueStr = convertTypeAndDef(typeInfo, valueInfo.type, valueInfo.value)
      funcInfo.vars[name] = {
        type: typeInfo,
        value: valueInfo.value,
        valueStr
      }
    } else {
      let exp = expWithType(item.value, info, funcInfo)
      // TODO assignment should has type notation
      retArr.push({ name: name, value: convertTypeStr(typeInfo, exp.type, exp.str) })
      let valueStr = convertTypeAndDef(typeInfo, DEFAULT_FUNC_VAR_TYPE, DEFAULT_FUNC_VAR_VALUE)
      funcInfo.vars[name] = {
        type: typeInfo,
        value: DEFAULT_FUNC_VAR_VALUE,
        valueStr
      }
    }
  })
  return retArr.length ? { op: OP.DEF, body: retArr } : { op: OP.EMPTY }
}

var generateIfWithReturnInfo = (item, info, funcInfo) => {
  var condStr = expWithType(item.cond, info, funcInfo).str
  var ifBody = generateSentenceOrBlockWithReturnInfo(item.body, info, funcInfo)
  var elseBody = item.elseBody ? generateSentenceOrBlockWithReturnInfo(item.elseBody, info, funcInfo) : null
  return {
    hasReturn: ifBody.hasReturn && elseBody && elseBody.hasReturn,
    bodyStr: 'if(' + condStr + ')' + ifBody.bodyStr + (elseBody ? 'else ' + elseBody.bodyStr : '')
  }
}

var generateWhileWithReturnInfo = (item, info, funcInfo) => {
  var condStr = expWithType(item.cond, info, funcInfo).str
  var {hasReturn, bodyStr} = generateSentenceOrBlockWithReturnInfo(item.body, info, funcInfo)
  return {
    hasReturn,
    bodyStr: 'while(' + condStr + ')' + bodyStr
  }
}

var generateForWithReturnInfo = (item, info, funcInfo) => {
  var initStr = item.init ? expWithType(item.init, info, funcInfo).str : ''
  var condStr = item.cond ? expWithType(item.cond, info, funcInfo).str : ''
  var stepStr = item.step ? expWithType(item.step, info, funcInfo).str : ''
  var {hasReturn, bodyStr} = generateSentenceOrBlockWithReturnInfo(item.body, info, funcInfo)
  return {
    hasReturn,
    bodyStr: 'for(' + initStr + ';' + condStr + ';' + stepStr + ')' + bodyStr
  }
}

var generateSentenceWithReturnInfo = (item, info, funcInfo) => {
  switch(item.op) {
    case 'return':
      return {
        hasReturn: true,
        bodyStr: returnStatement(item, info, funcInfo),
      }
    case 'def':
      return {
        hasReturn: false,
        bodyStr: defStatement(item, info, funcInfo)
      }
    case 'if':
      return generateIfWithReturnInfo(item, info, funcInfo)
    case 'while':
      return generateWhileWithReturnInfo(item, info, funcInfo)
    case 'for':
      return generateForWithReturnInfo(item, info, funcInfo)
    case 'break':
    case 'continue':
      return {
        hasReturn: false,
        bodyStr: item.op + ';',
      }
    default:
      return {
        hasReturn: false,
        bodyStr: expWithType(item, info, funcInfo).str + ';'
      }
  }
}

var generateSentenceOrBlockWithReturnInfo = (item, info, funcInfo) => {
  if(item.op === '{}') {
    let child = generateSentencesWithReturnInfo(item, info, funcInfo)
    return {
      hasReturn: child.hasReturn,
      bodyStr: '{' + child.bodyStr + '}',
    }
  }
  return generateSentenceWithReturnInfo(item, info, funcInfo)
}

var generateSentencesWithReturnInfo = (item, info, funcInfo) => {
  var bodyStr = ''
  var hasReturn = false
  item.body.forEach((item) => {
    let child = null
    if(item.op === '{}') {
      child = generateSentencesWithReturnInfo(item, info, funcInfo)
    } else {
      child = generateSentenceWithReturnInfo(item, info, funcInfo)
    }
    if(child.hasReturn) hasReturn = true
    bodyStr += child.bodyStr
  })
  return {
    hasReturn,
    bodyStr,
  }
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
    if(size <= 4) offset = Math.ceil(offset / 4) * 4
    else offset = Math.ceil(offset / 8) * 8
    if(typeInfo.count !== 'undefined' && typeInfo.count <= 0) throw new CompilationError('Array size must be positive integer', item.location)
    fieldMap[item.name] = {
      type: typeInfo,
      size,
      offset,
    }
    var totalSize = size * (typeInfo.count || 1)
    offset += totalSize
  })
  offset = Math.ceil(offset / 8) * 8
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
    if(info.statics[name]) throw new CompilationError('Duplicated static variable definition', item.location)
    var valueInfo = evaluateStaticValue(item.value, info, true)
    var valueStr = convertTypeAndDef(typeInfo, valueInfo.type, valueInfo.value)
    info.statics[name] = {
      type: typeInfo,
      value: valueInfo.value,
      valueStr
    }
    retArr.push(name + '=' + valueStr)
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
  var funcInfo = info.functions[name] = {
    type: typeInfo,
    args: item.args,
    vars: {},
  }
  var {hasReturn, bodyStr} = generateSentencesWithReturnInfo(item, info, funcInfo)
  if(!hasReturn) throw new CompilationError('Functions should always return', item.location)
  var varsStr = ''
  if(Object.keys(funcInfo.vars).length) {
    let varsStrArr = []
    for(var k in funcInfo.vars) {
      varsStrArr.push(k + '=' + funcInfo.vars[k].valueStr)
    }
    varsStr = 'var ' + varsStrArr.join(',') + ';'
  }
  return 'function ' + name + '(' + argsNameArr.join(',') + '){' + argsInitStr + varsStr + bodyStr + '}'
}

exports.tree = (tree) => {
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
