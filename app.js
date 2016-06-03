var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

module.exports = function (config) {
	var app = express();
	// view engine setup
	app.set('views', path.join(__dirname, 'views'));
	app.set('view engine', 'ejs');

	app.use(favicon());
	app.use(logger('dev'));
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded());
	app.use(cookieParser());
	app.use(express.static(path.join(__dirname, 'public')));

	app.get('/', function (req, res) {
		var template = {
			images: [
                "/images/brisbane.jpg",
                "/images/test.jpg",
                "/images/portraitcat.jpg",
                "/images/monster.png",
                "/images/wat.jpg"
            ],
			tests: [
                "",
                "crop=16x9",
                "resize=500x100",
                "resize=100x100&crop=16x9",
                "crop=1x1",
                "quality=50",
                "sx=100&sy=100&sw=100&sh=100",
                "sx=0&sy=0&sw=200&sh=200",
            ]
		};
		res.render(__dirname + '/public/index.ejs', template);
	});

	try {
		require('fs').mkdirSync('.tmp');
	} catch(e) {};

	try {
		require('fs').mkdirSync('.tmp/immp');
	} catch(e) {};

	app.use('/im/*', require('./src')(config));

	/// catch 404 and forward to error handler
	app.use(function (req, res, next) {
		var err = new Error('Not Found');
		err.status = 404;
		next(err);
	});

	/// error handlers

	// development error handler
	// will print stacktrace
	if(app.get('env') === 'development') {
		app.use(function (err, req, res, next) {
			res.status(err.status || 500);
			res.render('error', {
				message: err.message,
				error: err
			});
		});
	}

	// production error handler
	// no stacktraces leaked to user
	app.use(function (err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: {}
		});
	});

	return app;
}
