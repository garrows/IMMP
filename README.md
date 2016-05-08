IMMP: Image Manipulation Middleware Proxy
=========================================

[![NPM](https://nodei.co/npm/immp.png)](https://nodei.co/npm/immp/)

This is an express middleware for manipulating images with imageMagick/graphicsMagic. You can also set it up to act as a proxy.

This is very useful for web development where thumbnails and cropping is done. Instead of doing it by hand, just specify the size and ratio in the url.

`http://localhost:3000/im/?image=test.jpg&crop=16x9&resize=200x113`

If you enable proxy mode, you can proxy images from other services like Amazon S3

`http://localhost:3000/im/?http://s3.amazonaws.com/yourbucket/youimg.png&crop=1x1`

Install
-------
Install the immp module with

```
npm install --save immp
```

You will also need either imageMagick or graphicsMagic installed.

On linux install them using:
```
sudo apt-get install imagemagick graphicsmagick
```
or Mac
```
brew install imagemagick
brew install graphicsmagick
```

Setup
-----

In your app.js (assuming a standard express.js setup), add the following lines.

```
var immp = require('immp');

app.use('/im/*', immp({
    ttl: 1000 * 60 * 60 * 24 * 7, // 1 week
    imageMagick: true,
    graphicsMagick: true,
    cacheFolder: os.tmpdir(),
    allowProxy: false,
    imageDir: process.cwd()
}));
```

All of the config variables are optional and default to the values in the example above.


API Usage
---------
Crop an image to 16:9

`http://localhost:3000/im/?image=test.jpg&crop=16x9`

Resize an image to 100x100

`http://localhost:3000/im/?image=test.jpg&resize=100x100`

Resize to 100x100 and change the ratio to 1:1

`http://localhost:3000/im/?image=test.jpg&crop=1x1&resize=100x100`

Crop the source image to the custom shape (source width, height, x, and y). See
[GraphicsMagic crop](http://www.graphicsmagick.org/GraphicsMagick.html#details-crop)
for more information. Non-negative integers only.

`http://localhost:3000/im/?image=test.jpg&sx=100&sy=100&sw=100&sy=100`

If you enable proxy mode, you can proxy images from other services like Amazon S3

`http://localhost:3000/im/?http://s3.amazonaws.com/yourbucket/youimg.png&crop=1x1`




Development
-----------

If you want to help contribute (thank you), there is an included server and test images in the that will help you. No automated unit tests yet though.


Setup with
```
git clone git@github.com:garrows/IMMP.git
cd IMMP
npm install
npm start
```

Now go to http://localhost:3000/

For faster development open these 2 commands in different windows
```
nodemon
live-reload --port=35729 --delay=600
```
