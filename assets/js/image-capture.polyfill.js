if (typeof ImageCapture === 'undefined') {
    ImageCapture = class {

      /**
       * @param {MediaStreamTrack} videoStreamTrack - A MediaStreamTrack of the 'video' kind
       */
      constructor(videoStreamTrack) {
        if (videoStreamTrack.kind !== 'video')
          throw new DOMException('NotSupportedError');

        this._videoStreamTrack = videoStreamTrack;
        if (!('readyState' in this._videoStreamTrack)) {
          // Polyfill for Firefox
          this._videoStreamTrack.readyState = 'live';
        }

        // MediaStream constructor not available until Chrome 55 - https://www.chromestatus.com/feature/5912172546752512
        this._previewStream = new MediaStream([videoStreamTrack]);
        this.videoElement = document.createElement('video');
        this.videoElementPlaying = new Promise(resolve => {
          this.videoElement.addEventListener('playing', resolve);
        });
        if (HTMLMediaElement) {
          this.videoElement.srcObject = this._previewStream;  // Safari 11 doesn't allow use of createObjectURL for MediaStream
        } else {
          this.videoElement.src = URL.createObjectURL(this._previewStream);
        }
        this.videoElement.muted = true;
        this.videoElement.setAttribute('playsinline', ''); // Required by Safari on iOS 11. See https://webkit.org/blog/6784
        this.videoElement.play();

        this.canvasElement = document.createElement('canvas');
        this.canvas2dContext = this.canvasElement.getContext('2d');
      }

      /**
       * https://w3c.github.io/mediacapture-image/index.html#dom-imagecapture-videostreamtrack
       * @return {MediaStreamTrack} The MediaStreamTrack passed into the constructor
       */
      get videoStreamTrack() {
        return this._videoStreamTrack;
      }

      /**
       * Implements https://www.w3.org/TR/image-capture/#dom-imagecapture-getphotocapabilities
       * @return {Promise<PhotoCapabilities>} Fulfilled promise with
       * [PhotoCapabilities](https://www.w3.org/TR/image-capture/#idl-def-photocapabilities)
       * object on success, rejected promise on failure
       */
      getPhotoCapabilities() {
        return new Promise(function executorGPC(resolve, reject) {
          const MediaSettingsRange = {
            current: 0, min: 0, max: 0,
          };
          resolve({
            exposureCompensation: MediaSettingsRange,
            exposureMode: 'none',
            fillLightMode: 'none',
            focusMode: 'none',
            imageHeight: MediaSettingsRange,
            imageWidth: MediaSettingsRange,
            iso: MediaSettingsRange,
            redEyeReduction: false,
            whiteBalanceMode: 'none',
            zoom: MediaSettingsRange,
          });
          reject(new DOMException('OperationError'));
        });
      }

      /**
       * Implements https://www.w3.org/TR/image-capture/#dom-imagecapture-setoptions
       * @param {Object} photoSettings - Photo settings dictionary, https://www.w3.org/TR/image-capture/#idl-def-photosettings
       * @return {Promise<void>} Fulfilled promise on success, rejected promise on failure
       */
      setOptions(photoSettings = {}) {
        return new Promise(function executorSO(resolve, reject) {});
      }

      /**
       * @return {Promise<Blob>} Fulfilled promise with [Blob](https://www.w3.org/TR/FileAPI/#blob)
       * argument on success; rejected promise on failure
       */
      takePhoto() {
        const self = this;
        return new Promise(function executorTP(resolve, reject) {
          if (self._videoStreamTrack.readyState !== 'live') {
            return reject(new DOMException('InvalidStateError'));
          }

          self.videoElementPlaying.then(() => {
            try {
              self.canvasElement.width = self.videoElement.videoWidth;
              self.canvasElement.height = self.videoElement.videoHeight;
              self.canvas2dContext.drawImage(self.videoElement, 0, 0);
              self.canvasElement.toBlob(resolve);
            } catch (error) {
              reject(new DOMException('UnknownError'));
            }
          });
        });
      }

      /**
       * Implements https://www.w3.org/TR/image-capture/#dom-imagecapture-grabframe
       * @return {Promise<ImageBitmap>} Fulfilled promise with
       * [ImageBitmap](https://www.w3.org/TR/html51/webappapis.html#webappapis-images)
       * argument on success; rejected promise on failure
       */
      grabFrame() {
        const self = this;
        return new Promise(function executorGF(resolve, reject) {
          if (self._videoStreamTrack.readyState !== 'live') {
            return reject(new DOMException('InvalidStateError'));
          }

          self.videoElementPlaying.then(() => {
            try {
              self.canvasElement.width = self.videoElement.videoWidth;
              self.canvasElement.height = self.videoElement.videoHeight;
              self.canvas2dContext.drawImage(self.videoElement, 0, 0);

              resolve(window.createImageBitmap(self.canvasElement));
            } catch (error) {
              reject(new DOMException('UnknownError'));
            }
          });
        });
      }
    };

    window.ImageCapture = ImageCapture;
  }