var port = process.env.PORT || 3000;

var mongo = process.env.MONGOLAB_URI || 'mongodb://localhost/spotify';

module.exports = {
  port: port,
  mongo: mongo
};