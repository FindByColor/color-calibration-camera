/*!
 * Color Calibration Camera v1.0.0
 * Copyright 2023 Find By Color, Inc. (https://findbycolor.com)
 */
(() => {
  window.FBC_CAMERA = {
    app: {
      markersFound: [0, 0, 0, 0],
      cameraLoaded: false,
      ready: false,
      imageCapture: null,
      mediaStream: null,
      checkCamera: null,
      timeout: null
    },

    devFlags: {
      debug: (FBC_CAMERA_ENV !== 'production'),
      disableAnalytics: (FBC_CAMERA_ENV === 'development')
    },

    elm: {
      canvas: document.getElementById('snapshot'),
      cardDetector: document.getElementById('cardDetector'),
      cardOutline: document.getElementById('cardOutline'),
      closeSnapshot: document.getElementById('closeSnapshot'),
      logger: document.getElementById('logger'),
      overlay: document.getElementById('overlay'),
      snapshotWrapper: document.getElementById('snapshotWrapper'),
      takePictureButton: document.getElementById('takePicture'),
      toggleDebug: document.getElementById('toggleDebug'),
      useColor: document.getElementById('useColor'),
      video: document.querySelector('video')
    },

    debug (message) {
      if (FBC_CAMERA.devFlags.debug || window.debugCamera) {
        console.log('FBC_CAMERA:', message)
      }

      // Convert Object to String for Custom Debugger
      let text = message
      if (typeof message !== 'string') {
        text = JSON.stringify(message)
      }

      if (FBC_CAMERA.elm.logger && FBC_CAMERA.elm.overlay) {
        const li = document.createElement('li')
        const content = document.createTextNode(text.toString())

        li.appendChild(content)
        FBC_CAMERA.elm.logger.appendChild(li)
        FBC_CAMERA.elm.overlay.scrollTop = FBC_CAMERA.elm.overlay.scrollHeight - FBC_CAMERA.elm.overlay.clientHeight
      }
    },

    getPicture (show) {
      FBC_CAMERA.debug('getPicture', show)

      const image = new Image()

      FBC_CAMERA.debug('Taking Picture...', FBC_CAMERA.app.imageCapture)

      FBC_CAMERA.app.imageCapture.takePhoto().then((img) => {
          image.src = URL.createObjectURL(img)
          image.crossOrigin = 'Anonymous'
          image.onload = (elm) => {
            const ctx = FBC_CAMERA.elm.canvas.getContext('2d', { willReadFrequently: true, alpha: false })

            FBC_CAMERA.elm.canvas.height = elm.target.naturalHeight
            FBC_CAMERA.elm.canvas.width = elm.target.naturalWidth

            ctx.drawImage(elm.target, 0, 0)

            // Check if we want to show the snapshot
            FBC_CAMERA.elm.snapshotWrapper.style.display = (show) ? 'flex' : 'none'

            FBC_CAMERA.debug('Picture Created')

            // TODO: Do something with this picture, e.g. hand it off to an API backend for calibration
            // TODO: Might also want to send over the coordinates for the card and maybe also the capture box we showed ( since we know them )
          }
        })
        .catch((error) => {
          FBC_CAMERA.elm.takePictureButton.removeAttribute('disabled')
          FBC_CAMERA.debug('Image Capture Error:')
          FBC_CAMERA.debug(error)
        })
    },

    getStream () {
      FBC_CAMERA.debug('getStream')
      // Stop all other Media Streams
      if (FBC_CAMERA.app.mediaStream) {
        FBC_CAMERA.app.mediaStream.getTracks().forEach((track) => track.stop())
      }

      // Check if this is a Mobile Device
      const mobile = FBC_CAMERA.isMobile()

      const constraints = {
        audio: false,
        video: {
          facingMode: mobile ? 'environment' : undefined,
          advanced: [
            { width: { exact: 2560 } },
            { width: { exact: 1920 } },
            { width: { exact: 1280 } },
            { width: { exact: 1024 } },
            { width: { exact: 900 } },
            { width: { exact: 800 } },
            { width: { exact: 640 } },
            { width: { exact: 320 } }
          ]
        }
      };

      // Get Contents from Video Stream
      navigator.mediaDevices.getUserMedia(constraints).then(FBC_CAMERA.gotStream).catch((err) => {
        FBC_CAMERA.debug('Get User Media Error:')
        FBC_CAMERA.debug(err.name + ': ' + err.message)
      })
    },

    gotStream (stream) {
      FBC_CAMERA.debug('gotStream', stream)
      FBC_CAMERA.app.mediaStream = stream
      FBC_CAMERA.elm.video.srcObject = stream
      FBC_CAMERA.app.imageCapture = new ImageCapture(stream.getVideoTracks()[0])
    },

    initCamera () {
      FBC_CAMERA.debug('initCamera')

      if (!FBC_CAMERA.elm.marker1) {
        FBC_CAMERA.elm.marker1 = document.getElementById('marker1')
      }

      if (!FBC_CAMERA.elm.marker2) {
        FBC_CAMERA.elm.marker2 = document.getElementById('marker2')
      }

      if (!FBC_CAMERA.elm.marker3) {
        FBC_CAMERA.elm.marker3 = document.getElementById('marker3')
      }

      if (!FBC_CAMERA.elm.marker4) {
        FBC_CAMERA.elm.marker4 = document.getElementById('marker4')
      }

      if (!FBC_CAMERA.elm.cardOutline) {
        FBC_CAMERA.elm.cardOutline = document.getElementById('cardOutline')
      }

      if (!FBC_CAMERA.elm.canvas) {
        FBC_CAMERA.elm.canvas = document.getElementById('snapshot')
      }

      if (!FBC_CAMERA.elm.closeSnapshot) {
        FBC_CAMERA.elm.closeSnapshot = document.getElementById('closeSnapshot')
      }

      if (!FBC_CAMERA.elm.logger) {
        FBC_CAMERA.elm.logger = document.getElementById('logger')
      }

      if (!FBC_CAMERA.elm.overlay) {
        FBC_CAMERA.elm.overlay = document.getElementById('overlay')
      }

      if (!FBC_CAMERA.elm.snapshotWrapper) {
        FBC_CAMERA.elm.snapshotWrapper = document.getElementById('snapshotWrapper')
      }

      if (!FBC_CAMERA.elm.video) {
        FBC_CAMERA.elm.video = document.getElementById('arjs-video')
      }

      // Check that video from camera loads before we do anything else ( sometimes it's slow )
      if (FBC_CAMERA.elm.video && !FBC_CAMERA.app.cameraLoaded) {
        FBC_CAMERA.debug('Camera Loaded')

        // Update to meet iOS Requirements for Video
        FBC_CAMERA.elm.video.setAttribute('autoplay', '')
        FBC_CAMERA.elm.video.setAttribute('muted', '')
        FBC_CAMERA.elm.video.setAttribute('playsinline', '')

        // Track that we've detected the camera is loaded
        clearInterval(FBC_CAMERA.app.checkCamera)
        FBC_CAMERA.app.cameraLoaded = true

        // Get Camera Info and start Stream Capture
        navigator.mediaDevices.enumerateDevices().then(FBC_CAMERA.getStream).catch((err) => {
          FBC_CAMERA.debug('Enumerate Devices Error:')
          FBC_CAMERA.debug(err.name + ': ' + err.message)
        })

        // Cache Remaining DOM Elements injected after init
        FBC_CAMERA.elm.cardDetector = FBC_CAMERA.elm.cardDetector || document.getElementById('cardDetector')
        FBC_CAMERA.elm.takePictureButton = FBC_CAMERA.elm.takePictureButton || document.querySelector('#takePicture')
        FBC_CAMERA.elm.toggleDebug = FBC_CAMERA.elm.toggleDebug || document.querySelector('#toggleDebug')
        FBC_CAMERA.elm.useColor = FBC_CAMERA.elm.useColor || document.querySelector('#useColor')

        // Bring in Card Overlay
        if (FBC_CAMERA.elm.cardOutline) {
          // Prevent flickering as camera activates and wait 1/2 a second before loading overlay
          setTimeout(() => {
            FBC_CAMERA.elm.cardOutline.style.display = 'block';
          }, 500)

          // TODO: Detect Device Orientation and Switch Card Overlay for Landscape Devices
        }

        if (FBC_CAMERA.elm.closeSnapshot) {
          FBC_CAMERA.elm.closeSnapshot.addEventListener('click', () => {
            FBC_CAMERA.elm.snapshotWrapper.style.display = 'none'
          })
        }

        // Handle Click Event of Take Picture Button
        if (FBC_CAMERA.elm.takePictureButton) {
          FBC_CAMERA.elm.takePictureButton.addEventListener('click', () => {
            FBC_CAMERA.getPicture(true)
          })

          // Get Initial Picture to make things run a lot faster with repeat
          // setTimeout(FBC_CAMERA.getPicture, 500)
        }

        // Handle Click Event of Debug Button
        if (FBC_CAMERA.elm.toggleDebug) {
          FBC_CAMERA.elm.toggleDebug.addEventListener('click', FBC_CAMERA.toggleDebugger)
        }
      }
    },

    isMobile () {
      const isAndroid = /Android/i.test(navigator.userAgent)
      const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

      return isAndroid || isiOS
    },

    toggleDebugger () {
      FBC_CAMERA.elm.overlay.style.display = (FBC_CAMERA.elm.overlay.style.display === 'block') ? 'none' : 'block'
    }
  }
})()

// Make sure `AFRAME` is defined before using it
if (typeof AFRAME !== 'undefined' && typeof FBC_CAMERA !== 'undefined') {
  FBC_CAMERA.debug('AFRAME exists')

  // Handle Tracking of Markers
  AFRAME.registerComponent('track_marker', {
    init() {
      FBC_CAMERA.debug('Registering Marker: ', this.el)
      // Listen for when Markers are Found
      this.el.addEventListener('markerFound', (data) => {
        const markerNumber = parseInt(data.target.attributes.value.textContent)
        FBC_CAMERA.app.markersFound[markerNumber] = 1
      })

      // Listen for when Markers are Lost
      this.el.addEventListener('markerLost', (data) => {
        const markerNumber = parseInt(data.target.attributes.value.textContent)
        FBC_CAMERA.app.markersFound[markerNumber] = 0
      })
    }
  })

  // Listen for Camera Events
  AFRAME.registerComponent('camera_status', {
    init() {
      FBC_CAMERA.debug('Registering Camera')
      clearInterval(FBC_CAMERA.app.checkCamera)
      FBC_CAMERA.app.checkCamera = setInterval(FBC_CAMERA.initCamera, 100)
    },
    tick() {
      // Enable Picture Button if All Markers Detected
      if (FBC_CAMERA.elm.takePictureButton) {
        const reducer = (accumulator, curr) => accumulator + curr
        const count = FBC_CAMERA.app.markersFound.reduce(reducer)

        if (count === 4 && !FBC_CAMERA.app.ready && !FBC_CAMERA.app.timeout) {
          clearTimeout(FBC_CAMERA.app.timeout)
          FBC_CAMERA.app.timeout = null
          FBC_CAMERA.app.ready = true
          FBC_CAMERA.elm.takePictureButton.removeAttribute('disabled')
          FBC_CAMERA.elm.cardDetector.object3D.visible = true
          FBC_CAMERA.elm.cardOutline.style.display = 'none';
          FBC_CAMERA.elm.useColor.object3D.visible = true
        } else if (FBC_CAMERA.app.ready && !FBC_CAMERA.app.timeout && count < 4) {
          // Debounce the disable only if markers have been gone for a bit
          clearTimeout(FBC_CAMERA.app.timeout)
          FBC_CAMERA.app.timeout = setTimeout(() => {
            FBC_CAMERA.app.timeout = null
            FBC_CAMERA.app.ready = false
            FBC_CAMERA.elm.takePictureButton.setAttribute('disabled', true)
            FBC_CAMERA.elm.cardDetector.object3D.visible = false
            FBC_CAMERA.elm.cardOutline.style.display = 'block';
            FBC_CAMERA.elm.useColor.object3D.visible = false
          }, 1000)
        }
      }
    }
  })
} else {
  FBC_CAMERA.debug('AFRAME does not exist')
}
