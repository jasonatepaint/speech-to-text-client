'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* jshint esnext: true */
/* globals module */
/* globals define */
/* globals ttsAudio  */

var AudioControl = function () {
  function AudioControl(audioRecorder) {
    _classCallCheck(this, AudioControl);

    this.audioRecorder = audioRecorder;
  }

  /**
   * Clears the previous buffer and starts buffering audio.
   * @param {?onSilenceCallback} onSilence - Called when silence is detected.
   */


  _createClass(AudioControl, [{
    key: 'startRecording',
    value: function startRecording(onSilence, onChunkedAudio) {
      this.recorder = this.audioRecorder.createRecorder();
      this.recorder.record(onSilence, onChunkedAudio);
    }
  }, {
    key: 'stopRecording',


    /**
     * Stops buffering audio.
     */
    value: function stopRecording() {
      this.recorder.stop();
    }
  }, {
    key: 'play',


    /**
     * On playback complete callback: `onPlaybackComplete`.
     *
     * @callback onPlaybackComplete
     */

    /**
     * Plays the audio buffer with an HTML5 audio tag.
     * @param {Uint8Array} buffer - The audio buffer to play.
     * @param {?onPlaybackComplete} callback - Called when audio playback is complete.
     */
    value: function play(buffer, callback) {
      var myBlob = new Blob([buffer], { type: 'audio/mpeg' });
      var audio = document.createElement('audio');
      var objectUrl = window.URL.createObjectURL(myBlob);
      audio.src = objectUrl;
      audio.addEventListener('ended', function () {
        audio.currentTime = 0;
        if (typeof callback === 'function') {
          callback();
        }
      });
      audio.play();
      this.recorder.clear();
    }
  }, {
    key: 'supportsAudio',


    /**
     * On audio supported callback: `onAudioSupported`.
     *
     * @callback onAudioSupported
     * @param {boolean}
     */

    /**
     * Checks that getUserMedia is supported and the user has given us access to the mic.
     * @param {onAudioSupported} callback - Called with the result.
     */
    value: function supportsAudio(callback) {
      if (navigator.mediaDevices.getUserMedia) {
        this.audioRecorder.requestDevice().then(function () {
          callback(true);
        }).catch(function () {
          callback(false);
        });
      } else {
        callback(false);
      }
    }
  }]);

  return AudioControl;
}();

module.exports = AudioControl;