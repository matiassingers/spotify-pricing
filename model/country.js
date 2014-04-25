var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/spotify');
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