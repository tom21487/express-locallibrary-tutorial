const validator = require('express-validator');
var async = require('async');
var Book = require('../models/book');
var Genre = require('../models/genre');

// Display list of all Genre.
exports.genre_list = function(req, res) {
    Genre.find()
    //.populate('genre')
    .sort([['name', 'ascending']])
    .exec(function(err, list_genres) {
    if (err) {
      return next(err);
    }
    res.render('genre_list', {
        title: 'Genre List',
        genre_list: list_genres
    });
  });
};

// Display detail page for a specific Genre.
exports.genre_detail = function(req, res, next) {
    async.parallel({
        genre: function(callback) {
            Genre.findById(req.params.id)
            .exec(callback);
            // execute callback to show that this parallel function is complete
        },
        genre_books: function(callback) {
            Book.find({ 'genre': req.params.id })
            .exec(callback);
        },
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (results.genre == null) {
            var err = new Error('Genre not found');
            err.status = 404;
            return next(err);
        }
        res.render('genre_detail', {
            title: 'Genre Detail',
            genre: results.genre,
            genre_books: results.genre_books
        });
    });
};

// Display Genre create form on GET.
exports.genre_create_get = function(req, res) {
    res.render('genre_form', { title: 'Create Genre' });
};

// Handle Genre create on POST.
exports.genre_create_post = [
    // note the usage of commas because we are using an array of middleware functions
    // the array is passed to the router function and each method is called in order
    // this approach is needed because the sanitisers/validators are middleware functions!

    // array[0]: validate that the name field is not empty
    //  (trim removes whitespace from both ends of a string) (only before validation)
    validator.body('name', 'Genre name required').trim().isLength({ min: 1 }),
    
    // array[1]: sanitize the name field
    validator.sanitizeBody('name').escape(),

    // array[2]: process request after validation and sanitization
    (req, res, next) => {
        // extract the validation errors from a request
        const errors = validator.validationResult(req);

        // create a genre object with escaped and trimmed data
        var genre = new Genre({
            name: req.body.name
        });

        if (!errors.isEmpty()) {
            // there are errors. render the form again with sanitized values/error messages.
            res.render('genre_form', {
                title: 'Create Genre',
                genre: genre,
                errors: errors.array()
            });
            return;
        }
        else {
            // data from form is valid
            // check if genre with same name already exists
            Genre.findOne({ 'name': req.body.name })
            .exec(function(err, found_genre) {
                if (err) {
                    return next(err);
                }
                if (found_genre) {
                    // genre exists, redirect to its detail page
                    res.redirect(found_genre.url);
                }
                else {
                    // add genre to database
                    genre.save(function(err) {
                        if (err) {
                            return next(err);
                        }
                        res.redirect(genre.url);
                    });
                }
            });
        }
    }
];

// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res, next) {
    async.parallel({
        genre: function(callback) {
            Genre.findById(req.params.id).exec(callback);
        },
        genres_books: function(callback) {
            Book.find({
                'genre': req.params.id
            }).exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (results.genre==null) {
            res.redirect('/catalog/genres');
        }
        res.render('genre_delete', {
            title: 'Delete Genre',
            genre: results.genre,
            genre_books: results.genres_books
        });
    });
};

// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res, next) {
    async.parallel({
        genre: function(callback) {
            Genre.findById(req.body.genreid).exec(callback);
        },
        genres_books: function(callback) {
            Book.find({
                'genre': req.body.genreid
            }).exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (results.genres_books.length > 0) {
            // Genre has books. Render in same way as for GET route.
            res.render('genre_delete', {
                title: 'Delete Genre',
                genre: results.genre,
                genre_books: results.genre_books
            });
            return;
        } else {
            // Genre has no books. Delete object and redirect to the list of genres.
            Genre.findByIdAndRemove(req.body.genreid, function deleteGenre(err) {
                if (err) {
                    return next(err);
                }
                res.redirect('/catalog/genres');
            });
        }
    });
};

// Display Genre update form on GET.
exports.genre_update_get = function(req, res, next) {
    // Get genre for form (you technically don't need async)
    async.parallel({
        genre: function(callback) {
            Genre.findById(req.params.id).exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (results.genre==null) {
            var err = new Error('Genre not found');
            err.status = 404;
            return next(err);
        }
        res.render('genre_form', {
            title: 'Update Genre',
            genre: results.genre
        });
    });
};

// Handle Genre update on POST.
exports.genre_update_post = [
    // Validate fields
    validator.body('name', 'Genre name required.').trim().isLength({ min: 1 }),

    // Sanitize fields
    validator.sanitizeBody('name').escape(),

    // Process request after validation and sanitization
    (req, res, next) => {
        // Extract the validation errors from a request.
        const errors = validator.validationResult(req);

        // Create a Genre object with escaped/trimmed data and old id
        var genre = new Genre({
            name: req.body.name,
            _id: req.params.id
        });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.
            res.render('genre_form', {
                title: 'Update Genre',
                genre: genre,
                errors: errors.array()
            });
            return;
        } else {
            // Data from form is valid. Update the record.
            Genre.findByIdAndUpdate(req.params.id, genre, {}, function(err, thegenre) {
                if (err) {
                    return next(err);
                }
                res.redirect(thegenre.url);
            });
        }
    }
];