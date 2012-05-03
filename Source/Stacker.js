/*
 ---

 description: Smooth opacity-tweened switch between background-imaged divisions in the same container (absolute position)

 authors:
 - Goutte <antoine@goutenoir.com>

 demo:
 - todo

 licence:
 - zlul

 requires:
 - Mootools

 provides:
 - Stacker

 ...
 */
var Stacker = new Class({

  Implements: [Options, Chain, Events],

  options: {
    rotateStack: true, // should we start stack rotation on load ?
    rotationInterval: 5000,
    imagePath: '', // will prefix image paths
    imageTweenOptions: {}, // Options to pass to the opacity tween
    imageTweenDuration: 2000,
    onShowImageComplete: function (imagePath) {},
    onRotationWaitingStart: function (interval, duration) {},
    onRotationWaitingCancel: function () {}
  },

  initialize: function (stackHolder, options) {
    this.setOptions(options);
    this.stackHolder = document.id(stackHolder);

    this.defaultImage = this.normalizeImagePath(this.stackHolder.getStyle('background-image'));
    this.currentImage = this.rotateInterval = null;

    this.imagePathsStack = [];
    this.imageElementsStack = [];

  },

  normalizeImagePath: function (imagePathToClean) {
    if (imagePathToClean.substring(0, 4) == 'url(') {
      return imagePathToClean.substring(4, imagePathToClean.length - 1);
    } else {
      return imagePathToClean;
    }
  },

  /**
   * Loads the passed gallery into the image switcher
   * @param gallery Array of image names (or paths)
   * @param htmlContent (optional) string Html content to insert in each image
   */
  loadGallery: function (gallery, htmlContent) {
    this.clearChain();

    this.gallery = gallery.map(function (item, index) {
      return this.options.imagePath + item
    }.bind(this));
    this.preloadImages(this.gallery, htmlContent);

    this.showStackedImage(this.gallery.getRandom());

    if (!this.isRotating() && this.useRotation()) {
      this.startRotation();
    }

    return this;
  },

  loadImage: function (imagePath, htmlContent) {
    imagePath = this.options.imagePath + imagePath;

    if (this.gallery) {
      this.gallery.push(imagePath);
    } else {
      this.gallery = [imagePath];
    }

    this.preloadImages([imagePath], htmlContent);

    if (!this.isRotating() && this.useRotation()) {
      this.startRotation();
    }

    return this;
  },


  preloadImages: function (images, htmlContent) {

    // todo : Asset.Image ?

    Array.each(images, function (imagePath, index) {
      if (!this.getImagePathElement(imagePath)) {
        this.addStackedElement(imagePath, htmlContent);
      }
    }.bind(this));

    return this;
  },


  getImagePathStackId: function (imagePath) {
    return this.imagePathsStack.indexOf(imagePath);
  },

  getImagePathElement: function (imagePath) {
    return this.imageElementsStack[this.getImagePathStackId(imagePath)];
  },

  addStackedElement: function (imagePath, htmlContent) {
    var element = this.stackHolder.clone(false, false).setStyle('opacity', 0).set('html', htmlContent);
    element.setStyle('z-index', this.stackHolder.getStyle('z-index').toInt() + this.imageElementsStack.length + 1);
    element.setStyle('background-image', 'url(' + imagePath + ')').inject(this.stackHolder, 'after');
    element.set('tween', Object.merge({
      property: 'opacity',
      link: 'cancel',
      duration: this.options.imageTweenDuration,
      transition: 'sine:in:out',
      onCancel: function () {
        this.clearChain();
      }.bind(this)
    }, this.options.imageTweenOptions));

    this.imageElementsStack.push(element);
    this.imagePathsStack.push(imagePath);

    return this;
  },

  /**
   * Brings forth the stacked image, referenced by its imagePath
   * @param imagePath
   */
  showStackedImage: function (imagePath) {
    if (this.currentImage == imagePath) return this;
    this.currentImage = imagePath;

    var imageElement = this.getImagePathElement(imagePath);
    $$(this.imageElementsStack).tween(0);
    imageElement.tween(1).get('tween').chain(function () {
      this.fireEvent('showImageComplete', imagePath);
      this.callChain();
    }.bind(this));

    return this;
  },

  showNextImage: function () {
    var i = (this.gallery.indexOf(this.currentImage) + 1) % this.gallery.length;
    if (this.useRotation()) this.fireEvent('rotationWaitingStart', [this.options.rotationInterval, this.options.imageTweenDuration]);
    return this.showStackedImage(this.gallery[i]);
  },

  showDefaultImage: function () {
    this.currentImage = this.defaultImage;
    var imagesStillTweening = this.imageElementsStack.length;
    Array.each(this.imageElementsStack, function (im) {
      $(im).tween(0).get('tween').chain(function () {
        imagesStillTweening--;
        if (imagesStillTweening == 0) this.callChain();
      }.bind(this));
    }.bind(this));
    if (this.useRotation()) {
      clearInterval(this.rotateInterval);
      this.fireEvent('rotationWaitingCancel');
    }

    return this;
  },

  isRotating: function () {
    return null != this.rotateInterval;
  },

  useRotation: function () {
    return this.gallery && this.gallery.length > 1 && this.options.rotateStack;
  },

  startRotation: function () {
    clearInterval(this.rotateInterval);
    this.rotateInterval = this.showNextImage.periodical(this.options.rotationInterval + this.options.imageTweenDuration, this);
    this.fireEvent('rotationWaitingStart', [this.options.rotationInterval, this.options.imageTweenDuration]);
  }


});