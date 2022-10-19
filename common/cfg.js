const { env } = require("process");

module.exports = {
    rabbitMQConfig: {
        url: env.RABBITMQ_URL || "amqp://localhost:5672",
        channels : {
            ms1_rpc : "microservice1_rpc",
            car_telemetry: "car_telemetry"
        }
    },
    dbConfig: {
        url: env.MONGODB_URL || "mongodb://localhost:27017/app_db"
    },
    opaConfig: {
        enabled: Boolean(env.OPA_ENABLED),
        url: env.OPA_URL || "http://localhost:8181/"
    }
}