/* jshint esnext: true */
/* globals module */
/* globals define */
/* globals ttsAudio  */

class AudioControl {
  constructor(audioRecorder) {
    this.audioRecorder = audioRecorder;
  }

  /**
   * Clears the previous buffer and starts buffering audio.
   * @param {?onSilenceCallback} onSilence - Called when silence is detected.
   */
  startRecording(onSilence, onChunkedAudio) {
    this.recorder = this.audioRecorder.createRecorder();
    this.recorder.record(onSilence, onChunkedAudio);
  };

  /**
   * Stops buffering audio.
   */
  stopRecording() {
    this.recorder.stop();
  };

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
  play(buffer, callback) {
    var myBlob = new Blob([buffer], { type: 'audio/mpeg' });
    var audio = document.createElement('audio');
    var objectUrl = window.URL.createObjectURL(myBlob);
    audio.src = objectUrl;
    audio.addEventListener('ended', function() {
      audio.currentTime = 0;
      if (typeof callback === 'function') {
        callback();
      }
    });
    audio.play();
    this.recorder.clear();
  };

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
  supportsAudio(callback) {
    if (navigator.mediaDevices.getUserMedia) {
      this.audioRecorder.requestDevice()
        .then(() => { callback(true); })
        .catch(() => { callback(false); });
    } else {
      callback(false);
    }
  };
}

module.exports = AudioControl;