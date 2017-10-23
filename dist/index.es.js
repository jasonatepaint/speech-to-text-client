import _Object$freeze from 'babel-runtime/core-js/object/freeze';
import _classCallCheck from 'babel-runtime/helpers/classCallCheck';
import _createClass from 'babel-runtime/helpers/createClass';
import _Promise from 'babel-runtime/core-js/promise';
import BinaryClient from 'binaryjs-client';
import EventEmitter from 'events';

/* globals AudioContext  */
/* globals ttsAudio  */

var worker = new Worker('./worker.js');
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
      return new _Promise(function (resolve, reject) {
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

/*
 * Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
/* globals requestAnimationFrame */

var Renderer = function () {
  function Renderer(canvas) {
    _classCallCheck(this, Renderer);

    if (canvas) {
      this.canvas = canvas;
      this.canvasCtx = canvas.getContext('2d');
      this.listening = true;
    }
  }

  /**
   * Clears the canvas element.
   */


  _createClass(Renderer, [{
    key: 'clearCanvas',
    value: function clearCanvas() {
      if (!this.canvas) return;
      this.canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      this.listening = false;
    }
  }, {
    key: 'prepCanvas',


    /**
     * Sets the listening flag to true.
     */
    value: function prepCanvas() {
      this.listening = true;
    }
  }, {
    key: 'visualizeAudioBuffer',


    /**
     * Clears the canvas and draws the dataArray.
     * @param {Uint8Array} dataArray - The time domain audio data to visualize.
     * @param {number} bufferLength - The FFT length.
     */
    value: function visualizeAudioBuffer(dataArray, bufferLength) {
      if (!this.canvas) return;
      var WIDTH = this.canvas.width;
      var HEIGHT = this.canvas.height;
      var animationId;
      this.canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

      /**
       * Will be called at about 60 times per second. If listening, draw the dataArray.
       */
      var self = this;
      function draw() {
        if (!self.listening) {
          return;
        }

        self.canvasCtx.fillStyle = 'rgb(249,250,252)';
        self.canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
        self.canvasCtx.lineWidth = 1;
        self.canvasCtx.strokeStyle = 'rgb(0,125,188)';
        self.canvasCtx.beginPath();

        var sliceWidth = WIDTH * 1.0 / bufferLength;
        var x = 0;

        for (var i = 0; i < bufferLength; i++) {
          var v = dataArray[i] / 128.0;
          var y = v * HEIGHT / 2;
          if (i === 0) {
            self.canvasCtx.moveTo(x, y);
          } else {
            self.canvasCtx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        self.canvasCtx.lineTo(self.canvas.width, self.canvas.height / 2);
        self.canvasCtx.stroke();
      }

      // Register our draw function with requestAnimationFrame.
      if (typeof animationId === 'undefined') {
        animationId = requestAnimationFrame(draw);
      }
    }
  }]);

  return Renderer;
}();

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

var Client = function () {
  function Client(serverUrl, canvas) {
    _classCallCheck(this, Client);

    this.emitter = new EventEmitter();
    this.svc = new SpeechToText(serverUrl, canvas, this.emitter);
  }

  _createClass(Client, [{
    key: 'on',
    value: function on(type, listener) {
      this.emitter.addListener(type, listener);
    }
  }, {
    key: 'startListening',
    value: function startListening() {
      this.svc.startListening();
    }
  }]);

  return Client;
}();

var SpeechToText = function SpeechToText(serverUrl, canvas, emitter) {

  var renderer = new Renderer(canvas);
  var audioRecorder = new AudioRecorder(renderer);
  var audioControl = new AudioControl(audioRecorder);
  var client = void 0,
      bStream = void 0,
      conversation = void 0,
      timer = void 0;

  function startListening() {
    if (conversation) conversation.advanceConversation();
  }

  function Conversation() {
    var currentState = void 0;

    this.renderer = renderer;

    this.statusTypes = _Object$freeze({
      READY: 'Ready',
      LISTENING: 'Listening',
      TRANSCRIBED: 'Transcribed'
    });

    this.onSilence = function () {
      console.log("onSilence");
      if (timer) return;

      //Timeout in case we don't get a quick response from the server
      timer = setTimeout(function () {
        console.log("timed out");
        currentState.state.setResponse(null);
      }, 5000);
    };

    this.onChunkedAudio = function (buffer) {
      if (!buffer) return;
      if (bStream && bStream.writable) bStream.write(buffer);
    };

    this.transition = function (conversation) {
      currentState = conversation;
      var state = currentState.state;

      if (state.status === state.statusTypes.TRANSCRIBED) {
        currentState.advanceConversation();
      }
    };

    this.advanceConversation = function () {
      currentState.advanceConversation();
    };

    currentState = new Initial(this);
  }

  function Initial(state) {
    this.state = state;
    state.status = state.statusTypes.READY;
    emitter.emit("state", state.statusTypes.READY);

    this.advanceConversation = function () {
      renderer.prepCanvas();

      var sampleRate = 16000;
      var isClientOpen = false;

      timer = null;
      client = new BinaryClient.BinaryClient(serverUrl);
      client.on('open', function () {
        console.log("client opened");

        bStream = client.createStream({ sampleRate: sampleRate });
        bStream.on('data', function (data) {
          setResponse(data.message);
        });
      });

      client.on('error', function (e) {
        clearTimeout(timer);
        setResponse(null);
      });

      function setResponse(message) {
        clearTimeout(timer);
        state.result = message;

        isClientOpen = false;
        if (isClientOpen) {
          client.close();
        }

        audioControl.stopRecording();
        state.renderer.clearCanvas();
        state.transition(new Transcribed(state));
      }
      state.setResponse = setResponse;

      audioControl.startRecording(state.onChunkedAudio, state.onSilence);
      state.transition(new Listening(state));
    };
  }

  function Listening(state) {
    this.state = state;
    state.status = state.statusTypes.LISTENING;
    emitter.emit("state", state.statusTypes.LISTENING);
    this.advanceConversation = function () {
      // audioControl.exportWAV(function(blob) {
      //   state.audioInput = blob;
      //   state.transition(new Sending(state));
      // });
      state.transition(new Transcribed(state));
    };
  }

  function Transcribed(state) {
    this.state = state;
    state.status = state.statusTypes.TRANSCRIBED;
    emitter.emit("state", state.statusTypes.TRANSCRIBED);
    emitter.emit("result", state.result);
    this.advanceConversation = function () {
      client.close();

      state.transition(new Initial(state));
    };
  }

  audioControl.supportsAudio(function (supported) {
    if (supported) {
      conversation = new Conversation();
      emitter.emit("supported", true);
    } else {
      emitter.emit("supported", false);
    }
  });

  return {
    startListening: startListening
  };
};


//(function(ttsAudio) { ttsAudio.Client = Client; })(ttsAudio);

export { Client };
//# sourceMappingURL=index.es.js.map
