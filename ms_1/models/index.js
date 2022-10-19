const dbConfig = require("../cfg.js").dbConfig;

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};

db.mongoose = mongoose;
db.cars = require("./car.model.js")(mongoose);
db.drivers = require("./driver.model.js")(mongoose);
db.trips = require("./trip.model.js")(mongoose);

module.exports = db;