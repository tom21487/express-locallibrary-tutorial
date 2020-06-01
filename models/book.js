const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let BookSchema = new Schema(
  {
    title: {type: String, required: true},
    author: {type: Schema.Types.ObjectId, ref: 'Author', require: true},
    summary: {type: String, required: true},
    isbn: {type: String, required: true},
    genre: [{type: Schema.Types.ObjectId, ref: 'Genre'}],
  }
);

// virtual for book's url
BookSchema
.virtual('url')
.get(function() {
  return '/catalog/book/' + this._id;
});

// export model
module.exports = mongoose.model('Book', BookSchema);