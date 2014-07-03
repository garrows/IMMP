var _ = require('underscore'),
	async = require('async'),
	cast = require('sc-cast'),
	crypto = require('crypto'),
	fs = require('fs'),
	gm = require('gm'),
	http = require('http'),
	request = require('request');

module.exports = function(_config) {
	var config = _.extend({

		cacheFolder: process.cwd() + '/.tmp',
		ttl: 1000 * 60 * 60 * 24 * 7 // 1 week

	}, _config);

	return function(_req, _res, _next) {
		var dimensions = _req.query.resize || '0x0';

		var gmOptions = {
			imageMagick: true
		};

		var image = {
			location: _req.params['0'],
			resize: {
				width: cast(_.first(dimensions.match(/^[^x]+/)), 'number') || null,
				height: cast(_.first(dimensions.match(/[^x]+$/)), 'number') || null
			},
			crop: {
				width: 1,
				height: 1,
				x: 0,
				y: 0
			}
		};

		if (!/^https?\:/.test(image.location)) {
			image.location = image.location.trim().replace(/^\//, '');
			image.location = _req.protocol + '://' + _req.headers.host + '/' + image.location;
		}

		image.hash = crypto.createHash('sha1').update(JSON.stringify(image)).digest('hex');

		console.log(image);

		async.waterfall([

			/**
			 * If the image already exists and it's within the TTL range use it, otherwise continue
			 */
			function(_callback) {
				var stat,
					createdAt = 0,
					now = new Date().getTime();

				try {
					stat = fs.statSync(config.cacheFolder + '/' + image.hash);
					createdAt = cast(stat.mtime, 'date').getTime();
				} catch (e) {};

				if (stat && now - createdAt < config.ttl) {
					gm(config.cacheFolder + '/' + image.hash)
						.options(gmOptions)
						.stream()
						.pipe(_res);
				} else {
					_callback();
				}

			},

			/**
			 * Get the image
			 */
			function(_callback) {
				http.get(image.location, function(_httpResponse) {
					if (_httpResponse.statusCode >= 400) return _callback(new Error('status ' + _httpResponse.statusCode));
					_callback(null, _httpResponse);
				}).on('error', function(_error) {
					_callback(_error);
				});
			},

			/**
			 * Perform image resize/crop operations
			 */
			function(_image, _callback) {
				var gmImage = gm(_image, image.hash).options(gmOptions);

			// gmImage.size(function(_error, _size) {
			// 	if (_error) return _callback(_error);

			// 	// If a crop ratio has been defined
			// 	if (_size.width / _size.height > image.crop.width / image.crop.height) {
			// 		console.log(1);
			// 	} else {
			// 		console.log(2);
			// 	}

					// gmImage.crop(100, 100);

					// If a width or height has been sepcified
					if (!(!image.resize.width && !image.resize.height)) {
						gmImage.resize(image.resize.width, image.resize.height);
					}

					gmImage.stream(function(_error, _stdout, _stderr) {
						if (_error || _stderr) return _callback(_error || _stderr);

						var writeStream = fs.createWriteStream(config.cacheFolder + '/' + image.hash);

						// Pipe to the response
						_stdout.pipe(_res);

						// Pipe to the cache folder
						_stdout.pipe(writeStream);
					});

			// });

			}

		], function(_error) {
			_next(_error);
		});

	}
}