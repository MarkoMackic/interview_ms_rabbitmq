module.exports = mongoose => {
    var schema = mongoose.Schema(
      {
        firstname: {type: String, required: true},
        lastname: {type: String, required: true},
        birthDate: {type: Date, required: true},
        email: {type: String, requried: true}
      },
      { timestamps: true }
    );

    schema.index({firstname: 1, lastname: 1, email:1}, {unique: true})
    
    schema.method("toJSON", function() {
      const { __v, _id, ...object } = this.toObject();
      object.id = _id;
      return object;
    });

    return mongoose.model("driver", schema);
};