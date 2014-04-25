var Request = require('request');
var cheerio = require('cheerio');
var money = require('money');
var _ = require('lodash');
var when = require('when');

var Country = require('./model/country.js');

// Wrap 'request' HTTP call to return promise
function request(url, json) {
  json = json || false;
  return when.promise(function(resolve, reject) {
    Request({url:url, json:json}, function (err, res, body) {
      if (err) {
        return reject(err);
      } else if (res.statusCode !== 200) {
        err = new Error("Unexpected status code: " + res.statusCode);
        err.res = res;
        return reject(err);
      }
      resolve(body);
    });
  });
}

function init(){
  getCountries();
  getLatestCurrencyRates();
}

function getCountries(){
  var countryList = "https://www.spotify.com/select-your-country/";
  request(countryList)
    .then(function(body){
      $ = cheerio.load(body);

      var items = $('li.country-item a');
      console.log(items.length + ' country-items');

      _.each(items, function(element){
        handleSingleCountry(element);
      });
    })
    .catch(function(error){
      console.log(error);
    });
}

function handleSingleCountry(elem){
  var country = {
    link: $(elem).attr('href'),
    title: $(elem).attr('title'),
    originalRel: $(elem).attr('rel')
  };

  country.rel = country.originalRel.split('-')[0];

  // Handle UK edge-case
  if(country.rel === 'uk')
    country.rel = 'gb';

  var currencyCode = getCountryCurrencyCode(country.rel);
  var spotifyPrice = getSpotifyPrice(country.link).then(formatSpotifyPrice);

  when.all([currencyCode, spotifyPrice])
    .then(function(data){
      country.currency = data[0];

      var spotify = data[1];
      country.originalPrice = spotify.original;
      country.price = spotify.formatted;

      return when.resolve(country);
    })
    .then(convertPriceToUSD)
    .then(saveCountry)
    .then(function(data){
      
    })
    .catch(function(error){
      console.log(error);
      throw error;
    });
}

function getCountryCurrencyCode(code){
  var url = "http://restcountries.eu/rest/v1/alpha/" + code;

  return request(url, true)
    .then(function(data){
      if(!data.currencies){
        var error = new Error(code + ' is missing currency data');
        error.res = data;
        throw error;
      }

      if(data.currencies && data.currencies.length)
        // Handle Switzerland
        if(code === "ch")
          return "CHF";

        // Handle Chile
        if(code === "cl")
          return "CLP";

        // Handle Hungary
        if(code === "hu" || code === "is" || code === "cz" || code === "lt" || code === "bg")
          return "EUR";

        // Handle all countries displaying price in USD
        if(code === "uy" || code === "py" || code === "cr" || code === "do" || code === "ni" || code === "hn" || code === "sv" || code === "gt" || code === "bo")
          return "USD";

        return data.currencies[0];
    });
}

function getSpotifyPrice(link){
  var url = "https://www.spotify.com" + link;
  return request(url)
    .then(function(body){
      $ = cheerio.load(body);
      var price = $('#premium-tier .premium-price').text();

      return price;
    });
}

function formatSpotifyPrice(price){
  var formattedPrice = price.match(/([1-9](?:\d*)(?:,\d{2})*(?:\.\d*[1-9])?)/g)[0];
  var formattedPrice = formattedPrice.replace(',', '.');

  var spotify = {
    original: price,
    formatted: formattedPrice
  };

  return spotify;
}

function convertPriceToUSD(country){
  return when.promise(function(resolve, reject){
    if(!country.currency){
      console.log(country);
      reject('Missing currency');
    }
    var converted = money.convert(country.price, {from: country.currency, to: 'USD'});

    country.convertedPrice = converted;
    resolve(country);
  });
}

function saveCountry(country){
  console.log('Inserting country ' + country.title + '(' + country.currency + ')');

  var storedCountry = new Country(country);
  return when.promise(function(resolve, reject){
    storedCountry.save(function(err){
      if(err)
        throw reject(err);

      resolve(country);
    });
  });
}

// Get latest currency rates from Open Exchange Rates
function getLatestCurrencyRates(){
  var currencyApi = "http://openexchangerates.org/api/latest.json?app_id=0239e164a3cb415f8fcf72d9a9cc2f2d";
  request(currencyApi, true)
    .then(function(data){

      money.base = data.rates;
      money.rates = data.rates;
    })
    .catch(function(error){
      console.log(error);
    });
}

init();