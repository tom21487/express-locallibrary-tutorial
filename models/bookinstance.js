var moment = require('moment');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let BookInstanceSchema = new Schema(
  {
    book: {type: Schema.Types.ObjectId, ref: 'Book', required: true},
    imprint: {type: String, required: true},
    status: {type: String, required: true, enum: ['Available', 'Maintenance', 'Loaned', 'Reserved'], default: 'Maintenance'},
    due_back: {type: Date, default: Date.now},
  }
);

// virtual for bookinstance's URL
BookInstanceSchema
.virtual('url')
.get(function() {
  return '/catalog/bookinstance/' + this._id;
});

// virtual for formatted date
BookInstanceSchema
.virtual('due_back_formatted')
.get(function() {
  return moment(this.due_back).format('MMMM Do, YYYY');
});

BookInstanceSchema
.virtual('due_back_update_form')
.get(function() {
  return moment(this.due_back).format('YYYY-MM-DD');
});

// export model
module.exports = mongoose.model('BookInstance', BookInstanceSchema);
