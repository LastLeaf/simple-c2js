// basic

start
  = program:program { return { body: program } }

comment
  = '//' [^\r\n]+ linewrap
  / '/*' commentBlockBody

commentBlockBody
  = '*/'
  / . commentBlockBody

ws
  = [ \t\r\n]+ { return '' }
  / comment { return '' }

linewrap
  = '\r\n' / '\n' / '\r'

varName
  = ws? name:$([_a-z]i [_a-z0-9]i*) { return name }

typeName
  = 'unsigned int' / 'int' / 'double' / 'float' / 'char*' / 'void*'
  / 'struct' ws name:varName '*' { return name }

// program

program
  =  ws? seg:programSegment ws? next:program { return next.unshift(seg), next }
  /  '' { return [] }

programSegment
  = macro
  / funcDef
  / structDef

macro
  = ws? '#' name:varName [ \t] body:macroBody { return { op: 'macro', name: name, body: body } }

macroBody
  = '\\' char:linewrap next:macroBody { return char + next }
  / char:[^\r\n] next:macroBody { return char + next }
  / linewrap { return '' }

structDef
  = ws? 'struct' ws name:varName ws? '{' body:fieldList ws? '}' ws? ';' {
    return {
      op: 'struct',
      name: name,
      body: body
    }
  }

fieldList
  = ws? typeName:typeName ws argName:varName ws? ';' args:fieldList { return args.unshift({ type: typeName, name: argName }), args }
  / '' { return [] }

funcDef
  = ws? returnType:typeName ws name:varName ws? '(' args:argList ws? ')' ws? '{' body:sentences ws? '}' {
    return {
      op: 'function',
      type: returnType,
      name: name,
      args: args,
      body: body
    }
  }

argList
  = ws? typeName:typeName ws argName:varName args:argListNext { return args.unshift({ type: typeName, name: argName }), args }
  / '' { return [] }

argListNext
  = ws? ',' ws? typeName:typeName ws argName:varName args:argListNext { return args.unshift({ type: typeName, name: argName }), args }
  / '' { return [] }

sentences
  = ws? sentence:sentence ws? next:sentences { return sentence && next.unshift(sentence), next }
  / '' { return [] }

// sentence

sentence
  = ws? ';' { return null }
  / body:breakStatement ws? ';' { return body }
  / body:continueStatement ws? ';' { return body }
  / body:returnStatement ws? ';' { return body }
  / ifStatement
  / whileStatement
  / forStatement
  / body:definition ws? ';' { return body }
  / body:commaExpression ws? ';' { return body }
  / body:constStatement ';' { return body }

definition
  = ws? typeName:typeName ws item:defItem next:defListNext { return next.unshift(item), { op: 'def', type: typeName, body: next } }

defListNext
  = ws? ',' item:defItem next:defListNext { return next.unshift(item), next }
  / '' { return [] }

defItem
  = ws? varName:varName ws? '=' ws? exp:expression { return { name: varName, value: exp } }

constStatement
  = ws? varName:varName ws? '=' ws? value:literal { return { op: 'const', name: varName, value: literal } }

returnStatement
  = ws? 'return' body:commaExpression { return { op: 'return', body: body } }

ifStatement
  = ws? 'if' ws? '(' cond:commaExpression 'ws?' ')' ws? body:block elseBody:elseStatement { return { op: 'if', cond: cond, body: body, elseBody: elseBody } }

elseStatement
  = ws? 'else' ws? body:block { return body }

whileStatement
  = ws? 'while' ws? '(' cond:commaExpression ')' ws? body:block { return { op: 'while', cond: cond, body: body } }

forStatement
  = ws? 'for' ws? '(' init:commaExpression ';' cond:commaExpression ';' step:commaExpression ')' body:block { return { op: 'for', init: init, cond: cond, step: step, body: body } }

breakStatement
  = ws? 'break'

continueStatement
  = ws? 'continue'

block
  = commaExpression
  / ws? '{' body:sentences ws? '}' { return { op: '{}', body: body } }

commaExpression
  = item:expression next:commaExpressionNext { return next.unshift(item), { op: ',', body: next } }

commaExpressionNext
  = ws? ',' item:expression next:commaExpressionNext { return next.unshift(item), next }
  / '' { return [] }

// expression

expression
  = assignmentExp

assignmentExp
  = conditionExp
  / left:lvalue ws? '=' right:expression { return { op: '=', left: lvalue, right: right } }

conditionExp
  = logicOrExp
  / cond:logicOrExp ws? '?' body:expression ws? ':' elseBody:expression { return { op: '?:', cond: cond, body: body, elseBody: elseBody } }

logicOrExp
  = logicAndExp
  / left:logicAndExp ws? '||' right:logicAndExp { return { op: '||', left: left, right: right } }

logicAndExp
  = bitOrExp
  / left:bitOrExp ws? '&&' right:bitOrExp { return { op: '&&', left: left, right: right } }

bitOrExp
  = bitXorExp
  / left:bitXorExp ws? '|' right:bitXorExp { return { op: '|', left: left, right: right } }

bitXorExp
  = bitAndExp
  / left:bitAndExp ws? '^' right:bitAndExp { return { op: '^', left: left, right: right } }

bitAndExp
  = equalityExp
  / left:equalityExp ws? '&' right:equalityExp { return { op: '&', left: left, right: right } }

equalityExp
  = relationalExp
  / left:relationalExp ws? op:[!=] '=' right:relationalExp { return { op: op + '=', left: left, right: right } }

relationalExp
  = shiftExp
  / left:shiftExp ws? op1:[<>] op2:'='? right:shiftExp { return { op: op1 + op2, left: left, right: right } }

shiftExp
  = addition
  / left:addition ws? '<<' right:addition { return { op: '<<', left: left, right: right } }
  / left:addition ws? '>>' right:addition { return { op: '>>', left: left, right: right } }

addition
  = multiplication
  / left:multiplication op:[+-] right:multiplication { return { op: op, left: left, right: right } }

multiplication
  = unaryExp
  / left:unaryExp op:[*/%] right:unaryExp { return { op: op, left: left, right: right } }

unaryExp
  = memberExp
  / ws? '+' body:memberExp
  / ws? '-' body:memberExp
  / ws? '!' body:memberExp
  / ws? '~' body:memberExp
  / ws? '(' type:typeName ')' body:memberExp

memberExp
  = callExp
  / memberOp

callExp
  = brackets
  / name:varName '(' body:commaExpression ')' { return { op: 'f()', args: body.body } }

brackets
  = ws? literal
  / ws? varName { return { op: 'var', body: body } }
  / ws? 'sizeof(' ws? type:typeName ws? ')' { return { op: 'sizeof', type: type } }
  / ws? '(' body:expression ws? ')' { return { op: '()', body: body } }

// lvalue

lvalue
  = varName
  / memberOp

memberOp
  = left:callExp '.' right:varName { return { op: '.', left: left, right: right } }
  / left:callExp '->' right:varName { return { op: '->', left: left, right: right } }
  / left:callExp '[' right:expression ']' { return { op: '[]', left: left, right: right } }

// const

literal
  = value:integer type:[u]i? {
    return {
      op: (type === 'u' || type === 'U' ? 'unsigned int' : 'int'),
      value: value
    }
  }
  / float

integer
  = first:[1-9] next:[0-9]* { return parseInt(first + next.join(''), 10) }
  / '0x' next:[0-9]+ { return parseInt(next.join(''), 16) }
  / '0' next:[0-9]+ { return parseInt(next.join(''), 8) }

float
  = first:[0-9]* '.' next:[0-9]+ type:[l]i? {
    return {
      op: (type === 'l' || type === 'L' ? 'double' : 'float'),
      num: parseFloat(first.join('') + '.' + next.join(''))
    }
  }
