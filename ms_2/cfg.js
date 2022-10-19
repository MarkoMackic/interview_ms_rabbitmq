const common_confg = require('../common/cfg');
const {env} = require('process');

module.exports = Object.assign({
    serverConfig: {
        port: env.PORT || 4040
    }
}, common_confg)

