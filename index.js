var express = require('express');
var Country = require('./model/country.js');
var settings = require('../core/settings');

var app = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.get('/api/', function(req, res){
  res.set({'content-type': 'application/json; charset=utf-8'});
  getItems(function(items){
    res.send(items);
  });
});

app.get('/', function(req, res){
  getItems(function(items){
    res.render('index',
      {
        data : items
      }
    )
  });
});

function getItems(callback){
  Country
    .find({})
    .sort('convertedPrice')
    .exec(function(err, items){
      if(err)
        throw err;

      callback(items);
    });
}

app.listen(settings.port);
console.log('Listening on port ' + settings.port + '...');