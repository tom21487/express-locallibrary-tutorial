const validator = require('express-validator');
var Book = require('../models/book');
var Author = require('../models/author');
var Genre = require('../models/genre');
var BookInstance = require('../models/bookinstance');

var async = require('async');

exports.index = function(req, res) {
    async.parallel({
        book_count: function(callback) {
            Book.countDocuments({}, callback);
        },
        book_instance_count: function(callback) {
            BookInstance.countDocuments({}, callback);
        },
        book_instance_available_count: function(callback) {
            BookInstance.countDocuments({status: 'Available'}, callback);
        },
        author_count: function(callback) {
            Author.countDocuments({}, callback);
        },
        genre_count: function(callback) {
            Genre.countDocuments({}, callback);
        },
    }, function(err, results) {
        res.render('index', { title: 'Local Library Home', error: err, data: results});
    });
};

// Display list of all books.
exports.book_list = function(req, res, next) {
    Book.find({}, 'title author')
    .populate('author') // use populate to replace id with model data, (kind of like dereferencing a pointer)
    .exec(function(err, list_books) {
        if (err) {
            return next(err); // see here: http://expressjs.com/en/guide/error-handling.html
        }
        // id and virtuals are also passed to view engine
        res.render('book_list', { title: 'Book List', book_list: list_books});
    });
};

// Display detail page for a specific book.
exports.book_detail = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id)
            .populate('author')
            .populate('genre')
            .exec(callback);
        },
        book_instance: function(callback) {
            BookInstance.find({ 'book': req.params.id })
            .exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (results.book==null) {
            var err = new Error('Book not found');
            err.status = 404;
            return next(err);
        }
        res.render('book_detail', { title: results.book.title, book: results.book, book_instances: results.book_instance });
    });
};

// Display book create form on GET.
exports.book_create_get = function(req, res, next) {
    // Get all authors and genres, which we can use for adding to our book.
    async.parallel({
        authors: function(callback) {
            Author.find(callback);
        },
        genres: function(callback) {
            Genre.find(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        res.render('book_form', {
            title: 'Create Book',
            authors: results.authors,
            genres: results.genres
        });
    });
};

// Handle book create on POST.
exports.book_create_post = [
    // Convert the genre to an array.
    (req, res, next) => {
        // If not array, convert to array.
        if (!(req.body.genre instanceof Array)) {
            // If undefined, make empty array.
            if (typeof req.body.genre === 'undefined') {
                //req.body.genre=[];
            } else { // If not undefined, do normal array conversion.
                req.body.genre = new Array(req.body.genre);
            }
        }
        next();
    },
    validator.sanitizeBody('genre.*').escape(),
    
    // Validate fields.
    validator.body('title', 'Title must not be empty.').trim().isLength({ min: 1 }),
    validator.body('author', 'Author must not be empty.').trim().isLength({ min: 1 }),
    validator.body('summary', 'Summary must not be empty.').trim().isLength({ min: 1 }),
    validator.body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }),

    // Sanitize fields (using wildcard).
    //  This escapes all fields in one go.
    validator.sanitizeBody('*').escape(),
    
    // Process request after validation and sanitization.
    (req, res, next) => {
        // Extract the validation errors from a request.
        const errors = validator.validationResult(req);

        // Create a Book object with escaped and trimmed data.
        var book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: (typeof req.body.genre==='undefined') ? [] : req.body.genre,
        });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.

            // Get all authors and genres for form.
            async.parallel({
                authors: function(callback) {
                    Author.find(callback);
                },
                genres: function(callback) {
                    Genre.find(callback);
                }
            }, function(err, results) {
                if (err) {
                    return next(err);
                }

                // Mark our genres selected by the user as checked
                for (let i = 0; i < results.genres.length; i++) {
                    // book.genre is req.body.genre, so it's an array of genre ids, ex. [1q2w3e4r, 1a2b3c4d]
                    // results.genres[i] is an element in Genre.find(), so it's an object that contains an id
                    // indexOf(_id) finds the index of the id, ex. indexOf(1q2w3e4r) = 0
                    if (book.genre.indexOf(results.genres[i]._id) > -1) {
                        results.genres[i].checked='true';
                    }
                }
                res.render('book_form', {
                    title: 'Create Book',
                    authors: results.authors,
                    genres: results.genres,
                    book: book,
                    errors: errors.array()
                });
            });
            return;
        } else {
            // Data from form is valid. Save book.
            book.save(function(err) {
                if (err) {
                    return next(err);
                }
                // successful - redirect to new book record.
                res.redirect(book.url);
            });
        }
    }
];

// Display book delete form on GET.
exports.book_delete_get = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            // now book.author and book.genre are actual objects, not id's
            Book.findById(req.params.id).populate('author').populate('genre').exec(callback);
        },
        books_bookinstances: function(callback) {
            BookInstance.find({
                'book': req.params.id
            }).populate('book').exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (results.book==null) {
            res.redirect('/catalog/books');
        }
        res.render('book_delete', {
            title: 'Delete Book',
            book: results.book,
            book_bookinstances: results.books_bookinstances
        });
    });
};

// Handle book delete on POST.
exports.book_delete_post = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            // now book.author and book.genre are actual objects, not id's
            Book.findById(req.params.id).populate('author').populate('genre').exec(callback);
        },
        books_bookinstances: function(callback) {
            BookInstance.find({
                'book': req.params.id
            }).populate('book').exec(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (results.books_bookinstances.length > 0) {
            // Book has bookinstances. Render in same way as for GET route.
            res.render('book_delete', {
                title: 'Delete Book',
                book: results.book,
                book_bookinstances: results.books_bookinstances
            });
            return;
        } else {
            // Book has no bookinstances. Delete object and redirect to the list of books.
            Book.findByIdAndRemove(req.body.bookid, function deleteBook(err) {
                if (err) {
                    return next(err);
                }
                res.redirect('/catalog/books');
            });
        }
    });
};

// Display book update form on GET.
exports.book_update_get = function(req, res, next) {
    // Get book, authors and genres for form.
    async.parallel({
        book: function(callback) {
            // now book.author and book.genre are actual objects, not id's
            Book.findById(req.params.id).populate('author').populate('genre').exec(callback);
        },
        authors: function(callback) {
            // The user can update the author of the book by choosing from the list of all authors
            Author.find(callback);
        },
        genres: function(callback) {
            Genre.find(callback);
        }
    }, function(err, results) {
        if (err) {
            return next(err);
        }
        if (results.book==null) {
            var err = new Error('Book not found');
            err.status = 404;
            return next(err);
        }
        // Success.
        // Mark our selected genres as checked.
        for (var all_g_iter = 0; all_g_iter < results.genres.length; all_g_iter++) {
            for (var book_g_iter = 0; book_g_iter < results.book.genre.length; book_g_iter++) {
                if (results.genres[all_g_iter]._id.toString()==results.book.genre[book_g_iter]._id.toString()) {
                    // Any genres in the genre list that match the user-selected book's genres will be marked as checked
                    results.genres[all_g_iter].checked='true';
                }
            }
        }
        res.render('book_form', {
            title: 'Update Book',
            authors: results.authors,
            genres: results.genres,
            book: results.book
        });
    });
};

// Handle book update on POST.
exports.book_update_post = [
    // Convert the genre to an array
    (req, res, next) => {
        if (!(req.body.genre instanceof Array)) {
            if (typeof req.body.genre==='undefined') {
                req.body.genre=[];
            } else {
                req.body.genre=new Array(req.body.genre);
            }
        }
        next();
    },

    // Validate fields
    validator.body('title', 'Title must not be empty.').trim().isLength({ min: 1 }),
    validator.body('author', 'Author must not be empty.').trim().isLength({ min: 1 }),
    validator.body('summary', 'Summary must not be empty').trim().isLength({ min: 1 }),
    validator.body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }),

    // Sanitize fields
    validator.sanitizeBody('title').escape(),
    validator.sanitizeBody('author').escape(),
    validator.sanitizeBody('summary').escape(),
    validator.sanitizeBody('isbn').escape(),
    validator.sanitizeBody('genre.*').escape(),

    // Process request after validation and sanitization.
    (req, res, next) => {
        // Extract the validation errors from a request.
        const errors = validator.validationResult(req);

        // Create a Book object with escaped/trimmed data and old id.
        var book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: (typeof req.body.genre==='undefined') ? [] : req.body.genre,
            _id: req.params.id
        });

        if (!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.

            // Get all authors and genres for form.
            async.parallel({
                authors: function(callback) {
                    Author.find(callback);
                },
                genres: function(callback) {
                    Genre.find(callback);
                }
            }, function(err, results) {
                if (err) {
                    return next(err);
                }
                // Mark our selected genres as checked
                for (let i = 0; i < results.genres.length; i++) {
                    if (book.genre.indexOf(results.genres[i]._id) > -1) {
                        results.genres[i].checked='true';
                    }
                }
                res.render('book_form', {
                    title: 'Update Book',
                    authors: results.authors,
                    genres: results.genres,
                    book: book,
                    errors: errors.array()
                });
            });
            return;
        } else {
            // Data from form is valid. Update the record.
            Book.findByIdAndUpdate(req.params.id, book, {}, function(err, thebook) {
                if (err) {
                    return next(err);
                }
                res.redirect(thebook.url);
            })
            // check that selecting no genres works (it probably won't)
            // ^jk it works!
        }
    }
];
