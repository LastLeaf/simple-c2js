function CompilationError(message, location) {
  this.name = 'CompilationError'
  this.message = message
  this.location = location
  this.stack = (new Error()).stack
}
CompilationError.prototype = Object.create(Error.prototype)

exports.CompilationError = CompilationError
