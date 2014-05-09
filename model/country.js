var core = require('../core/base');
var mongoose = core.mongoose;

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
  catalogSize: Number
});

module.exports = Country;