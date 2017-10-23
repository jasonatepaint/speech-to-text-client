import AudioRecorder from './recorder';
import Renderer from './renderer';
import AudioControl from './control';
import BinaryClient from 'binaryjs-client';
import EventEmitter from "events";

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
  let client, bStream, conversation, timer;

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
      TRANSCRIBED: 'Transcribed'
    });

    this.onSilence = function() {
      console.log("onSilence");
      if (timer) return;

      //Timeout in case we don't get a quick response from the server
      timer = setTimeout(() => {
        console.log("timed out");
        currentState.state.setResponse(null);
      }, 5000);
    };

    this.onChunkedAudio = function(buffer) {
      if (!buffer) return;
      if (bStream && bStream.writable)
        bStream.write(buffer);
    };

    this.transition = function(conversation) {
      currentState = conversation;
      var state = currentState.state;

      if (state.status === state.statusTypes.TRANSCRIBED) {
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

      const sampleRate = 16000;
      let isClientOpen = false;

      timer = null;
      client = new BinaryClient.BinaryClient(serverUrl);
      client.on('open', function () {
        console.log("client opened");

        bStream = client.createStream({sampleRate: sampleRate});
        bStream.on('data', function(data){
          setResponse(data.message);
        });
      });

      client.on('error', function(e) {
        clearTimeout(timer);
        setResponse(null);
      });

      function setResponse (message) {
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
    }
  }

  function Listening(state) {
    this.state = state;
    state.status = state.statusTypes.LISTENING;
    emitter.emit("state", state.statusTypes.LISTENING);
    this.advanceConversation = function() {
      // audioControl.exportWAV(function(blob) {
      //   state.audioInput = blob;
      //   state.transition(new Sending(state));
      // });
      state.transition(new Transcribed(state));
    }
  }

  function Transcribed(state) {
    this.state = state;
    state.status = state.statusTypes.TRANSCRIBED;
    emitter.emit("state", state.statusTypes.TRANSCRIBED);
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

export default Client;
//(function(ttsAudio) { ttsAudio.Client = Client; })(ttsAudio);
