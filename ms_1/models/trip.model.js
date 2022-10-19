const validate = require('mongoose-validator');
var id_validator = require('mongoose-id-validator');

module.exports = mongoose => {

    validateSimulation = [
      validate({
        validator: function (val) {
          return val === "RANDOM" || val === "ROUTE1";
        },
        message: 'Simulation field bust be "RANDOM" or "ROUTE1".',
      })
    ]

    var schema = mongoose.Schema(
      {
        trip_name: {type: String, required: true},
        trip_simulation: {type: String, required: true, validate: validateSimulation},
        car: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'car',
            required: true
        },
        driver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'driver',
            required: true
        }
      },
      { timestamps: true }
    );

    schema.index({trip_name: 1}, {unique: true})

    schema.plugin(id_validator);
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });

    return mongoose.model("trip", schema);
};