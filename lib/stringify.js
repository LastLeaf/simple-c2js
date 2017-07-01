var consts = require('./consts')

var OP = consts.ASM_OP

// expressions

var stringifyExpWithLevel = (tree, opLevel) => {
  var needBracket = false
  if(opLevel <= (tree.op & 0xF0)) needBracket = true // TODO consider left-right order
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
      ret = tree.name + '(' + stringifyExpWithLevel(tree.body, 0xF0) + ')'
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
      ret = stringifyExpWithLevel(tree.left, opLevel) + '*' + stringifyExpWithLevel(tree.right, opLevel)
      break
    case OP.DIV:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '/' + stringifyExpWithLevel(tree.right, opLevel)
      break
    case OP.MOD:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '%' + stringifyExpWithLevel(tree.right, opLevel)
      break
    case OP.PLUS:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '+' + stringifyExpWithLevel(tree.right, opLevel)
      break
    case OP.MINUS:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '-' + stringifyExpWithLevel(tree.right, opLevel)
      break
    case OP.LEFT_SHIFT:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '<<' + stringifyExpWithLevel(tree.right, opLevel)
      break
    case OP.RIGHT_SHIFT:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '>>' + stringifyExpWithLevel(tree.right, opLevel)
      break
    case OP.UNSIGNED_RIGHT_SHIFT:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '>>>' + stringifyExpWithLevel(tree.right, opLevel)
      break
    case OP.L:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '<' + stringifyExpWithLevel(tree.right, opLevel)
      break
    case OP.LE:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '<=' + stringifyExpWithLevel(tree.right, opLevel)
      break
    case OP.G:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '>' + stringifyExpWithLevel(tree.right, opLevel)
      break
    case OP.GE:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '>=' + stringifyExpWithLevel(tree.right, opLevel)
      break
    case OP.E:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '==' + stringifyExpWithLevel(tree.right, opLevel)
      break
    case OP.NE:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '!=' + stringifyExpWithLevel(tree.right, opLevel)
      break
    case OP.BIT_AND:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '&' + stringifyExpWithLevel(tree.right, opLevel)
      break
    case OP.BIT_XOR:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '^' + stringifyExpWithLevel(tree.right, opLevel)
      break
    case OP.BIT_OR:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '|' + stringifyExpWithLevel(tree.right, opLevel)
      break
    case OP.ASSIGN:
      ret = stringifyExpWithLevel(tree.left, opLevel) + '=' + stringifyExpWithLevel(tree.right, opLevel)
      break
    default:
      console.error('OP ' + tree)
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
    case OP.HIDDEN_BLOCK:
      return tree.body.map(stringifyBlock).join('')
    case OP.BLOCK:
      return '{' + tree.body.map(stringifyBlock).join('') + '}'
    case OP.RETURN:
      return 'return ' + stringifyExp(tree.body) + ';'
    case OP.IF:
      var ret = 'if(' + stringifyExp(tree.cond) + ')' + stringifyBlock(tree.left)
      if(tree.right) ret += 'else ' + stringifyBlock(tree.right)
      return ret
    case OP.WHILE:
      return 'while(' + stringifyExp(tree.cond) + ')' + stringifyBlock(tree.body)
    case OP.FOR:
      return 'for(' + stringifyExp(tree.init) + ';' + stringifyExp(tree.cond) + ';' + stringifyExp(tree.step) + ')' + stringifyBlock(tree.body)
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
    var varDef = ''
    for(let ik in func.vars) {
      varDef += 'var ' + func.vars[ik].rename + '=' + stringifyExp(func.vars[ik].body) + ';'
    }
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
