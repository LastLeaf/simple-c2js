var consts = require('./consts')

var OP = consts.ASM_OP

// expressions

var stringifyExpWithLevel = (tree, opLevel) => {
  var needBracket = false
  if(opLevel < (tree.op & 0xF0)) needBracket = true
  opLevel = tree.op & 0xF0
  var ret = ''
  switch(tree.op) {
    case OP.EMPTY:
      ret = ''
      break
    case OP.LITERAL:
    case OP.VAR:
      ret = tree.body
      break
    case OP.CALL:
      ret = tree.name + '(' + tree.body.map(item => stringifyExpWithLevel(item, 0xF0)).join(',') + ')'
      break
    case OP.ARRAY_MEMBER:
      ret = tree.name + '[' + stringifyExpWithLevel(tree.body, 0xF0) + ']'
      break
    case OP.POSITIVE:
      ret = '+' + stringifyExpWithLevel(tree.body, opLevel)
      break
    case OP.NEGATIVE:
      ret = '-' + stringifyExpWithLevel(tree.body, opLevel)
      break
    case OP.BIT_REVERT:
      ret = '~' + stringifyExpWithLevel(tree.body, opLevel)
      break
    case OP.REVERT:
      ret = '!' + stringifyExpWithLevel(tree.body, opLevel)
      break
    case OP.MULTI:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '*' + stringifyExpWithLevel(tree.right, opLevel - 0x10)
      break
    case OP.DIV:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '/' + stringifyExpWithLevel(tree.right, opLevel - 0x10)
      break
    case OP.MOD:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '%' + stringifyExpWithLevel(tree.right, opLevel - 0x10)
      break
    case OP.PLUS:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '+' + stringifyExpWithLevel(tree.right, opLevel - 0x10)
      break
    case OP.MINUS:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '-' + stringifyExpWithLevel(tree.right, opLevel - 0x10)
      break
    case OP.LEFT_SHIFT:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '<<' + stringifyExpWithLevel(tree.right, opLevel - 0x10)
      break
    case OP.RIGHT_SHIFT:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '>>' + stringifyExpWithLevel(tree.right, opLevel - 0x10)
      break
    case OP.UNSIGNED_RIGHT_SHIFT:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '>>>' + stringifyExpWithLevel(tree.right, opLevel - 0x10)
      break
    case OP.L:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '<' + stringifyExpWithLevel(tree.right, opLevel - 0x10)
      break
    case OP.LE:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '<=' + stringifyExpWithLevel(tree.right, opLevel - 0x10)
      break
    case OP.G:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '>' + stringifyExpWithLevel(tree.right, opLevel - 0x10)
      break
    case OP.GE:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '>=' + stringifyExpWithLevel(tree.right, opLevel - 0x10)
      break
    case OP.E:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '==' + stringifyExpWithLevel(tree.right, opLevel - 0x10)
      break
    case OP.NE:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '!=' + stringifyExpWithLevel(tree.right, opLevel - 0x10)
      break
    case OP.BIT_AND:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '&' + stringifyExpWithLevel(tree.right, opLevel - 0x10)
      break
    case OP.BIT_XOR:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '^' + stringifyExpWithLevel(tree.right, opLevel - 0x10)
      break
    case OP.BIT_OR:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '|' + stringifyExpWithLevel(tree.right, opLevel - 0x10)
      break
    case OP.ASSIGN:
      ret = stringifyExpWithLevel(tree.left, opLevel - 0x10) + '=' + stringifyExpWithLevel(tree.right, opLevel)
      break
    default:
      throw new Error()
  }
  if(needBracket) return '(' + ret + ')'
  return ret
}

var stringifyExp = (tree) => {
  return stringifyExpWithLevel(tree, 0xF0)
}

// statements

var stringifyBlock = (tree) => {
  switch(tree.op) {
    case OP.EMPTY:
      return ''
    case OP.HIDDEN_BLOCK:
      return tree.body.map(stringifyBlock).join('')
    case OP.BLOCK:
      return '{' + tree.body.map(stringifyBlock).join('') + '}'
    case OP.RETURN:
      return 'return ' + stringifyExp(tree.body) + ';'
    case OP.IF:
      var ifBody = 'if(' + stringifyExp(tree.cond) + ')' + stringifyBlock(tree.left)
      if(tree.right) ifBody += 'else ' + stringifyBlock(tree.right)
      return ifBody
    case OP.WHILE:
      return 'while(' + stringifyExp(tree.cond) + ')' + stringifyBlock(tree.body)
    case OP.FOR:
      var forInit = tree.init ? stringifyExp(tree.init) : ''
      var forCond = tree.cond ? stringifyExp(tree.cond) : ''
      var forStep = tree.step ? stringifyExp(tree.step) : ''
      return 'for(' + forInit + ';' + forCond + ';' + forStep + ')' + stringifyBlock(tree.body)
    case OP.BREAK:
      return 'break;'
    case OP.CONTINUE:
      return 'continue;'
    default:
      return stringifyExp(tree) + ';'
  }
}

// overall structures

var stringifyStatics = (tree) => {
  var statics = tree.statics
  var retArr = []
  for(var k in statics) {
    retArr.push(statics[k].rename + '=' + stringifyExp(statics[k].valueStr))
  }
  if(retArr.length) return 'var ' + retArr.join(',') + ';'
  return ''
}

var stringifyFunctions = (tree) => {
  var functions = tree.functions
  var retArr = []
  for(let k in functions) {
    var func = functions[k]
    var argDef = ''
    for(let ik in func.args) {
      argDef += func.args[ik].rename + '=' + stringifyExp(func.args[ik].body) + ';'
    }
    var varDefArr = []
    for(let ik in func.vars) {
      varDefArr.push(func.vars[ik].rename + '=' + stringifyExp(func.vars[ik].valueStr))
    }
    var varDef = varDefArr.length ? 'var ' + varDefArr.join(',') + ';' : ''
    // eslint-disable-next-line no-loop-func
    retArr.push('function ' + func.rename + '(' + func.argsOrder.map(item => func.args[item].rename).join(',') + '){' + argDef + varDef + stringifyBlock(func.body) + '}')
  }
  return retArr.join('')
}

var stringifyExports = (tree) => {
  var functions = tree.functions
  return 'return{' + tree.exports.map(item => item + ':' + functions[item].rename) + '}'
}

exports.tree = (tree) => {
  return stringifyStatics(tree) + stringifyFunctions(tree) + stringifyExports(tree)
}
