/*!
 * Color Calibration Camera v1.0.0
 * Copyright 2021 Find By Color, Inc. (https://findbycolor.com)
 */
(() => {
  let imageCapture, mediaStream, checkCamera, timeout;
  let $canvas, $cardDetector, $cardOverlay, $closeSnapshot, $logger, $overlay, $snapshotWrapper, $takePictureButton, $toggleDebug, $useColor, $video;

  let ready = false;
  let cameraLoaded = false;
  let markersFound = [0, 0, 0, 0];

  /**
   * Custom Debugger for Mobile Testing
   */
  const debug = (text) => {
    // Standard Debug to Console
    console.log('[FBC]', text)

    // Convert Object to String for Custom Debugger
    if (typeof text !== 'string') {
      text = JSON.stringify(text);
    }

    if (logger && overlay) {
      const li = document.createElement('li');
      const content = document.createTextNode(text.toString());

      li.appendChild(content);
      $logger.appendChild(li);
      $overlay.scrollTop = $overlay.scrollHeight - $overlay.clientHeight;
    }
  }

  /**
   * Initialize Camera
   */
  const init = () => {
    // Cache Initial DOM Elements that should already be on the page
    $canvas = document.getElementById('snapshot');
    $closeSnapshot = document.getElementById('closeSnapshot');
    $logger = document.querySelector('#logger');
    $overlay = document.querySelector('#overlay');
    $snapshotWrapper = document.getElementById('snapshotWrapper');
    $video = document.querySelector('video');

    // Check that video from camera loads before we do anything else ( sometimes it's slow )
    if ($video) {
      debug('Camera Loaded');

      // Update to meet iOS Requirements for Video
      $video.setAttribute('autoplay', '');
      $video.setAttribute('muted', '');
      $video.setAttribute('playsinline', '');

      // Track that we've detected the camera is loaded
      clearInterval(checkCamera);
      cameraLoaded = true;

      // Get Camera Info and start Stream Capture
      navigator.mediaDevices.enumerateDevices().then(getStream).catch(err => {
        debug('Enumerate Devices Error:');
        debug(err.name + ": " + err.message);
      });

      // Cache Remaining DOM Elements injected after init
      $cardDetector = document.getElementById('cardDetector');
      $cardOverlay = document.getElementById('cardOverlay');
      $takePictureButton = document.querySelector('#takePicture');
      $toggleDebug = document.querySelector('#toggleDebug');
      $useColor = document.querySelector('#useColor');

      // Bring in Card Overlay
      if ($cardOverlay) {
        // Prevent flickering as camera activates and wait 1/2 a second before loading overlay
        setTimeout(() => {
          $cardOverlay.object3D.visible = true;
        }, 500);

        // TODO: Detect Device Orientation and Switch Card Overlay for Landscape Devices
      }

      if ($closeSnapshot) {
        $closeSnapshot.addEventListener('click', () => {
          $snapshotWrapper.style.display = 'none';
        });
      }

      // Handle Click Event of Take Picture Button
      if ($takePictureButton) {
        $takePictureButton.addEventListener('click', () => {
          getPicture(true);
        });

        // Get Initial Picture to make things run a lot faster with repeat
        setTimeout(getPicture, 500);
      }

      // Handle Click Event of Debug Button
      if ($toggleDebug) {
        $toggleDebug.addEventListener('click', toggleDebugger);
      }
    }
  }

  /**
   * Check if this is a mobile device
   * @returns Boolean
   */
  const isMobile = () => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    return isAndroid || isiOS;
  }

  /**
   * Toggle Debugger
   */
  const toggleDebugger = () => {
    $overlay.style.display = ($overlay.style.display === 'block') ? 'none' : 'block';
  }

  /**
   * Get a video stream from the camera
   */
  const getStream = () => {
    // Stop all other Media Streams
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }

    // Get dimensions of window
    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;

    // Check if this is a Mobile Device
    const mobile = isMobile();

    // Get Contents from Video Stream
    navigator.mediaDevices.getUserMedia({
      'audio': false,
      'video': {
        facingMode: 'environment',
        width: mobile ? undefined : windowWidth,
        height: mobile ? undefined : windowHeight
      }
    }).then(gotStream).catch(err => {
      debug('Get User Media Error:');
      debug(err.name + ": " + err.message);
    });
  }

  /**
   * Display the stream from the camera, and then create an ImageCapture object, using video from the stream
   */
  const gotStream = stream => {
    mediaStream = stream;
    $video.srcObject = stream;
    imageCapture = new ImageCapture(stream.getVideoTracks()[0]);
  };

  /**
   * Take the Picture
   */
  const getPicture = (show) => {
    const image = new Image();

    debug('Taking Picture...');

    imageCapture.takePhoto().then((img) => {
        image.src = URL.createObjectURL(img);
        image.crossOrigin = 'Anonymous';
        image.onload = (elm) => {
          const ctx = $canvas.getContext('2d');

          $canvas.height = elm.target.naturalHeight;
          $canvas.width = elm.target.naturalWidth;

          ctx.drawImage(elm.target, 0, 0);

          // Check if we want to show the snapshot
          $snapshotWrapper.style.display = (show) ? 'flex' : 'none';

          debug('Picture Created');

          // TODO: Do something with this picture, e.g. hand it off to an API backend for calibration
          // TODO: Might also want to send over the coordinates for the card and maybe also the capture box we showed ( since we know them )
        };
      })
      .catch((error) => {
        $takePictureButton.removeAttribute('disabled');
        debug('Image Capture Error:');
        debug(error);
      });
  };

  // Make sure `AFRAME` is defined before using it
  if (typeof AFRAME !== 'undefined') {
    // Handle Tracking of Markers
    AFRAME.registerComponent('track_marker', {
      init() {
        // Listen for when Markers are Found
        this.el.addEventListener('markerFound', (data) => {
          const markerNumber = parseInt(data.target.attributes.value.textContent);
          markersFound[markerNumber] = 1;
        });

        // Listen for when Markers are Lost
        this.el.addEventListener('markerLost', (data) => {
          const markerNumber = parseInt(data.target.attributes.value.textContent);
          markersFound[markerNumber] = 0;
        });
      }
    });

    // Listen for Camera Events
    AFRAME.registerComponent('camera_status', {
      init() {
        clearInterval(checkCamera);
        checkCamera = setInterval(init, 100);
      },
      tick() {
        // Enable Picture Button if All Markers Detected
        if ($takePictureButton) {
          const reducer = (accumulator, curr) => accumulator + curr;
          const count = markersFound.reduce(reducer);

          if (count === 4 && !ready && !timeout) {
            clearTimeout(timeout);
            timeout = false;
            ready = true;
            $takePictureButton.removeAttribute('disabled');
            $cardDetector.object3D.visible = true;
            $cardOverlay.object3D.visible = false;
            $useColor.object3D.visible = true;
          } else if (ready && !timeout && count < 4) {
            // Debounce the disable only if markers have been gone for a bit
            clearTimeout(timeout);
            timeout = setTimeout(() => {
              timeout = false;
              ready = false;
              $takePictureButton.setAttribute('disabled', true);
              $cardDetector.object3D.visible = false;
              $cardOverlay.object3D.visible = true;
              $useColor.object3D.visible = false;
            }, 1000);
          }
        }
      }
    });
  }
})();
