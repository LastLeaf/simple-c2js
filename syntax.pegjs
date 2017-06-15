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
  = ([ \t\r\n]+ / comment)+ { return '' }

linewrap
  = '\r\n' / '\n' / '\r'

varName
  = ws? name:$([_a-z]i [_a-z0-9]i*) { return name }

typeName
  = 'unsigned int' / 'int' / 'double' / 'float' / 'char*' / 'void*'
  / 'struct' ws name:varName '*' { return 'struct ' + name + '*' }

sizeofTypeName
  = 'unsigned int' / 'int' / 'double' / 'float' / 'char'
  / 'struct' ws name:varName { return 'struct ' + name }

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

// sentence

sentences
  = ws? item:block ws? next:sentences { return item && next.unshift(item), next }
  / ws? { return [] }

block
  = ws? ';' { return { op: '{}', body: [] } }
  / statement
  / body:commaExpression ws? ';' { return body }
  / ws? '{' body:sentences ws? '}' { return { op: '{}', body: body } }

statement
  = body:breakStatement ws? ';' { return body }
  / body:continueStatement ws? ';' { return body }
  / body:returnStatement ws? ';' { return body }
  / ifStatement
  / whileStatement
  / forStatement
  / body:definition ws? ';' { return body }

definition
  = ws? typeName:typeName ws item:defItem next:defListNext { return next.unshift(item), { op: 'def', type: typeName, body: next } }

defListNext
  = ws? ',' item:defItem next:defListNext { return next.unshift(item), next }
  / '' { return [] }

defItem
  = ws? varName:varName ws? '=' ws? exp:expression { return { name: varName, value: exp } }

returnStatement
  = ws? 'return' body:commaExpression { return { op: 'return', body: body } }

ifStatement
  = ws? 'if' ws? '(' cond:commaExpression ws? ')' ws? body:block elseBody:elseStatement? { return { op: 'if', cond: cond, body: body, elseBody: elseBody } }

elseStatement
  = ws? 'else' ws? body:block { return body }

whileStatement
  = ws? 'while' ws? '(' cond:commaExpression ws? ')' ws? body:block { return { op: 'while', cond: cond, body: body } }

forStatement
  = ws? 'for' ws? '(' init:commaExpression? ws? ';' cond:commaExpression? ws? ';' step:commaExpression? ws? ')' body:block { return { op: 'for', init: init, cond: cond, step: step, body: body } }

breakStatement
  = ws? 'break' { return { op: 'break' } }

continueStatement
  = ws? 'continue' { return { op: 'continue' } }

commaExpression
  = item:expression next:commaExpressionNext { return next.length ? next.unshift(item) && { op: ',', body: next } : item }

commaExpressionNext
  = ws? ',' item:expression next:commaExpressionNext { return next.unshift(item), next  }
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
  = item:logicAndExp next:logicOrExpNext { return next.length ? next.unshift(item) && { op: '||', body: next } : item }

logicOrExpNext
  = '||' item:logicAndExp next:logicOrExpNext { return next.unshift(item), next }
  / '' { return [] }

logicAndExp
  = item:bitOrExp next:logicAndExpNext { return next.length ? next.unshift(item) && { op: '&&', body: next } : item }

logicAndExpNext
  = '&&' item:bitOrExp next:logicAndExpNext { return next.unshift(item), next }
  / '' { return [] }

bitOrExp
  = item:bitXorExp next:bitOrExpNext { return next.length ? next.unshift(item) && { op: '|', body: next } : item }

bitOrExpNext
  = '|' item:bitXorExp next:bitOrExpNext { return next.unshift(item), next }
  / '' { return [] }

bitXorExp
  = item:bitAndExp next:bitXorExpNext { return next.length ? next.unshift(item) && { op: '^', body: next } : item }

bitXorExpNext
  = '^' item:bitAndExp next:bitXorExpNext { return next.unshift(item), next }
  / '' { return [] }

bitAndExp
  = item:equalityExp next:bitAndExpNext { return next.length ? next.unshift(item) && { op: '&', body: next } : item }

bitAndExpNext
  = '&' item:equalityExp next:bitAndExpNext { return next.unshift(item), next }
  / '' { return [] }

equalityExp
  = relationalExp
  / left:relationalExp ws? op:[!=] '=' right:relationalExp { return { op: op + '=', left: left, right: right } }

relationalExp
  = shiftExp
  / left:shiftExp ws? op1:[<>] op2:'='? right:shiftExp { return { op: op1 + op2, left: left, right: right } }

shiftExp
  = addition
  / left:addition ws? op:( '<<' / '>>' ) right:addition { return { op: op, left: left, right: right } }

addition
  = item:multiplication next:additionNext { return next.length ? next.unshift(item) && { op: '+-', body: next } : item }

additionNext
  = op:[-+] item:multiplication next:additionNext { return next.unshift({ op: op, body: item }), next }
  / '' { return [] }

multiplication
  = item:unaryExp next:multiplicationNext { return next.length ? next.unshift(item) && { op: '*/%', body: next } : item }

multiplicationNext
  = op:[*/%] item:unaryExp next:multiplicationNext { return next.unshift({ op: op, body: item }), next }
  / '' { return [] }

unaryExp
  = memberExp
  / ws? '+' body:unaryExp { return { op: '+n', body: body } }
  / ws? '-' body:unaryExp { return { op: '-n', body: body } }
  / ws? '!' body:unaryExp { return { op: '!n', body: body } }
  / ws? '~' body:unaryExp { return { op: '~n', body: body } }
  / ws? '(' type:typeName ')' body:unaryExp { return { op: 'cast', type: type, body: body } }

memberExp
  = callExp
  / memberOp

callExp
  = brackets
  / ws? name:varName ws? '(' body:commaExpression ws? ')' { return { op: 'f()', args: body.body } }

brackets
  = ws? body:literal { return body }
  / ws? name:varName { return { op: 'var', name: name } }
  / ws? 'sizeof(' ws? type:sizeofTypeName ws? ')' { return { op: 'sizeof', type: type } }
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
  = first:[1-9] next:[0-9]* { return parseInt(String(first) + next.join(''), 10) }
  / '0x' next:[0-9]+ { return parseInt(next.join(''), 16) }
  / '0' next:[0-9]* { return next.length ? parseInt(next.join(''), 8) : 0 }

float
  = first:[0-9]* '.' next:[0-9]+ type:[l]i? {
    return {
      op: (type === 'l' || type === 'L' ? 'double' : 'float'),
      value: parseFloat(first.join('') + '.' + next.join(''))
    }
  }
