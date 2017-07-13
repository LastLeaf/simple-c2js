exports.ASM_OP = {
  EMPTY: 0x01,
  LITERAL: 0x02,
  VAR: 0x03,

  CALL: 0x11,
  ARRAY_MEMBER: 0x12,

  POSITIVE: 0x21,
  NEGATIVE: 0x22,
  BIT_REVERT: 0x23,
  REVERT: 0x24,

  MULTI: 0x31,
  DIV: 0x32,
  MOD: 0x33,

  PLUS: 0x41,
  MINUS: 0x42,

  LEFT_SHIFT: 0x51,
  RIGHT_SHIFT: 0x52,
  UNSIGNED_RIGHT_SHIFT: 0x52,

  L: 0x61,
  LE: 0x62,
  G: 0x63,
  GE: 0x64,

  E: 0x71,
  NE: 0x72,

  BIT_AND: 0x81,
  BIT_XOR: 0x91,
  BIT_OR: 0xA1,

  ASSIGN: 0xF1,

  HIDDEN_BLOCK: 0x101,
  BLOCK: 0x102,
  RETURN: 0x112,
  IF: 0x113,
  WHILE: 0x114,
  FOR: 0x115,
  BREAK: 0x116,
  CONTINUE: 0x117,
}

exports.STDLIB_ARRAY_BUFFERS = {
  'Uint8Array': '__B',
  'Int8Array': '__C',
  'Uint32Array': '__U',
  'Int32Array': '__I',
  'Float32Array': '__F',
  'Float64Array': '__D',
}
exports.STDLIB_PRESERVE = {
  'Math.imul': '__m',
  'Math.fround': '__f',
}
exports.STDLIB_TYPES = {
  'acos': ['Math.acos', 'double', 'double'],
  'asin': ['Math.asin', 'double', 'double'],
  'atan': ['Math.atan', 'double', 'double'],
  'cos': ['Math.cos', 'double', 'double'],
  'sin': ['Math.sin', 'double', 'double'],
  'tan': ['Math.tan', 'double', 'double'],
  'exp': ['Math.exp', 'double', 'double'],
  'log': ['Math.log', 'double', 'double'],
  'ceil': ['Math.ceil', 'double', 'double'],
  'floor': ['Math.floor', 'double', 'double'], // FIXME use short form of floor
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
