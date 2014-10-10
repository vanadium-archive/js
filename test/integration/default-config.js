var wsprConfig = require('../services/config-wsprd');

module.exports = {
  wspr: 'http://localhost:' + wsprConfig.flags.port
};
