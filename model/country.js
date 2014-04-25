var mongoose = require('mongoose');
var settings = require('../core/settings');

mongoose.connect(settings.mongo);
var Country = mongoose.model('Country', {
  title: String,
  link: String,
  originalRel: String,
  rel: String,
  currency: String,
  originalPrice: String,
  price: Number,
  convertedPrice: Number
});

module.exports = Country;