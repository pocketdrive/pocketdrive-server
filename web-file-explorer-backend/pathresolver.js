/*jslint node: true */

module.exports.pathGuard = function(path) {
  return path.replace(/\.\.\//g,'');
};