var id_validator = require('mongoose-id-validator');

module.exports = mongoose => {

    var schema = mongoose.Schema(
      {
        driver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'driver',
            required: true
        },
        points: { type: Number, default: 0 }
      },
      { timestamps: true }
    );

    schema.index({driver: 1}, {unique: true})

    schema.plugin(id_validator);
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });

    return mongoose.model("fault", schema);
};