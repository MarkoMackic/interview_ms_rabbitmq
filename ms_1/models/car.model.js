module.exports = mongoose => {
  var schema = mongoose.Schema(
    {
      name: {type: String, required: true},
      description: {type: String, required: true},
      year: {type:Number, required: true},
      engineSpecs: {
          horsepower: {type: Number, default: -1},
          cylinders: {type: Number, default: -1},
      }
    },
    { timestamps: true }
  );

  schema.index({name: 1, description: 1, year:1}, {unique: true})
  
  schema.method("toJSON", function() {
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  return mongoose.model("car", schema);
};