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
  = $([_a-z]i [_a-z0-9]i*)

typeName
  = 'int' / 'double' / 'float' / 'char*' / 'void*'
  / 'struct' ws name:varName '*' { return name }

// program

program
  =  ws? seg:programSegment ws? next:program { return next.unshift(seg), next }
  /  '' { return [] }

programSegment
  = macro
  / funcDef

macro
  = ws? '#' name:varName [ \t] body:macroBody { return { t: 'macro', name: name, body: body } }

macroBody
  = '\\' char:linewrap next:macroBody { return char + next }
  / char:[^\r\n] next:macroBody { return char + next }
  / linewrap { return '' }

funcDef
  = ws? returnType:typeName ws name:varName ws? '(' args:argList ws? ')' ws? '{' body:sentences ws? '}' {
    return {
      t: 'funcDef',
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

definition
  = ws? typeName:typeName ws item:defItem next:defListNext { return next.unshift(item), { t: 'def', type: typeName, body: next } }

defListNext
  = ws? ',' item:defItem next:defListNext { return next.unshift(item), next }
  / '' { return [] }

defItem
  = ws? varName:varName ws? '=' ws? exp:expression { return { name: varName, value: exp } }

returnStatement
  = ws? 'return' body:commaExpression { return { t: 'return', body: body } }

ifStatement
  = ws? 'if' ws? '(' cond:commaExpression 'ws?' ')' ws? body:block elseBody:elseStatement { return { t: 'if', cond: cond, body: body, elseBody: elseBody } }

elseStatement
  = ws? 'else' ws? body:block { return body }

whileStatement
  = ws? 'while' ws? '(' cond:commaExpression ')' ws? body:block { return { t: 'while', cond: cond, body: body } }

forStatement
  = ws? 'for' ws? '(' init:commaExpression ';' cond:commaExpression ';' step:commaExpression ')' body:block { return { t: 'for', init: init, cond: cond, step: step, body: body } }

breakStatement
  = ws? 'break'

continueStatement
  = ws? 'continue'

block
  = commaExpression
  / ws? '{' body:sentences ws? '}' { return { t: '{}', body: body } }

commaExpression
  = item:expression next:commaExpressionNext { return next.unshift(item), { t: ',', body: next } }

commaExpressionNext
  = ',' item:expression next:commaExpressionNext { return next.unshift(item), next }
  / '' { return [] }

// expression

expression
  = ''
