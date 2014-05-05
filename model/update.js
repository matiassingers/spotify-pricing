var core = require('../core/base');
var mongoose = core.mongoose;

var Update = mongoose.model('Update', {
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = Update;