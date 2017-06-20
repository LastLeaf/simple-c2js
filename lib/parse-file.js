var fs = require('fs')
var path = require('path')
var CompilationError = require('./error-obj').CompilationError

module.exports = function(parser, filename){
  var parseFile = function(filename){
    var str = fs.readFileSync(filename, {encoding: 'utf8'})
    var tree = parser.parse(str)
    for(var i = 0; i < tree.body.length; i++){
      var item = tree.body[i]
      if(item.op === 'macro' && item.name === 'include') {
        var matches = item.body.match(/^\s*["<]([^"\r\n\\]+)[">]\s*$/)
        if(!matches) throw new CompilationError('Unrecognized include macro: ' + item.body)
        var subtree = parseFile(path.resolve(filename, '..', matches[1]))
        var diff = subtree.body.length - 1
        subtree.body.unshift(i, 1)
        tree.body.splice.apply(tree.body, subtree.body)
        i += diff
      }
    }
    return tree
  }
  return parseFile(path.resolve(filename))
}
