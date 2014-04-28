var _ = require('lodash');
var when = require('when');
var spotify = require('spotify-crawler');

var Country = require('./model/country');


spotify.fetch()
  .then(saveCountries)
  .catch(console.log);

function saveCountries(countries){
  console.log('Inserting {0} countries in DB'.format(countries.length));

  var save = Country.create(countries)
    .then(function(){
      console.log('yay success!!');
    })
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