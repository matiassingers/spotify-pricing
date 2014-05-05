var _ = require('lodash');
var when = require('when');
var spotify = require('spotify-crawler');
var request = require('promise-request');

var Country = require('./model/country');
var Update = require('./model/update');


spotify.fetch()
  .then(getGDPData)
  .then(saveCountries)
  .then(updateTime)
  .catch(console.log);


function getGDPData(countries){
  // GDP per capita, PPP (current international $) - 2008
  var url = "http://api.worldbank.org/countries/all/indicators/NY.GDP.PCAP.PP.CD?format=json&date=2009:2009&per_page=300";

  return request(url, true)
    .then(function(data){
      var results = data[1];

      _.each(results, function(result){
        var country = _.find(countries, function(country){
          return country.rel === result.country.id.toLowerCase();
        });

        if(country)
          country.gdp = result.value;
      });

      return countries;
    });
}

function saveCountries(countries){
  console.log('Inserting {0} countries in DB'.format(countries.length));

  var save = Country.create(countries)
    .then(function(){
      console.log('yay success!!');
    });

  return save;
}

function updateTime(){
  var record = new Update();

  record.save();
}

function saveCountry(country){
  console.log('Inserting country {0}({1})'.format(country.title, country.currency));

  var storedCountry = new Country(country);
  return when.promise(function(resolve, reject){
    storedCountry.save(function(err){
      if(err)
        throw reject(err);

      resolve(country);
    });
  });
}