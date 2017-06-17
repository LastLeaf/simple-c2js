var c2js = require('../index')
var expect = require('chai').expect

var parseAndCompare = (source, target) => {
  var res = null
  try {
    res = c2js.parse(source)
  } catch(e) {
    console.error(e.message)
    console.error(e.location)
    throw e
  }
  expect(res).to.deep.equal(target)
}

describe('#parse', () => {

  it('should parse program overall structure', () => {
    var source = `
      #include <math.h>
      struct custom {
        int x1;
        void* y_;
      };
      int calc(){}
      int main( struct custom* a, char* _b ){
        ;
      }
    `
    var target = {
      body: [{
        op: 'macro',
        name: 'include',
        body: '<math.h>'
      }, {
        op: 'struct',
        name: 'custom',
        body: [{
          type: 'int',
          name: 'x1'
        }, {
          type: 'void*',
          name: 'y_'
        }]
      }, {
        op: 'function',
        type: 'int',
        name: 'calc',
        args: [],
        body: []
      }, {
        op: 'function',
        type: 'int',
        name: 'main',
        args: [{
          type: 'struct custom*',
          name: 'a'
        }, {
          type: 'char*',
          name: '_b'
        }],
        body: [{
          op: '{}',
          body: []
        }]
      }]
    }
    parseAndCompare(source, target)
  })

  it('should parse struct definitions', () => {
    var source = `
      struct A {
        struct A* a;
      };
      struct B {
        struct A* b;
        unsigned int c;
        double d;
      };
    `
    var target = {
      body: [{
        op: 'struct',
        name: 'A',
        body: [{
          type: 'struct A*',
          name: 'a'
        }]
      }, {
        op: 'struct',
        name: 'B',
        body: [{
          type: 'struct A*',
          name: 'b'
        }, {
          type: 'unsigned int',
          name: 'c'
        }, {
          type: 'double',
          name: 'd'
        }]
      }]
    }
    parseAndCompare(source, target)
  })

  it('should parse function definitions', () => {
    var source = `
      void* a() {}
      struct S* b ( char* c ) { }
      double d ( unsigned int e, int f, char* g ) {;}
    `
    var target = {
      body: [{
        op: 'function',
        type: 'void*',
        name: 'a',
        args: [],
        body: []
      }, {
        op: 'function',
        type: 'struct S*',
        name: 'b',
        args: [{
          type: 'char*',
          name: 'c'
        }],
        body: []
      }, {
        op: 'function',
        type: 'double',
        name: 'd',
        args: [{
          type: 'unsigned int',
          name: 'e'
        }, {
          type: 'int',
          name: 'f'
        }, {
          type: 'char*',
          name: 'g'
        }],
        body: [{
          op: '{}',
          body: []
        }]
      }]
    }
    parseAndCompare(source, target)
  })

  it('should parse common statements', () => {
    var source = `
      int main() {
        struct A* a = 0;
        if(1);
        if (2) 3; else if(4) {
          5;
        } else {
          6;
        }
        while(7)while ( 8 ) { 9; }
        for(;;)for ( 11 ; 12 ; 13 ) {
          14;
          break;
          continue ;
        }
        ;
        return a;
      }
    `
    var target = {
      body: [{
        op: 'function',
        type: 'int',
        name: 'main',
        args: [],
        body: [{
          op: 'def',
          type: 'struct A*',
          body: [{
            name: 'a',
            value: {
              op: 'int',
              value: 0,
            }
          }]
        }, {
          op: 'if',
          cond: {
            op: 'int',
            value: 1,
          },
          body: {
            op: '{}',
            body: []
          },
          elseBody: null
        }, {
          op: 'if',
          cond: {
            op: 'int',
            value: 2,
          },
          body: {
            op: 'int',
            value: 3,
          },
          elseBody: {
            op: 'if',
            cond: {
              op: 'int',
              value: 4
            },
            body: {
              op: '{}',
              body: [{
                op: 'int',
                value: 5
              }]
            },
            elseBody: {
              op: '{}',
              body: [{
                op: 'int',
                value: 6
              }]
            }
          }
        }, {
          op: 'while',
          cond: {
            op: 'int',
            value: 7,
          },
          body: {
            op: 'while',
            cond: {
              op: 'int',
              value: 8,
            },
            body: {
              op: '{}',
              body: [{
                op: 'int',
                value: 9,
              }]
            }
          }
        }, {
          op: 'for',
          init: null,
          cond: null,
          step: null,
          body: {
            op: 'for',
            init: {
              op: 'int',
              value: 11,
            },
            cond: {
              op: 'int',
              value: 12,
            },
            step: {
              op: 'int',
              value: 13,
            },
            body: {
              op: '{}',
              body: [{
                op: 'int',
                value: 14,
              }, {
                op: 'break'
              }, {
                op: 'continue'
              }]
            }
          }
        }, {
          op: '{}',
          body: []
        }, {
          op: 'return',
          body: {
            op: 'var',
            name: 'a'
          }
        }]
      }]
    }
    parseAndCompare(source, target)
  })

  it('should parse common expressions', () => {
    var source = `
      int main() {
        a == +1 % 0 - 2u / 0;
        b[3].child->point = 4.0 * -5.7L;
        (aaa) && a | f(b1, b2) & (~~c ^ !d);
        m ? n != p || q > s && t <= x : y << z;
      }
    `
    var target ={
      "body": [
        {
          "op": "function",
          "type": "int",
          "name": "main",
          "args": [],
          "body": [
            {
              "op": "==",
              "left": {
                "op": "var",
                "name": "a"
              },
              "right": {
                "op": "+-",
                "body": [
                  {
                    "op": "*/%",
                    "body": [
                      {
                        "op": "+n",
                        "body": {
                          "op": "int",
                          "value": 1
                        }
                      },
                      {
                        "op": "%",
                        "body": {
                          "op": "int",
                          "value": 0
                        }
                      }
                    ]
                  },
                  {
                    "op": "-",
                    "body": {
                      "op": "*/%",
                      "body": [
                        {
                          "op": "unsigned int",
                          "value": 2
                        },
                        {
                          "op": "/",
                          "body": {
                            "op": "int",
                            "value": 0
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            },
            {
              "op": "=",
              "left": {
                "op": "member",
                "body": [
                  "b",
                  {
                    "op": "[]",
                    "body": {
                      "op": "int",
                      "value": 3
                    }
                  },
                  {
                    "op": ".",
                    "body": "child"
                  },
                  {
                    "op": "->",
                    "body": "point"
                  }
                ]
              },
              "right": {
                "op": "*/%",
                "body": [
                  {
                    "op": "float",
                    "value": 4
                  },
                  {
                    "op": "*",
                    "body": {
                      "op": "-n",
                      "body": {
                        "op": "double",
                        "value": 5.7
                      }
                    }
                  }
                ]
              }
            },
            {
              "op": "&&",
              "body": [
                {
                  "op": "()",
                  "body": {
                    "op": "var",
                    "name": "aaa"
                  }
                },
                {
                  "op": "|",
                  "body": [
                    {
                      "op": "var",
                      "name": "a"
                    },
                    {
                      "op": "&",
                      "body": [
                        {
                          "op": "f()",
                          "args": [
                            {
                              "op": "var",
                              "name": "b1"
                            },
                            {
                              "op": "var",
                              "name": "b2"
                            }
                          ]
                        },
                        {
                          "op": "()",
                          "body": {
                            "op": "^",
                            "body": [
                              {
                                "op": "~n",
                                "body": {
                                  "op": "~n",
                                  "body": {
                                    "op": "var",
                                    "name": "c"
                                  }
                                }
                              },
                              {
                                "op": "!n",
                                "body": {
                                  "op": "var",
                                  "name": "d"
                                }
                              }
                            ]
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "op": "?:",
              "cond": {
                "op": "var",
                "name": "m"
              },
              "body": {
                "op": "||",
                "body": [
                  {
                    "op": "!=",
                    "left": {
                      "op": "var",
                      "name": "n"
                    },
                    "right": {
                      "op": "var",
                      "name": "p"
                    }
                  },
                  {
                    "op": "&&",
                    "body": [
                      {
                        "op": ">null",
                        "left": {
                          "op": "var",
                          "name": "q"
                        },
                        "right": {
                          "op": "var",
                          "name": "s"
                        }
                      },
                      {
                        "op": "<=",
                        "left": {
                          "op": "var",
                          "name": "t"
                        },
                        "right": {
                          "op": "var",
                          "name": "x"
                        }
                      }
                    ]
                  }
                ]
              },
              "elseBody": {
                "op": "<<",
                "left": {
                  "op": "var",
                  "name": "y"
                },
                "right": {
                  "op": "var",
                  "name": "z"
                }
              }
            }
          ]
        }
      ]
    }
    parseAndCompare(source, target)
  })

})
