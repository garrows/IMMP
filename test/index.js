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
		imageMagick: true
	};

describe('immp', function() {

	before(function(_done) {
		cluster.setupMaster({
			exec: path.join(cwd, '/bin/www')
		});
		cluster.fork();
		setTimeout(function() {
			_done();
		}, 300);
	});

	after(function() {
		var immpFiles = fs.readdirSync(immpPath);
		immpFiles.forEach(function(_file) {
			fs.unlinkSync(path.join(immpPath, '/', _file));
		});
	});

	it('should resize by width', function(_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get('http://localhost:3000/im/?image=/images/robot.jpg&resize=200x0', function(_httpResponse) {

			gm(_httpResponse)
				.options(gmOptions)
				.size(function(_error, _size) {
					if (_error) return _done(_error);

					_size.width.should.equal(200);

					_done();
				});

		});

	});

	it('should resize by height', function(_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get('http://localhost:3000/im/?image=/images/robot.jpg&resize=0x200', function(_httpResponse) {

			gm(_httpResponse)
				.options(gmOptions)
				.size(function(_error, _size) {
					if (_error) return _done(_error);

					_size.height.should.equal(200);

					_done();
				});

		});

	});

	it('should not upscale by default', function(_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get('http://localhost:3000/im/?image=/images/robot.jpg&resize=2000x2000', function(_httpResponse) {

			gm(_httpResponse)
				.options(gmOptions)
				.size(function(_error, _size) {
					if (_error) return _done(_error);

					_size.width.should.equal(1920);
					_size.height.should.equal(1080);

					_done();
				});

		});

	});

	it('should upscale when upscaling is true', function(_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get('http://localhost:3000/im/?image=/images/robot.jpg&resize=2000x2000&upscale=true', function(_httpResponse) {

			gm(_httpResponse)
				.options(gmOptions)
				.size(function(_error, _size) {
					if (_error) return _done(_error);

					_size.width.should.equal(2000);
					_size.height.should.equal(1125);

					_done();
				});

		});

	});

	it('should resize by width and height and retain the aspect ratio', function(_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get('http://localhost:3000/im/?image=/images/robot.jpg&resize=100x200', function(_httpResponse) {

			gm(_httpResponse)
				.options(gmOptions)
				.size(function(_error, _size) {
					if (_error) return _done(_error);

					_size.width.should.equal(100);
					_size.height.should.equal(56);

					_done();
				});

		}).on('error', function(_error) {
			_done(_error);
		});

	});

	it('should crop to a square', function(_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get('http://localhost:3000/im/?image=/images/robot.jpg&crop=1x1', function(_httpResponse) {

			gm(_httpResponse)
				.options(gmOptions)
				.size(function(_error, _size) {
					if (_error) return _done(_error);

					_size.width.should.equal(1080);
					_size.height.should.equal(1080);

					_done();
				});

		});

	});

	it('should crop to a short width big height ratio', function(_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get('http://localhost:3000/im/?image=/images/robot.jpg&crop=9x16', function(_httpResponse) {

			gm(_httpResponse)
				.options(gmOptions)
				.size(function(_error, _size) {
					if (_error) return _done(_error);

					_size.width.should.equal(608);
					_size.height.should.equal(1080);

					_done();
				});

		});


	});

	it('should crop to a big width short height ratio', function(_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get('http://localhost:3000/im/?image=/images/robot.jpg&crop=16x9', function(_httpResponse) {

			gm(_httpResponse)
				.options(gmOptions)
				.size(function(_error, _size) {
					if (_error) return _done(_error);

					_size.width.should.equal(1920);
					_size.height.should.equal(1080);

					_done();
				});

		});

	});

	it('should crop and resize', function(_done) {
		this.slow(5000);
		this.timeout(10000);

		http.get('http://localhost:3000/im/?image=/images/robot.jpg&crop=1x1&resize=50x100', function(_httpResponse) {

			gm(_httpResponse)
				.options(gmOptions)
				.size(function(_error, _size) {
					if (_error) return _done(_error);

					_size.width.should.equal(50);
					_size.height.should.equal(50);

					_done();
				});

		});

	});

});