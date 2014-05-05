String.prototype.format = function () {
  var formatted = this;
  for (var i = 0; i < arguments.length; i++) {
    formatted = formatted.replace(
      RegExp('\\{' + i + '\\}', 'g'), arguments[i]);
  }
  return formatted;
};

var mongoose = require('mongoose');
var core = require('../core/base');
var settings = require('./settings');

mongoose.connect(settings.mongo);

module.exports = {
  settings: settings,
  mongoose: mongoose
};