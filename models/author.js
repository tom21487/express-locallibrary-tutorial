var moment = require('moment');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let AuthorSchema = new Schema(
  {
    first_name: {type: String, required: true, max: 100},
    family_name: {type: String, required: true, max: 100},
    date_of_birth: {type: Date},
    date_of_death: {type: Date},
  }
);

// virtual for author's full name (virtuals are not saved to MongoDB)
AuthorSchema
.virtual('name')
.get(function() {
  var fullname = '';
  if (this.first_name && this.family_name) {
    fullname = this.family_name + ', ' + this.first_name;
  }
  if (!this.first_name || !this.family_name) {
    fullname = '';
  }
  return fullname;
});

// virtual for formatted date
AuthorSchema
.virtual('date_of_birth_formatted')
.get(function() {
  return this.date_of_birth ? moment(this.date_of_birth).format('YYYY-MM-DD') : '';
});

AuthorSchema
.virtual('date_of_death_formatted')
.get(function() {
  return this.date_of_death ? moment(this.date_of_death).format('YYYY-MM-DD') : '';
});

// virtual for author's lifespan
AuthorSchema
.virtual('lifespan')
.get(function() {
  return this.date_of_birth_formatted + ' - ' + this.date_of_death_formatted;
});

// virtual for author's lifespan
/*AuthorSchema
.virtual('lifespan')
.get(function() {
  let date_of_birth_formatted = this.date_of_birth ? moment(this.date_of_birth).format('YYYY-MM-DD') : '';
  let date_of_death_formatted = this.date_of_death ? moment(this.date_of_death).format('YYYY-MM-DD') : '';
  return date_of_birth_formatted + ' - ' + date_of_death_formatted;
});*/

// virtual for author's URL
AuthorSchema
.virtual('url')
.get(function() {
  return '/catalog/author/' + this._id;
});

// export model
module.exports = mongoose.model('Author', AuthorSchema);
