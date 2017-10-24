/* jshint esnext: true */
/* globals module */
/* globals define */

class AudioControl {
  constructor(audioRecorder) {
    this.audioRecorder = audioRecorder;
  }

  /**
   * Clears the previous buffer and starts buffering audio.
   * @param {?onSilence} onSilence - Called when silence is detected.
   * @param onChunkedAudio - callback w/audio buffer to be sent to server
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

export default AudioControl;