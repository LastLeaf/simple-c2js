// helper functions

{
  function insertToLeft(obj, item, next) {
    if(!next) {
      if(!obj) return item
      obj.left = null
      obj.right = item
      return obj
    }
    var deepLeft = next
    while(deepLeft.left) deepLeft = deepLeft.left
    if(obj) {
      obj.left = null
      obj.right = item
      deepLeft.left = obj
      return next
    }
    deepLeft.left = item
    return next
  }
}

// basic

start
  = program:program { return { location: location(), body: program } }

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
  = name:('unsigned int' / 'int' / 'double' / 'float' / 'unsigned char' / 'char' / 'void') pointer:[*]* {
    var unsigned = false
    if(name.slice(0, 9) === 'unsigned ') {
      name = name.slice(9)
      unsigned = true
    }
    return { location: location(), struct: false, name: name, unsigned: unsigned, pointer: pointer.length }
  }
  / 'struct' ws name:varName pointer:[*]* { return { location: location(), struct: true, name: name, unsigned: false, pointer: pointer.length } }

// program

program
  =  ws? seg:programSegment ws? next:program { return next.unshift(seg), next }
  /  '' { return [] }

programSegment
  = macro
  / structDef
  / staticDef
  / funcDef

macro
  = ws? '#' name:varName [ \t] body:macroBody { return { location: location(), op: 'macro', name: name, body: body } }

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
  = ws? typeName:typeName ws argName:varName array:('[' array:integer ']' { return array })? ws? ';' args:fieldList {
    if(array) {
      typeName.pointer ++
      typeName.count = array
    }
    return args.unshift({ location: location(), type: typeName, name: argName }), args
  }
  / '' { return [] }

staticDef
  = 'static' ws def:definition ws? ';' { return { location: location(), op: 'static', type: def.type, body: def.body } }

funcDef
  = ws? isStatic:('static' ws)? returnType:typeName ws name:varName ws? '(' args:argList ws? ')' ws? '{' body:sentences ws? '}' {
    return {
      location: location(),
      op: 'function',
      static: !!isStatic,
      type: returnType,
      name: name,
      args: args,
      body: body
    }
  }

argList
  = ws? typeName:typeName ws argName:varName args:argListNext { return args.unshift({ location: location(), type: typeName, name: argName }), args }
  / '' { return [] }

argListNext
  = ws? ',' ws? typeName:typeName ws argName:varName args:argListNext { return args.unshift({ location: location(), type: typeName, name: argName }), args }
  / '' { return [] }

// sentence

sentences
  = ws? item:block ws? next:sentences { return item && next.unshift(item), next }
  / ws? { return [] }

block
  = ws? ';' { return { location: location(), op: '{}', body: [] } }
  / ws? '{' body:sentences ws? '}' { return { location: location(), op: '{}', body: body } }
  / statement
  / body:commaExpression ws? ';' { return body }

statement
  = body:breakStatement ws? ';' { return body }
  / body:continueStatement ws? ';' { return body }
  / body:returnStatement ws? ';' { return body }
  / ifStatement
  / whileStatement
  / forStatement
  / body:definition ws? ';' { return body }

definition
  = ws? typeName:typeName ws item:defItem next:defListNext { return next.unshift(item), { location: location(), op: 'def', type: typeName, body: next } }

defListNext
  = ws? ',' item:defItem next:defListNext { return next.unshift(item), next }
  / '' { return [] }

defItem
  = ws? varName:varName ws? '=' ws? exp:expression { return { location: location(), name: varName, value: exp } }

returnStatement
  = ws? 'return' body:commaExpression { return { location: location(), op: 'return', body: body } }

ifStatement
  = ws? 'if' ws? '(' cond:commaExpression ws? ')' ws? body:block elseBody:elseStatement? { return { location: location(), op: 'if', cond: cond, body: body, elseBody: elseBody } }

elseStatement
  = ws? 'else' ws? body:block { return body }

whileStatement
  = ws? 'while' ws? '(' cond:commaExpression ws? ')' ws? body:block { return { location: location(), op: 'while', cond: cond, body: body } }

forStatement
  = ws? 'for' ws? '(' init:commaExpression? ws? ';' cond:commaExpression? ws? ';' step:commaExpression? ws? ')' body:block { return { op: 'for', init: init, cond: cond, step: step, body: body } }

breakStatement
  = ws? 'break' { return { op: 'break' } }

continueStatement
  = ws? 'continue' { return { op: 'continue' } }

commaExpression
  = item:expression next:commaExpressionNext { return next.length ? next.unshift(item) && { location: location(), op: ',', body: next } : item }

commaExpressionNext
  = ws? ',' item:expression next:commaExpressionNext { return next.unshift(item), next  }
  / '' { return [] }

// expression

expression
  = assignmentExp

assignmentExp
  = left:lvalue ws? '=' right:expression { return { location: location(), op: '=', left: left, right: right } }
  / conditionExp

conditionExp
  = cond:logicOrExp ws? '?' body:expression ws? ':' elseBody:expression { return { location: location(), op: '?:', cond: cond, body: body, elseBody: elseBody } }
  / logicOrExp

logicOrExp
  = item:logicAndExp next:logicOrExpNext { return insertToLeft(null, item, next) }

logicOrExpNext
  = ws? '||' item:logicAndExp next:logicOrExpNext { return insertToLeft({ location: location(), op: '||' }, item, next) }
  / '' { return null }

logicAndExp
  = item:bitOrExp next:logicAndExpNext { return insertToLeft(null, item, next) }

logicAndExpNext
  = ws? '&&' item:bitOrExp next:logicAndExpNext { return insertToLeft({ location: location(), op: '&&' }, item, next) }
  / '' { return null }

bitOrExp
  = item:bitXorExp next:bitOrExpNext { return insertToLeft(null, item, next) }

bitOrExpNext
  = ws? '|' item:bitXorExp next:bitOrExpNext { return insertToLeft({ location: location(), op: '|' }, item, next) }
  / '' { return null }

bitXorExp
  = item:bitAndExp next:bitXorExpNext { return insertToLeft(null, item, next) }

bitXorExpNext
  = ws? '^' item:bitAndExp next:bitXorExpNext { return insertToLeft({ location: location(), op: '^' }, item, next) }
  / '' { return null }

bitAndExp
  = item:equalityExp next:bitAndExpNext { return insertToLeft(null, item, next) }

bitAndExpNext
  = ws? '&' item:equalityExp next:bitAndExpNext { return insertToLeft({ location: location(), op: '&' }, item, next) }
  / '' { return null }

equalityExp
  = left:relationalExp ws? op:[!=] '=' right:relationalExp { return { location: location(), op: op + '=', left: left, right: right } }
  / relationalExp

relationalExp
  = left:shiftExp ws? op1:[<>] op2:'='? right:shiftExp { return { location: location(), op: op1 + (op2 || ''), left: left, right: right } }
  / shiftExp

shiftExp
  = item:addition next:shiftExpNext { return insertToLeft(null, item, next) }

shiftExpNext
  = ws? op:$('<<' / '>>') item:addition next:shiftExpNext { return insertToLeft({ location: location(), op: op }, item, next) }
  / '' { return null }

addition
  = item:multiplication next:additionNext { return insertToLeft(null, item, next) }

additionNext
  = ws? op:[-+] item:multiplication next:additionNext { return insertToLeft({ location: location(), op: op }, item, next) }
  / '' { return null }

multiplication
  = item:unaryExp next:multiplicationNext { return insertToLeft(null, item, next) }

multiplicationNext
  = ws? op:[*/%] item:unaryExp next:multiplicationNext { return insertToLeft({ location: location(), op: op }, item, next) }
  / '' { return null }

unaryExp
  = ws? '+' body:unaryExp { return { location: location(), op: '+n', body: body } }
  / ws? '-' body:unaryExp { return { location: location(), op: '-n', body: body } }
  / ws? '!' body:unaryExp { return { location: location(), op: '!n', body: body } }
  / ws? '~' body:unaryExp { return { location: location(), op: '~n', body: body } }
  / ws? '(' type:typeName ')' body:unaryExp { return { location: location(), op: 'cast', type: type, body: body } }
  / memberExp

memberExp
  = callExp

callExp
  = ws? 'sizeof(' ws? body:typeName ws? ')' { return { location: location(), op: 'sizeof', body: body } }
  / ws? name:varName ws? '(' body:commaExpression ws? ')' { return { location: location(), op: 'f()', name: name, args: body.body } }
  / memberOp
  / brackets

brackets
  = ws? '(' body:expression ws? ')' { return { location: location(), op: '()', body: body } }
  / ws? body:literal { return body }
  / var

var
  = ws? name:varName { return { location: location(), op: 'var', name: name } }

// lvalue

lvalue
  = memberOp
  / var

memberOp
  = ws? item:varName next:memberOpNext { return next.length ? next.unshift(item) && { location: location(), op: 'member', body: next } : item }

memberOpNext
  = ws? op:('.' / '->') body:varName next:(memberOpNext / '') { return next = next || [], next.unshift({ location: location(), op: op, body: body }), next }
  / ws? '[' body:expression ']' next:(memberOpNext / '') { return next = next || [], next.unshift({ location: location(), op: '[]', body: body }), next }

// const

literal
  = float
  / value:integer type:[u]i? {
    return {
      location: location(),
      op: 'int',
      value: value
    }
  }

integer
  = first:[1-9] next:[0-9]* { return parseInt(String(first) + next.join(''), 10) }
  / '0x' next:[0-9a-f]i+ { return parseInt(next.join(''), 16) }
  / '0' next:[0-7]* { return next.length ? parseInt(next.join(''), 8) : 0 }

float
  = first:[0-9]* '.' next:[0-9]+ type:[l]i? {
    return {
      op: (type === 'l' || type === 'L' ? 'double' : 'float'),
      value: parseFloat(first.join('') + '.' + next.join(''))
    }
  }
