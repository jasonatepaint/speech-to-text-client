const AudioRecorder = require('./recorder');
const Renderer = require('./renderer');
const AudioControl = require('./control');
const BinaryClient = require('binaryjs-client').BinaryClient;
const EventEmitter = require("events");

class Client {
  constructor(serverUrl, canvas) {
    this.emitter = new EventEmitter();
    this.svc = new SpeechToText(serverUrl, canvas, this.emitter);
  }

  on(type, listener) {
    this.emitter.addListener(type, listener);
  }

  startListening() {
    this.svc.startListening();
  }
}

const SpeechToText = (serverUrl, canvas, emitter) => {

  let renderer = new Renderer(canvas);
  const audioRecorder = new AudioRecorder(renderer);
  const audioControl = new AudioControl(audioRecorder);
  let client, bStream, conversation;

  function startListening() {
    if (conversation)
      conversation.advanceConversation();
  }

  function Conversation() {
    let currentState;

    this.renderer = renderer;

    this.statusTypes = Object.freeze({
      READY: 'Ready',
      LISTENING: 'Listening',
      SENDING: 'Sending',
      TRANSLATED: 'Transcribed'
    });

    this.onSilence = function() {
      audioControl.stopRecording();
      currentState.state.renderer.clearCanvas();
      currentState.advanceConversation();
    };

    this.transition = function(conversation) {
      currentState = conversation;
      var state = currentState.state;

      if (state.status === state.statusTypes.SENDING) {
        currentState.advanceConversation();
      } else if (state.status === state.statusTypes.TRANSLATED) {
        currentState.advanceConversation();
      }
    };

    this.advanceConversation = function() {
      currentState.advanceConversation();
    };

    currentState = new Initial(this);
  }

  function Initial(state) {
    this.state = state;
    state.status = state.statusTypes.READY;
    emitter.emit("state", state.statusTypes.READY);

    this.advanceConversation = function() {
      renderer.prepCanvas();
      audioControl.startRecording(state.onSilence);
      state.transition(new Listening(state));
    }
  }

  function Listening(state) {
    this.state = state;
    state.status = state.statusTypes.LISTENING;
    emitter.emit("state", state.statusTypes.LISTENING);
    this.advanceConversation = function() {
      audioControl.exportWAV(function(blob) {
        state.audioInput = blob;
        state.transition(new Sending(state));
      });
    }
  }

  function Sending(state) {
    this.state = state;
    state.status = state.statusTypes.SENDING;
    emitter.emit("state", state.statusTypes.SENDING);
    this.advanceConversation = function() {

      const sampleRate = 16000;
      let timer = null;
      let isClientOpen = false;
      let lastResultTimestamp, lastMessage;

      //Timeout in case we don't get a quick response from the server
      timer = setTimeout(() => {
        setResponse(null);
      }, 10000);

      client = new BinaryClient(serverUrl, { chunkSize: 32000 });
      client.on('open', function () {
        console.log("client opened");
        bStream = client.createStream({sampleRate: sampleRate});

        bStream.on('data', function(data){
          //skip identical statusTypes
          if (lastMessage === data.message) {
            console.log("skipping");
            return;
          }
          captureMessage(data.message);
        });

        if (bStream && bStream.writable)
          bStream.write(state.audioInput);
      });

      client.on('error', function(e) {
        clearTimeout(timer);
        setResponse(null);
      });

      function setResponse(message) {
        console.log(message);
        state.result = message;
        state.transition(new Transcribed(state));
        isClientOpen = false;
        if (isClientOpen) {
          client.close();
        }
      }

      function captureMessage(message) {
        console.log("msg: ", message);
        lastResultTimestamp = Date.now();
        if (message) {
          lastMessage = message;
        }
        checkForDone();
      }

      function checkForDone() {
        if (!lastResultTimestamp) return;
        var msDiff = Math.abs((Date.now() - lastResultTimestamp));
        if (msDiff >= 500) {
          state.result = lastMessage;
          state.transition(new Transcribed(state));
          lastResultTimestamp = null;
          clearTimeout(timer);
          client.close();
        } else {
          setTimeout(function() {
            checkForDone();
          }, 150);
        }
      }
    }
  }

  function Transcribed(state) {
    this.state = state;
    state.status = state.statusTypes.TRANSLATED;
    emitter.emit("state", state.statusTypes.TRANSLATED);
    emitter.emit("result", state.result);
    this.advanceConversation = function() {
      client.close();

      state.transition(new Initial(state));
    }
  }

  audioControl.supportsAudio(function(supported) {
    if (supported) {
      conversation = new Conversation();
      emitter.emit("supported", true);
    } else {
      emitter.emit("supported", false);
    }
  });

  return {
    startListening: startListening
  }
};

module.exports = Client;
(function(ttsAudio) { ttsAudio.Client = Client; })(ttsAudio);
