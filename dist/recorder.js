'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* globals AudioContext  */
/* globals ttsAudio  */

var blob = new Blob(require('./worker.js'));
var blobUrl = window.URL.createObjectURL(blob);
var worker = new Worker(blobUrl);

var getUserMedia = require('getusermedia');

var Recorder = function () {
  function Recorder(source, visualizer) {
    _classCallCheck(this, Recorder);

    this.recording = false;
    this.visualizer = visualizer;

    // Create a ScriptProcessorNode with a bufferSize of 4096 and a single input and output channel
    this.node = source.context.createScriptProcessor(4096, 1, 1);

    var self = this;
    worker.onmessage = function (message) {
      var buffer = message.data;
      if (buffer) self.onChunkedAudio(buffer);
    };

    worker.postMessage({
      command: 'init',
      config: {
        sampleRate: source.context.sampleRate
      }
    });

    this.clear();

    /**
     * The onaudioprocess event handler of the ScriptProcessorNode interface. It is the EventHandler to be
     * called for the audioprocess event that is dispatched to ScriptProcessorNode node types.
     * @param {AudioProcessingEvent} audioProcessingEvent - The audio processing event.
     */
    this.node.onaudioprocess = function (audioProcessingEvent) {
      if (!self.recording) {
        return;
      }

      worker.postMessage({
        command: 'record',
        buffer: [audioProcessingEvent.inputBuffer.getChannelData(0)]
      });
      self.startSilenceDetection();
    };

    this.analyser = source.context.createAnalyser();
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;
    this.analyser.smoothingTimeConstant = 0.85;

    source.connect(this.analyser);
    this.analyser.connect(this.node);
    this.node.connect(source.context.destination);
  }

  /**
   * Sets the silence and viz callbacks, resets the silence start time, and sets recording to true.
   * @param {?onSilenceCallback} onSilence - Called when silence is detected.
   */


  _createClass(Recorder, [{
    key: 'record',
    value: function record(onChunkedAudio, onSilence) {
      this.silenceCallback = onSilence;
      this.onChunkedAudio = onChunkedAudio;
      this.start = Date.now();
      this.recording = true;
    }
  }, {
    key: 'stop',


    /**
     * Sets recording to false.
     */
    value: function stop() {
      this.recording = false;
    }
  }, {
    key: 'clear',


    /**
     * Posts "clear" message to the worker.
     */
    value: function clear() {
      worker.postMessage({ command: 'clear' });
    }
  }, {
    key: 'startSilenceDetection',


    /**
     * Checks the time domain data to see if the amplitude of the sound waveform is more than
     * 0.01 or less than -0.01. If it is, "noise" has been detected and it resets the start time.
     * If the elapsed time reaches 1 second the silence callback is called.
     */
    value: function startSilenceDetection() {
      this.analyser.fftSize = 2048;
      var bufferLength = this.analyser.fftSize;
      var dataArray = new Uint8Array(bufferLength);

      this.analyser.getByteTimeDomainData(dataArray);

      if (this.visualizer) {
        this.visualizer.visualizeAudioBuffer(dataArray, bufferLength);
      }

      var curr_value_time = dataArray[0] / 128 - 1.0;

      if (curr_value_time > 0.01 || curr_value_time < -0.01) {
        this.start = Date.now();
      }
      var newtime = Date.now();
      var elapsedTime = newtime - this.start;
      if (elapsedTime > 1000) {
        this.silenceCallback();
      }
    }
  }]);

  return Recorder;
}();

var AudioRecorder = function () {
  function AudioRecorder(visualizer) {
    _classCallCheck(this, AudioRecorder);

    this.audioContext = undefined;
    this.visualizer = visualizer;
    this.audioStream = null;
  }
  /**
   * Creates an audio context and calls getUserMedia to request the mic (audio).
   * If the user denies access to the microphone, the returned Promise rejected
   * with a PermissionDeniedError
   * @returns {Promise}
   */


  _createClass(AudioRecorder, [{
    key: 'requestDevice',
    value: function requestDevice() {

      if (typeof this.audioContext === 'undefined') {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
      }

      var self = this;
      return new Promise(function (resolve, reject) {
        getUserMedia({ video: false, audio: true }, function (err, stream) {
          // if the browser doesn't support user media
          // or the user says "no" the error gets passed
          // as the first argument.
          if (err) {
            reject(new Error('getUserMedia is not implemented in this browser'));
          } else {
            self.audioStream = stream;
            resolve();
          }
        });
      });
    }
  }, {
    key: 'createRecorder',
    value: function createRecorder() {
      var source = this.audioContext.createMediaStreamSource(this.audioStream, worker);
      return new Recorder(source, this.visualizer);
    }
  }]);

  return AudioRecorder;
}();

exports.default = AudioRecorder;