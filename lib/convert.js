var CompilationError = require('./error-obj').CompilationError
var consts = require('./consts')

var OP = consts.ASM_OP
var STDLIB_ARRAY_BUFFERS = consts.STDLIB_ARRAY_BUFFERS
var STDLIB_PRESERVE = consts.STDLIB_PRESERVE

var POINTER_SIZE = 4
var INT_SIZE = 4
var DOUBLE_SIZE = 8
var FLOAT_SIZE = 4

var DEFAULT_FUNC_VAR_VALUE = 0
var INT_TYPE = {
  struct: false,
  name: 'int',
  unsigned: false,
  pointer: false,
}
var UNSIGNED_INT_TYPE = {
  struct: false,
  name: 'int',
  unsigned: true,
  pointer: false,
}
var DOUBLE_TYPE = {
  struct: false,
  name: 'double',
  unsigned: false,
  pointer: false,
}
var DEFAULT_FUNC_VAR_TYPE = INT_TYPE

var LITERAL_ZERO = { op: OP.LITERAL, body: '0' }

// utils

var mangleNameByIndex = (index) => {
  var ret = ''
  var first = index % 52
  if(first < 26) ret = String.fromCharCode(first + 65)
  else ret = String.fromCharCode(first - 26 + 97)
  for(index = index / 52 | 0; index; index = index / 63 | 0) {
    var next = index % 63
    if(next < 26) ret += String.fromCharCode(first + 65)
    else if(next < 52) ret += String.fromCharCode(first - 26 + 97)
    else if(next < 62) ret += String.fromCharCode(first - 52 + 48)
    else ret += '_'
  }
  return ret
}

var froundTree = (body) => {
  return {
    op: OP.CALL,
    name: STDLIB_PRESERVE['Math.fround'],
    body: [body]
  }
}

var imulTree = (left, right) => {
  return {
    op: OP.CALL,
    name: STDLIB_PRESERVE['Math.imul'],
    body: [left, right]
  }
}

var cloneTypeInfo = (typeInfo) => {
  let newTypeInfo = {}
  for(let k in typeInfo) newTypeInfo[k] = typeInfo[k]
  return newTypeInfo
}

var getVarStrWithType = (item, name, info, funcInfo) => {
  var varInfo = funcInfo.vars[name] || funcInfo.args[name] || info.statics[name]
  if(!varInfo) throw new CompilationError('Variable is not defined: ' + name, item.location)
  var typeInfo = cloneTypeInfo(varInfo.type)
  typeInfo.unnormalized = true
  return {
    type: typeInfo,
    tree: {
      op: OP.VAR,
      body: varInfo.rename
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
    if(targetType.pointer !== sourceType.pointer
      || targetType.struct !== sourceType.struct
      || ((targetType.struct || targetType.pointer) && targetType.name !== sourceType.name)
      || (!sourceType.struct && !sourceType.pointer && (sourceType.name === 'void' || targetType.name === 'void' || sourceType.name === 'char' || targetType.name === 'char'))
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
  if(targetTypeName === 'int') return { op: OP.LITERAL, body: String(Math.floor(value)) }
  if(targetTypeName === 'double') {
    let str = String(value)
    if(str.indexOf('.') < 0) str += '.0'
    return {
      op: OP.LITERAL,
      body: str
    }
  }
  if(targetTypeName === 'float') return froundTree({ op: OP.LITERAL, body: String(value) })
  throw new CompilationError('Convert to invalid types', targetType.location)
}

var convertType = (targetType, sourceType, body) => {
  // convert type
  checkTypeConvertable(targetType, sourceType)
  var targetTypeName = targetType.name
  if(targetType.pointer) targetTypeName = 'int'
  var sourceTypeName = sourceType.name
  if(sourceType.pointer) sourceTypeName = 'int'
  if(targetTypeName === sourceTypeName) {
    if(sourceType.unnormalized && !targetType.unnormalized) {
      if(targetTypeName === 'int') return { op: OP.BIT_OR, left: body, right: LITERAL_ZERO }
      if(targetTypeName === 'float') return froundTree(body)
      if(targetTypeName === 'double') return { op: OP.POSITIVE, body }
    }
    return body
  }
  if(targetTypeName === 'int') {
    if(sourceType.unnormalized || sourceTypeName === 'float') {
      body = { op: OP.POSITIVE, body }
    }
    return { op: OP.BIT_REVERT, body: { op: OP.BIT_REVERT, body: { op: OP.CALL, name: STDLIB_PRESERVE['Math.floor'], body: [body] } } }
  }
  if(targetTypeName === 'double') {
    if(sourceTypeName === 'int' && sourceType.unnormalized) {
      body = { op: OP.BIT_OR, left: body, right: LITERAL_ZERO }
    }
    return { op: OP.POSITIVE, body }
  }
  if(targetTypeName === 'float') {
    if(sourceTypeName === 'int' && sourceType.unnormalized) {
      body = { op: OP.BIT_OR, left: body, right: LITERAL_ZERO }
    }
    return froundTree(body)
  }
  throw new CompilationError('Invalid type conversion', targetType.location)
}

var alignType = (leftType, rightType) => {
  checkTypeConvertable(leftType, rightType)
  if(rightType.pointer) throw new CompilationError('Pointer values are not accepted', rightType.location)
  var leftTypeName = leftType.name
  var rightTypeName = rightType.name
  var alignedType = {
    struct: false,
    name: 'int',
    unsigned: false,
    pointer: false,
  }
  if(leftTypeName === 'double' || rightTypeName === 'double') {
    alignedType.name = 'double'
  } else if(leftTypeName === 'float' && rightTypeName === 'float') {
    alignedType.name = 'float'
  } else if(leftTypeName === 'int' && rightTypeName === 'int') {
    alignedType.unsigned = leftType.unsigned || rightType.unsigned
  }
  return alignedType
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
  var name = varInfo.tree
  var typeInfo = varInfo.type
  var offsetArr = []
  var offsetValue = 0
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
      let childTree = convertType(INT_TYPE, child.type, child.tree)
      typeInfo = cloneTypeInfo(typeInfo)
      typeInfo.pointer --
      var size = getTypeSize(typeInfo, info)
      offsetArr.push(imulTree({ op: OP.LITERAL, body: size }, childTree))
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
      offsetValue += field.offset
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
  // wrap numbers
  heapShift = {
    op: OP.LITERAL,
    body: heapShift
  }
  offsetValue = {
    op: OP.LITERAL,
    body: offsetValue
  }
  // generate body
  var plusLeft = offsetValue.body ? { op: OP.PLUS, left: name, right: offsetValue } : name
  offsetArr.forEach((item) => {
    plusLeft = { op: OP.PLUS, left: plusLeft, right: item }
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

var commaWithType = (item, info, funcInfo) => {
  // TODO
}

var assignmentWithType = (item, info, funcInfo) => {
  var left = item.left.op === 'var' ? varWithType(item.left, info, funcInfo) : memberOpWithType(item.left, info, funcInfo)
  var right = expWithType(item.right, info, funcInfo)
  if(item.left.op === 'var') left.type.unnormalized = false
  return {
    type: left.type,
    tree: {
      op: OP.ASSIGN,
      left: left.tree,
      right: convertType(left.type, right.type, right.tree)
    }
  }
}

var conditionWithType = (item, info, funcInfo) => {
  // TODO
}

var logicWithType = (item, info, funcInfo) => {
  // TODO
}

var bitWithType = (item, info, funcInfo) => {
  // TODO
}

var equalityWithType = (item, info, funcInfo) => {
  // TODO
}

var relationWithType = (item, info, funcInfo) => {
  // TODO
}

var shiftWithType = (item, info, funcInfo) => {
  // TODO
}

var addWithType = (item, info, funcInfo) => {
  var left = expWithType(item.left, info, funcInfo)
  var right = expWithType(item.right, info, funcInfo)
  if(left.type.pointer) {
    var unrefType = cloneTypeInfo(left.type)
    unrefType.pointer --
    return {
      type: left.type,
      tree: {
        op: item.op === '+' ? OP.PLUS : OP.MINUS,
        left: left.tree,
        right: imulTree(convertType(INT_TYPE, right.type, right.tree), { op: OP.LITERAL, body: String(getTypeSize(unrefType, info)) }),
      }
    }
  }
  var typeInfo = alignType(left.type, right.type)
  typeInfo.unnormalized = true
  return {
    type: typeInfo,
    tree: {
      op: item.op === '+' ? OP.PLUS : OP.MINUS,
      left: convertType(typeInfo, left.type, left.tree),
      right: convertType(typeInfo, right.type, right.tree),
    },
  }
}

var multiWithType = (item, info, funcInfo) => {
  var left = expWithType(item.left, info, funcInfo)
  var right = expWithType(item.right, info, funcInfo)
  var typeInfo = alignType(left.type, right.type)
  if(typeInfo.name === 'int') {
    // for integers
    if(item.op === '*') {
      var imulTypeInfo = cloneTypeInfo(typeInfo)
      imulTypeInfo.unnormalized = true
      let treeLeft = convertType(imulTypeInfo, left.type, left.tree)
      let treeRight = convertType(imulTypeInfo, right.type, right.tree)
      return {
        type: typeInfo,
        tree: imulTree(treeLeft, treeRight)
      }
    }
    let treeLeft = convertType(DOUBLE_TYPE, left.type, left.tree)
    let treeRight = convertType(DOUBLE_TYPE, right.type, right.tree)
    return {
      type: typeInfo,
      tree: convertType(typeInfo, DOUBLE_TYPE, {
        op: {'/': OP.DIV, '%': OP.MOD}[item.op],
        left: treeLeft,
        right: treeRight
      }),
    }
  }
  if(item.op === '%') throw new CompilationError('Mod operators can only used between integers', item.location)
  if(typeInfo.name === 'float') typeInfo.unnormalized = true
  var treeLeft = convertType(typeInfo, left.type, left.tree)
  var treeRight = convertType(typeInfo, right.type, right.tree)
  return {
    type: typeInfo,
    tree: {
      op: {'*': OP.MULTI, '/': OP.DIV, '%': OP.MOD}[item.op],
      left: treeLeft,
      right: treeRight
    },
  }
}

var unaryWithType = (item, info, funcInfo) => {
  var child = expWithType(item.body, info, funcInfo)
  var typeInfo = child.type
  if(typeInfo.pointer || typeInfo.struct || typeInfo.name === 'char' || typeInfo.name === 'void') {
    throw new CompilationError('Only numeric values are accepted', item.body.location)
  }
  if(item.op === '+n') return child
  if(item.op === '-n') {
    return {
      type: typeInfo,
      tree: {
        op: OP.NEGATIVE,
        body: child.body,
      }
    }
  }
  if(item.op === '~n') {
    return {
      type: typeInfo,
      tree: {
        op: OP.BIT_REVERT,
        body: convertType(INT_TYPE, typeInfo, child.body)
      }
    }
  }
  if(item.op === '!n') {
    return {
      type: typeInfo,
      tree: {
        op: OP.BIT_REVERT,
        body: convertType(INT_TYPE, typeInfo, child.body)
      }
    }
  }
}

var castWithType = (item, info, funcInfo) => {
  var child = expWithType(item.body, info, funcInfo)
  var sourceType = child.type
  var targetType = item.type
  if(sourceType.pointer) {
    sourceType = UNSIGNED_INT_TYPE
    if(sourceType.unnormalized) {
      sourceType = cloneTypeInfo(sourceType)
      sourceType.unnormalized = true
    }
  }
  if(targetType.pointer) targetType = UNSIGNED_INT_TYPE
  return {
    type: item.type,
    tree: convertType(targetType, sourceType, child.tree)
  }
}

var callWithType = (item, info, funcInfo) => {
  // TODO handling math funcs
  if(funcInfo.vars[item.name] || funcInfo.args[item.name]) throw new CompilationError('Not a function: ' + item.name, item.location)
  var func = info.functions[item.name]
  if(!func) throw new CompilationError('No such function: ' + item.name, item.location)
  var body = []
  item.args.forEach((item, i) => {
    var argName = func.argsOrder[i]
    if(!argName) throw new CompilationError('Too many arguments', item.location)
    var {type, tree} = expWithType(item, info, funcInfo)
    body.push(convertType(func.args[argName].type, type, tree))
  })
  body = {
    op: OP.CALL,
    name: func.rename,
    body
  }
  var typeName = func.type.name
  if(typeName === 'double') body = { op: OP.POSITIVE, body }
  else if(typeName === 'float') body = froundTree(body)
  else body = { op: OP.BIT_OR, left: body, right: LITERAL_ZERO }
  return {
    type: func.type,
    tree: body
  }
}

var expWithType = (item, info, funcInfo) => {
  if(item.op === ',') return commaWithType(item, info, funcInfo)
  if(item.op === '=') return assignmentWithType(item, info, funcInfo)
  if(item.op === '?!') return conditionWithType(item, info, funcInfo)
  if(item.op === '||' || item.op === '&&') return logicWithType(item, info, funcInfo)
  if(item.op === '|' || item.op === '&' || item.op === '^') return bitWithType(item, info, funcInfo)
  if(item.op === '==' || item.op === '!=') return equalityWithType(item, info, funcInfo)
  if(item.op === '<' || item.op === '>' || item.op === '<=' || item.op === '>=') return relationWithType(item, info, funcInfo)
  if(item.op === '<<' || item.op === '>>') return shiftWithType(item, info, funcInfo)
  if(item.op === '+' || item.op === '-') return addWithType(item, info, funcInfo)
  if(item.op === '*' || item.op === '/' || item.op === '%') return multiWithType(item, info, funcInfo)
  if(item.op === '+n' || item.op === '-n' || item.op === '!n' || item.op === '~n') return unaryWithType(item, info, funcInfo)
  if(item.op === 'cast') return castWithType(item, info, funcInfo)
  if(item.op === 'f()') return callWithType(item, info, funcInfo)
  if(item.op === 'var') return varWithType(item, info, funcInfo)
  if(item.op === 'member') return memberOpWithType(item, info, funcInfo)
  if(item.op === '()') return expWithType(item.body, info, funcInfo)
  var valueInfo = evaluateStaticValue(item, info, funcInfo)
  return {
    type: valueInfo.type,
    tree: convertTypeAndDef(valueInfo.type, valueInfo.type, valueInfo.value)
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
  var {type, tree} = expWithType(item.body, info, funcInfo)
  return { op: OP.RETURN, body: convertType(funcType, type, tree) }
}

var defStatement = (item, info, funcInfo) => {
  var initArr = []
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
    if(funcInfo.args[name]) throw new CompilationError('Function variable names should not conflict with argument names', item.location)
    var valueInfo = evaluateStaticValue(item.value, info, false)
    var rename = mangleNameByIndex(funcInfo.nameCount++)
    if(valueInfo) {
      let valueStr = convertTypeAndDef(typeInfo, valueInfo.type, valueInfo.value)
      funcInfo.vars[name] = {
        rename,
        type: typeInfo,
        value: valueInfo.value,
        valueStr
      }
    } else {
      let exp = expWithType(item.value, info, funcInfo)
      initArr.push({ op: OP.ASSIGN, left: { op: OP.VAR, body: rename }, right: convertType(typeInfo, exp.type, exp.tree) })
      let valueStr = convertTypeAndDef(typeInfo, DEFAULT_FUNC_VAR_TYPE, DEFAULT_FUNC_VAR_VALUE)
      funcInfo.vars[name] = {
        rename,
        type: typeInfo,
        value: DEFAULT_FUNC_VAR_VALUE,
        valueStr
      }
    }
  })
  return initArr.length ? { op: OP.HIDDEN_BLOCK, body: initArr } : { op: OP.EMPTY }
}

var ifWithReturnInfo = (item, info, funcInfo) => {
  var cond = expWithType(item.cond, info, funcInfo)
  var left = sentenceOrBlockWithReturnInfo(item.body, info, funcInfo)
  var right = item.elseBody ? sentenceOrBlockWithReturnInfo(item.elseBody, info, funcInfo) : null
  return {
    hasReturn: false,
    tree: {
      op: OP.IF,
      cond: convertType(INT_TYPE, cond.type, cond.tree),
      left: left.tree,
      right: right ? right.tree : null,
    }
  }
}

var whileWithReturnInfo = (item, info, funcInfo) => {
  var cond = expWithType(item.cond, info, funcInfo)
  var {tree} = sentenceOrBlockWithReturnInfo(item.body, info, funcInfo)
  return {
    hasReturn: false,
    tree: {
      op: OP.WHILE,
      cond: convertType(INT_TYPE, cond.type, cond.tree),
      body: tree,
    }
  }
}

var forWithReturnInfo = (item, info, funcInfo) => {
  var init = item.init ? expWithType(item.init, info, funcInfo).tree : null
  var cond = item.cond ? expWithType(item.cond, info, funcInfo).tree : null
  var step = item.step ? expWithType(item.step, info, funcInfo).tree : null
  var {tree} = sentenceOrBlockWithReturnInfo(item.body, info, funcInfo)
  return {
    hasReturn: false,
    tree: {
      op: OP.FOR,
      init,
      cond,
      step,
      body: tree,
    }
  }
}

var sentenceWithReturnInfo = (item, info, funcInfo) => {
  switch(item.op) {
    case 'return':
      return {
        hasReturn: true,
        tree: returnStatement(item, info, funcInfo),
      }
    case 'def':
      return {
        hasReturn: false,
        tree: defStatement(item, info, funcInfo)
      }
    case 'if':
      return ifWithReturnInfo(item, info, funcInfo)
    case 'while':
      return whileWithReturnInfo(item, info, funcInfo)
    case 'for':
      return forWithReturnInfo(item, info, funcInfo)
    case 'break':
      return {
        hasReturn: false,
        tree: { op: OP.BREAK },
      }
    case 'continue':
      return {
        hasReturn: false,
        tree: { op: OP.CONTINUE },
      }
    default:
      return {
        hasReturn: false,
        tree: expWithType(item, info, funcInfo).tree
      }
  }
}

var blockWithReturnInfo = (item, info, funcInfo) => {
  var hasReturn = false
  var body = []
  item.body.forEach((item) => {
    if(item.op === '{}') {
      let child = blockWithReturnInfo(item, info, funcInfo)
      body.push.apply(body, child.tree)
      if(child.hasReturn) hasReturn = true
    } else {
      let child = sentenceWithReturnInfo(item, info, funcInfo)
      body.push(child.tree)
      if(child.hasReturn) hasReturn = true
    }
  })
  return {
    hasReturn,
    tree: {
      op: OP.BLOCK,
      body,
    },
  }
}

var sentenceOrBlockWithReturnInfo = (item, info, funcInfo) => {
  if(item.op === '{}') {
    return blockWithReturnInfo(item, info, funcInfo)
  }
  return sentenceWithReturnInfo(item, info, funcInfo)
}

// overall structures

var parseStruct = (item, info) => {
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

var parseStatic = (item, info) => {
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
    var rename = '_' + mangleNameByIndex(info.nameCount++)
    info.statics[name] = {
      rename,
      type: typeInfo,
      value: valueInfo.value,
      valueStr
    }
  })
}

var parseFunction = (item, info) => {
  var typeInfo = item.type
  if(typeInfo.struct && !typeInfo.pointer) {
    throw new CompilationError('Function types cannot be structs', typeInfo.location)
  }
  if((typeInfo.name === 'void' || typeInfo.name === 'char') && !typeInfo.pointer) {
    throw new CompilationError('Function types cannot be char or void', typeInfo.location)
  }
  var name = item.name
  var argsOrder = []
  var args = Object.create(null)
  var nameCount = 0
  item.args.forEach((item) => {
    var rename = mangleNameByIndex(nameCount++)
    argsOrder.push(item.name)
    args[item.name] = {
      rename,
      type: item.type,
      body: argumentTypeDef(item.type, rename)
    }
  })
  var funcInfo = info.functions[name] = {
    rename: '_' + mangleNameByIndex(info.nameCount++),
    type: typeInfo,
    args,
    argsOrder,
    nameCount,
    vars: Object.create(null),
    body: null
  }
  var {hasReturn, tree} = blockWithReturnInfo(item, info, funcInfo)
  tree.op = OP.HIDDEN_BLOCK
  if(!hasReturn) throw new CompilationError('Functions should always return', item.location)
  funcInfo.body = tree
}

exports.tree = (tree) => {
  var info = {
    exports: [],
    nameCount: 0,
    structs: Object.create(null),
    statics: Object.create(null),
    functions: Object.create(null),
  }
  tree.body.forEach((item) => {
    if(item.op === 'struct') {
      parseStruct(item, info)
    } else if(item.op === 'static') {
      parseStatic(item, info)
    } else if(item.op === 'function') {
      parseFunction(item, info)
      if(!item.static) info.exports.push(item.name)
    }
  })
  return info
}
