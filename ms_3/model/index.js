const dbConfig = require("../cfg.js").dbConfig;

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = {};

db.mongoose = mongoose;

db.drivers = require("./driver.model.js")(mongoose);
db.faults = require("./fault.model.js")(mongoose);

module.exports = db;