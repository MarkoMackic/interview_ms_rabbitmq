const common_confg = require('../common/cfg');
const {env} = require('process');

module.exports = Object.assign({
    serverConfig: {
        port: env.PORT || 5050,
        jwt_secret: env.JWT_SECRET || 'dummy-secret'
    }
}, common_confg) 
