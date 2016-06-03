var async = require('async'),
	cluster = require('cluster'),
	cwd = process.cwd(),
	fs = require('fs'),
	gm = require('gm'),
	http = require('http'),
	path = require('path'),
	should = require('should');

var immpPath = path.join(cwd, '/.tmp/immp'),
	gmOptions = {
		bufferStream: true,
		imageMagick: false,
		graphicsMagick: true
	},
	serverImmpConfig = {
		// ttl: 0,
		// ttl: 1000 * 60 * 60 * 24 * 7, // 1 week
		imageMagick: false,
		graphicsMagick: true,
		cacheFolder: process.cwd() + '/.tmp/immp',
		// allowProxy: true,
		imageDir: process.cwd() + '/public'
	},
	server,
	serverPort = process.env.PORT || 3000,
	serverUrl = 'http://localhost:' + serverPort;

describe('immp', function () {

	before(function (_done) {
		// Set up the test server.
		var debug = require('debug')('gm');
		var app = require('../app')(serverImmpConfig);

		app.set('port', serverPort);

		server = app.listen(app.get('port'), function () {
			debug('Express server listening on port ' + serverPort);
			_done();
		});
	});

	after(function () {
		var immpFiles = fs.readdirSync(immpPath);
		immpFiles.forEach(function (_file) {
			fs.unlinkSync(path.join(immpPath, '/', _file));
		});
	});

	it('should resize by width', function (_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get(serverUrl + '/im/?image=/images/robot.jpg&resize=200x0', function (_httpResponse) {

			_httpResponse.statusCode.should.eql(200);
			_httpResponse.headers['content-type'].should.eql('image/jpeg');

			gm(_httpResponse)
				.options(gmOptions)
				.size(function (_error, _size) {
					if(_error) return _done(_error);

					_size.width.should.equal(200);

					_done();
				});

		});

	});

	it('should resize by height', function (_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get(serverUrl + '/im/?image=/images/robot.jpg&resize=0x200', function (_httpResponse) {

			_httpResponse.statusCode.should.eql(200);
			_httpResponse.headers['content-type'].should.eql('image/jpeg');

			gm(_httpResponse)
				.options(gmOptions)
				.size(function (_error, _size) {
					if(_error) return _done(_error);

					_size.height.should.equal(200);

					_done();
				});

		});

	});

	it('should not upscale by default', function (_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get(serverUrl + '/im/?image=/images/robot.jpg&resize=2000x2000', function (_httpResponse) {

			_httpResponse.statusCode.should.eql(200);
			_httpResponse.headers['content-type'].should.eql('image/jpeg');

			gm(_httpResponse)
				.options(gmOptions)
				.size(function (_error, _size) {
					if(_error) return _done(_error);

					_size.width.should.equal(1920);
					_size.height.should.equal(1080);

					_done();
				});

		});

	});

	it('should upscale when upscaling is true', function (_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get(serverUrl + '/im/?image=/images/robot.jpg&resize=2000x2000&upscale=true', function (_httpResponse) {

			_httpResponse.statusCode.should.eql(200);
			_httpResponse.headers['content-type'].should.eql('image/jpeg');

			gm(_httpResponse)
				.options(gmOptions)
				.size(function (_error, _size) {
					if(_error) return _done(_error);

					_size.width.should.equal(2000);
					_size.height.should.equal(1125);

					_done();
				});

		});

	});

	it('should resize by width and height and retain the aspect ratio', function (_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get(serverUrl + '/im/?image=/images/robot.jpg&resize=100x200', function (_httpResponse) {

			_httpResponse.statusCode.should.eql(200);
			_httpResponse.headers['content-type'].should.eql('image/jpeg');

			gm(_httpResponse)
				.options(gmOptions)
				.size(function (_error, _size) {
					if(_error) return _done(_error);

					_size.width.should.equal(100);
					_size.height.should.equal(56);

					_done();
				});

		}).on('error', function (_error) {
			_done(_error);
		});

	});

	it('should crop to a square', function (_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get(serverUrl + '/im/?image=/images/robot.jpg&crop=1x1', function (_httpResponse) {

			_httpResponse.statusCode.should.eql(200);
			_httpResponse.headers['content-type'].should.eql('image/jpeg');

			gm(_httpResponse)
				.options(gmOptions)
				.size(function (_error, _size) {
					if(_error) return _done(_error);

					_size.width.should.equal(1080);
					_size.height.should.equal(1080);

					_done();
				});

		});

	});

	it('should do a custom crop', function (_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get(serverUrl + '/im/?image=/images/robot.jpg&sx=0&sy=0&sw=100&sh=111', function (_httpResponse) {

			_httpResponse.statusCode.should.eql(200);
			_httpResponse.headers['content-type'].should.eql('image/jpeg');

			gm(_httpResponse)
				.options(gmOptions)
				.size(function (_error, _size) {
					if(_error) return _done(_error);

					_size.width.should.equal(100);
					_size.height.should.equal(111);

					_done();
				});

		});

	});

	it('should do a custom crop with an offset', function (_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get(serverUrl + '/im/?image=/images/robot.jpg&sx=100&sy=100&sw=222&sh=111', function (_httpResponse) {

			_httpResponse.statusCode.should.eql(200);
			_httpResponse.headers['content-type'].should.eql('image/jpeg');

			gm(_httpResponse)
				.options(gmOptions)
				.size(function (_error, _size) {
					if(_error) return _done(_error);

					_size.width.should.equal(222);
					_size.height.should.equal(111);

					_done();
				});

		});

	});

	describe('with invalid operators', function () {
		[
			[0, 0, 0, 0], // No image
			[99999, 99999, 100, 100], // Outside bounds
			['a', 0, 0, 0], // Non-numeric
			[-1, 0, 0, 0], // Not positive
			['', 0, 0, 0], // Not defined
		].forEach(function (params) {
			it('should not do a custom crop with ' + params, function (_done) {
				this.slow(5000);
				this.timeout(10000);

				http.get(serverUrl + '/im/?image=/images/robot.jpg&sx=' + params[0] + '&sy=' + params[1] + '&sw=' + params[2] + '&sh=' + params[3] + '', function (_httpResponse) {

					_httpResponse.statusCode.should.eql(200);
					_httpResponse.headers['content-type'].should.eql('image/jpeg');

					gm(_httpResponse)
						.options(gmOptions)
						.size(function (_error, _size) {
							if(_error) return _done(_error);

							// Default image size
							_size.width.should.equal(1920);
							_size.height.should.equal(1080);

							_done();
						});

				});

			});
		});
	});

	it('should crop to a short width big height ratio', function (_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get(serverUrl + '/im/?image=/images/robot.jpg&crop=9x16', function (_httpResponse) {

			_httpResponse.statusCode.should.eql(200);
			_httpResponse.headers['content-type'].should.eql('image/jpeg');

			gm(_httpResponse)
				.options(gmOptions)
				.size(function (_error, _size) {
					if(_error) return _done(_error);

					_size.width.should.equal(608);
					_size.height.should.equal(1080);

					_done();
				});

		});


	});

	it('should crop to a big width short height ratio', function (_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get(serverUrl + '/im/?image=/images/robot.jpg&crop=16x9', function (_httpResponse) {

			_httpResponse.statusCode.should.eql(200);
			_httpResponse.headers['content-type'].should.eql('image/jpeg');

			gm(_httpResponse)
				.options(gmOptions)
				.size(function (_error, _size) {
					if(_error) return _done(_error);

					_size.width.should.equal(1920);
					_size.height.should.equal(1080);

					_done();
				});

		});

	});

	it('should crop and resize', function (_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get(serverUrl + '/im/?image=/images/robot.jpg&crop=1x1&resize=50x100', function (_httpResponse) {

			_httpResponse.statusCode.should.eql(200);
			_httpResponse.headers['content-type'].should.eql('image/jpeg');

			gm(_httpResponse)
				.options(gmOptions)
				.size(function (_error, _size) {
					if(_error) return _done(_error);

					_size.width.should.equal(50);
					_size.height.should.equal(50);

					_done();
				});

		});

	});

	it('should set the quality', function (_done) {
		this.slow(5000);
		this.timeout(10000);

		async.waterfall([

			// Get the size without compression
			function (_callback) {

				http.get(serverUrl + '/im/?image=/images/robot.jpg&quality=invalidQualityValue', function (_httpResponse) {

					_httpResponse.statusCode.should.eql(200);
					_httpResponse.headers['content-type'].should.eql('image/jpeg');

					gm(_httpResponse)
						.options(gmOptions)
						.filesize(function (_error, _filesize) {
							if(_error) return _callback(_error);
							_callback(null, parseInt(_filesize));
						});

				});

			},

			// Get the size with compression
			function (_fileSizeWithoutCompression, _callback) {

				http.get(serverUrl + '/im/?image=/images/robot.jpg&quality=50', function (_httpResponse) {

					_httpResponse.statusCode.should.eql(200);
					_httpResponse.headers['content-type'].should.eql('image/jpeg');

					gm(_httpResponse)
						.options(gmOptions)
						.filesize(function (_error, _filesize) {
							if(_error) return _callback(_error);
							var filesize = parseInt(_filesize);
							filesize.should.be.lessThan(_fileSizeWithoutCompression);
							(filesize / _fileSizeWithoutCompression).should.be.greaterThan(.5).and.lessThan(.8);
							_callback(null, filesize);
						});

				});

			}

		], function (_error) {
			_done(_error);
		});

	});

	it('should respect the orientation information', function (_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get(serverUrl + '/im/?image=/images/Landscape_8.jpg&quality=50', function (_httpResponse) {

			_httpResponse.statusCode.should.eql(200);
			_httpResponse.headers['content-type'].should.eql('image/jpeg');

			gm(_httpResponse)
				.options(gmOptions)
				.size(function (_error, _size) {
					if(_error) return _done(_error);
					_size.width.should.equal(600);
					_size.height.should.equal(450);

					_done();
				});

		});

	});

	it('should work for http images', function (_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get(serverUrl + '/im/?image=' + serverUrl + '/images/robot.jpg&crop=1x1&resize=50x100', function (_httpResponse) {

			_httpResponse.statusCode.should.eql(200);
			_httpResponse.headers['content-type'].should.eql('image/jpeg');

			gm(_httpResponse)
				.options(gmOptions)
				.size(function (_error, _size) {
					if(_error) return _done(_error);

					_size.width.should.equal(50);
					_size.height.should.equal(50);

					_done();
				});

		});

	});

	it('should work for https images', function (_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get(serverUrl + '/im/?image=https://www.google.com/images/srpr/logo11w.png&crop=1x1&resize=50x100', function (_httpResponse) {

			_httpResponse.statusCode.should.eql(200);
			_httpResponse.headers['content-type'].should.eql('image/png');

			gm(_httpResponse)
				.options(gmOptions)
				.size(function (_error, _size) {
					if(_error) return _done(_error);

					_size.width.should.equal(50);
					_size.height.should.equal(50);

					_done();
				});

		});

	});

	it('should still have the right content-type & size when cached', function (_done) {
		http.get(serverUrl + '/im/?image=/images/Landscape_8.jpg&quality=50', function (_httpResponse) {

			_httpResponse.statusCode.should.eql(200);
			_httpResponse.headers['content-type'].should.eql('image/jpeg');

			gm(_httpResponse)
				.options(gmOptions)
				.size(function (_error, _size) {
					if(_error) return _done(_error);
					_size.width.should.equal(600);
					_size.height.should.equal(450);

					_done();
				});

		});

	});

	it('should return gifs', function (_done) {
		http.get(serverUrl + '/im/?image=/images/captainplanet.gif', function (_httpResponse) {
			_httpResponse.statusCode.should.eql(200);
			_httpResponse.headers['content-type'].should.eql('image/gif');
			_done();
		});
	});

	describe('with convertTo set', function () {

		before(function (_done) {
			// Clear file cache.
			var immpFiles = fs.readdirSync(immpPath);
			immpFiles.forEach(function (_file) {
				fs.unlinkSync(path.join(immpPath, '/', _file));
			});

			// Recreate server with new config option/s.
			server.on('close', function () {
				serverImmpConfig.convertTo = {
					gif: {
						fileType: 'png32',
						mimeType: 'png'
					}
				};
				// Set up the test server.
				var debug = require('debug')('gm');
				var app = require('../app')(serverImmpConfig);

				app.set('port', serverPort);

				server = app.listen(app.get('port'), function () {
					debug('Express server listening on port ' + serverPort);
					_done();
				});
			});
			server.close();
		});

		it('should return in the appropriate format', function (_done) {
			http.get(serverUrl + '/im/?image=/images/captainplanet.gif', function (_httpResponse) {
				_httpResponse.statusCode.should.eql(200);
				_httpResponse.headers['content-type'].should.eql('image/png');
				gm(_httpResponse)
					.options(gmOptions).format(function (error, format) {
						format.should.eql('PNG');
						_done();
					});
			});
		});
	});

});
