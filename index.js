var express = require('express');
var Country = require('./model/country');
var core = require('./core/base');
var settings = core.settings;

var app = express();
app.use(express.static(__dirname + '/'));

app.get('/api/', function(req, res){
  res.set({'content-type': 'application/json; charset=utf-8'});
  getItems(function(items){
    res.send(items);
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
console.log('Listening on port {0}...'.format(settings.port));