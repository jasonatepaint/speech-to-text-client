'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var AudioRecorder = require('./recorder');
var Renderer = require('./renderer');
var AudioControl = require('./control');
var BinaryClient = require('binaryjs-client').BinaryClient;
var EventEmitter = require("events");

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

    this.statusTypes = Object.freeze({
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
      client = new BinaryClient(serverUrl);
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

module.exports = Client;
//(function(ttsAudio) { ttsAudio.Client = Client; })(ttsAudio);