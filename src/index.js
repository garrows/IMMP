var _ = require('underscore'),
	async = require('async'),
	cast = require('sc-cast'),
	crypto = require('crypto'),
	fs = require('fs'),
	os = require('os'),
	gm = require('gm'),
	http = require('http');

module.exports = function (_config) {
	var config = _.extend({

		cacheFolder: os.tmpdir(),
		ttl: 1000 * 60 * 60 * 24 * 7, // 1 week
		allowProxy: false,
		imageDir: process.cwd(),

	}, _config);

	return function (_req, _res, _next) {
		var dimensions = _req.query.resize || '0x0',
			crop = _req.query.crop || '0x0',
			quality = _req.query.quality;

		var gmOptions = {};
		if(config.imageMagick) {
			gmOptions.imageMagick = config.imageMagick;
		}
		if(config.graphicsMagick) {
			gmOptions.graphicsMagick = config.graphicsMagick;
		}

		var image = {
			query: JSON.stringify(_req.query),
			location: _req.query.image,
			resize: {
				width: cast(_.first(dimensions.match(/^[^x]+/)), 'number') || null,
				height: cast(_.first(dimensions.match(/[^x]+$/)), 'number') || null
			},
			crop: {
				width: cast(_.first(crop.match(/^[^x]+/)), 'number') || null,
				height: cast(_.first(crop.match(/[^x]+$/)), 'number') || null
			},
			size: {
				width: 0,
				height: 0
			},
			quality: cast(quality, 'number'),
			upscale: /true/i.test(_req.query.upscale)
		};

		if(config.allowProxy && !/^https?\:/.test(image.location)) {
			image.location = image.location.trim().replace(/^\//, '');
			image.location = _req.protocol + '://' + _req.headers.host + '/' + image.location;
		}

		image.hash = crypto.createHash('sha1').update(JSON.stringify(image)).digest('hex');

		async.waterfall([

			/**
			 * If the image already exists and it's within the TTL range use it, otherwise continue
			 */
			function (_callback) {
				var stat,
					createdAt = 0,
					now = new Date().getTime();

				try {
					stat = fs.statSync(config.cacheFolder + '/' + image.hash);
					createdAt = cast(stat.mtime, 'date').getTime();
				} catch(e) {};

				if(stat && now - createdAt < config.ttl) {
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
			function (_callback) {
				if(config.allowProxy) {
					http.get(image.location, function (_httpResponse) {
						if(_httpResponse.statusCode >= 400) return _callback(new Error('status ' + _httpResponse.statusCode));
						_callback(null, _httpResponse);
					}).on('error', function (_error) {
						_callback(_error);
					});
				} else {
					var imageStream = fs.createReadStream(config.imageDir + image.location);
					_callback(null, imageStream);
				}
			},

			/**
			 * Perform image resize/crop operations
			 */
			function (_imageSrc, _manipulationDoneCallback) {
				var gmImage = gm(_imageSrc, image.hash).options(gmOptions);

				async.waterfall([

					//Get original size
					function (_callback) {
						gmImage.size({
							bufferStream: true
						}, function (_error, _size) {
							if(_error) {
								console.log(_error);
								return _callback(_error);
							}
							image.size = _size;

							_callback(null);
						});
					},

					// Crop
					function (_callback) {
						// If a crop ratio has been specified
						if(!(!image.crop.width && !image.crop.height)) {

							var newSize = {
								width: image.size.width,
								height: image.size.height
							};
							var offset = {
								x: 0,
								y: 0
							};

							var sourceRatio = image.size.width / image.size.height;
							var targetRatio = image.crop.width / image.crop.height;

							if(sourceRatio < targetRatio) {
								newSize.height = image.size.width / targetRatio;
							} else if(sourceRatio > targetRatio) {
								newSize.width = image.size.height * targetRatio;
							} else {
								//Matching ratios. dont need to do anything.
								return _callback(null);
							}

							offset.x = (image.size.width - newSize.width) / 2;
							offset.y = (image.size.height - newSize.height) / 2;

							gmImage.crop(
								newSize.width,
								newSize.height,
								offset.x,
								offset.y
							);
						}
						_callback(null);
					},

					// Resize
					function (_callback) {
						// If a width or height has been sepcified
						if(!(!image.resize.width && !image.resize.height)) {
							gmImage.resize(image.resize.width, image.resize.height, image.upscale === true ? '' : '>');
						}
						_callback(null);
					},

					// Quality
					function (_callback) {
						if(typeof image.quality === 'number') {
							gmImage.quality(image.quality);
						}
						_callback();
					}

				], function (_error) {

					//Stream it back.
					gmImage.stream(function (_error, _stdout, _stderr) {
						if(_error) {
							console.log(_error);
							return _manipulationDoneCallback(_error);
						}

						var writeStream = fs.createWriteStream(config.cacheFolder + '/' + image.hash);

						// Pipe to the response
						_stdout.pipe(_res);

						// Pipe to the cache folder
						_stdout.pipe(writeStream);

						//Close up the waterfall when done
						_stdout.on('end', function () {
							_manipulationDoneCallback(null);
						})
					});
				});

			}

		], function (_error) {
			if(_error) {
				_next(_error);
			}
		});

	}
}