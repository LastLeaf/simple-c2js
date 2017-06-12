// basic

start
  = program

whitespace
  = [ \t\r\n]+

linewrap
  = '\r\n' / '\r' / '\n'

varName
  = [_a-z]i [_a-z0-9]i

typeName
  = ( 'int' / 'double' / 'float' / 'char*' )
  / 'struct' whitespace name:varName { return name }

// program

program
  =  whitespace? seg:programSegment whitespace? program:program { return program.unshift(seg) }
  /  whitespace? programSegment whitespace?

programSegment
  = macro
  / funcDef

macro
  = '#' name:varName [ \t]+ body:macroBody { return { type: 'macro', name: name, body: body } }

macroBody
  = char:!linewrap next:macroBody { return char + next }
  / '\\' char:linewrap next:macroBody { return char + next }
  / char:linewrap { return '' }

funcDef
  = returnType:typeName whitespace name:varName whitespace? '(' whitespace? argNames:argList ')' whitespace? '{' whitespace? body:sentences whitespace? '}' {
    return {
      type: 'funcDef',
      returnType: returnType,
      name: name,
      argNames: argNames,
      body: body
    }
  }

argList
  = argName:varName whitespace? ',' whitespace? argNames:argList { return argNames.unshift(argName) }
  / argName:varName whitespace? { return [argName] }

sentences
  = sentence:sentence whitespace? ';' whitespace? next:sentences { return next.unshift(sentence) }
  / sentence:sentence whitespace? ';' { return [sentence] }

// TODO sentence
