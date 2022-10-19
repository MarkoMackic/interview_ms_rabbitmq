const common_config = require('../common/cfg');
const {env} = require("process");

module.exports = Object.assign({
    serverConfig: {
        port: env.PORT || 5051
    }
}, common_config);
