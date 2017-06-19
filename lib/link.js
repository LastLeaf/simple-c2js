/* eslint-disable no-unused-vars, no-invalid-this */
var wrapper = function(heap, foreign){
  var stdlib = (function(){ return this })();
  return '$ASM_MODULE$';
}
/* eslint-enable no-unused-vars, no-invalid-this */

module.exports = function(str){
  return 'module.exports=' + wrapper.toString().replace('$ASM_MODULE$', str)
}
