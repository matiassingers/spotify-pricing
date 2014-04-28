var mongoose = require('mongoose');
var core = require('../core/base');
var settings = core.settings;

mongoose.connect(settings.mongo);
var Country = mongoose.model('Country', {
  title: String,
  link: String,
  originalRel: String,
  rel: String,
  currency: String,
  originalCurrency: String,
  countryCode: String,
  internationalName: String,
  region: String,
  subRegion: String,
  demonym: String,
  originalPrice: String,
  price: Number,
  convertedPrice: Number,
  gdp: Number,
});

module.exports = Country;