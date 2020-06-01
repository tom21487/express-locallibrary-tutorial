const validator = require('express-validator');
var async = require('async');
var Book = require('../models/book');
var Author = require('../models/author');

// display list of all authors
exports.author_list = function(req, res, next) {
  Author.find()
  //.populate('author')
  .sort([['family_name', 'ascending']])
  .exec(function(err, list_authors) {
    if (err) {
      return next(err);
    }
    res.render('author_list', { title: 'Author List', author_list: list_authors });
  });
}

// display detail page for a specific author
exports.author_detail = function(req, res, next) {
  async.parallel({
    author: function(callback) {
      Author.findById(req.params.id)
      .exec(callback);
    },
    authors_books: function(callback) {
      Book.find({ 'author': req.params.id }, 'title summary')
      .exec(callback);
    }
  }, function(err, results) {
    if (err) {
      return next(err);
    }
    if (results.author==null) {
      var err = new Error('Author not found');
      err.status = 404;
      return next(err);
    }
    res.render('author_detail', {
      title: 'Author Detail',
      author: results.author,
      author_books: results.authors_books
    });
  });
}

// display author create form on GET
exports.author_create_get = function(req, res) {
  res.render('author_form', { title: 'Create Author' });
}

// handle author create on POST
exports.author_create_post = [
  // validate fields
  validator.body('first_name').isLength({ min: 1 }).trim().withMessage('First name must be specified.')
    .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
  validator.body('family_name').isLength({ min: 1 }).trim().withMessage('Family name must be specified.')
    .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
  // optional only runs subsequent validation if the specified field has been entered
  //  in this case the dates are optional values (see author.js, author_form.pug, also validator doesn't check if the dates are filled in)
  // checkFalsy means that null and empty strings can pass
  // isISO8601() checks that the date is valid
  validator.body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601(),
  validator.body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601(),

  // sanitize fields
  validator.sanitizeBody('first_name').escape(),
  validator.sanitizeBody('family_name').escape(),
  validator.sanitizeBody('date_of_birth').toDate(),
  validator.sanitizeBody('date_of_death').toDate(),

  // process request after validation and sanitization
  (req, res, next) => {
    // extract the validation errors from a request
    const errors = validator.validationResult(req);
    if (!errors.isEmpty()) {
      // there are errors. render form again with sanitized values/error messages
      res.render('author_form', {
        title: 'Create Author',
        author: req.body,
        errors: errors.array()
      });
      return;
    }
    else {
      // data from form is valid

      // we don't check whether the author object already exists before saving it.
      // arguably we should, though as it is now we can have multiple authors with
      // the same name.

      // create an author object with escaped and trimmed data
      var author = new Author({
        first_name: req.body.first_name,
        family_name: req.body.family_name,
        date_of_birth: req.body.date_of_birth,
        date_of_death: req.body.date_of_death
      });
      author.save(function(err) {
        if (err) {
          return next(err);
        }
        // successful - redirect to new author record
        res.redirect(author.url);
      });
    }
  }
]

// display author delete form on GET
exports.author_delete_get = function(req, res) {
  async.parallel({
    author: function(callback) {
      Author.findById(req.params.id).exec(callback);
    },
    authors_books: function(callback) {
      Book.find({'author': req.params.id}).exec(callback);
    },
  }, function(err, results) {
    if (err) {
      return next(err);
    }
    if (results.author==null) {
      // Author id is invalid, try again
      res.redirect('/catalog/authors');
    }
    res.render('author_delete', {
      title: 'Delete Author',
      author: results.author,
      author_books: results.authors_books
    });
  });
}

// handle author delete on POST
exports.author_delete_post = function(req, res, next) {
  async.parallel({
    author: function(callback) {
      Author.findById(req.body.authorid).exec(callback);
    },
    authors_books: function(callback) {
      Book.find({'author': req.body.authorid}).exec(callback);
    },
  }, function(err, results) {
    if (err) {
      return next(err);
    }
    if (results.authors_books.length > 0) {
      // Author has books. Render in same way as for GET route.
      // This will tell the user to delete books first
      res.render('author_delete', {
        title: 'Delete Author',
        author: results.author,
        author_books: results.authors_books
      });
      return;
    } else {
      // Author has no books. Delete object and redirect to the list of authors.
      Author.findByIdAndRemove(req.body.authorid, function deleteAuthor(err) {
        if (err) {
          return next(err);
        }
        res.redirect('/catalog/authors');
      });
    }
  });
}

// display author update form on GET
exports.author_update_get = function(req, res, next) {
  // Get author for form.
  async.parallel({
    author: function(callback) {
      Author.findById(req.params.id).exec(callback);
    }
  }, function(err, results) {
    if (err) {
      return next(err);
    }
    if (results.author==null) {
      var err = new Error('Author not found');
      err.status = 404;
      return next(err);
    }
    res.render('author_form', {
      title: 'Update Author',
      author: results.author
    });
  });
}

// handle author update on POST
exports.author_update_post = [
  // Validate fields
  validator.body('first_name').isLength({ min: 1 }).trim().withMessage('First name must be specified.')
    .isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
  validator.body('family_name').isLength({ min: 1 }).trim().withMessage('Family name must be specified.')
    .isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
  validator.body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true }).isISO8601(),
  validator.body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true }).isISO8601(),

  // Sanitize fields
  validator.sanitizeBody('first_name').escape(),
  validator.sanitizeBody('family_name').escape(),
  validator.sanitizeBody('date_of_birth').escape(),
  validator.sanitizeBody('date_of_death').escape(),

  // Process request after validation and sanitization
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validator.validationResult(req);

    // Create an Author object with escaped/trimmed data and old id.
    // Create an Author object with escaped and trimmed data.
    var author = new Author({
      first_name: req.body.first_name,
      family_name: req.body.family_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
      _id: req.params.id
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.
      res.render('author_form', {
        title: 'Update Author',
        author: author,
        errors: errors.array()
      });
    } else {
      // Data from form is valid. Update the record.
      Author.findByIdAndUpdate(req.params.id, author, {}, function(err, theauthor) {
        if (err) {
          return next(err);
        }
        res.redirect(theauthor.url);
      });
    }
  }
];
