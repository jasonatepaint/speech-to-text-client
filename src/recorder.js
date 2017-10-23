/* globals AudioContext  */

const getUserMedia = require('getusermedia');

class Recorder {
  constructor(source, visualizer) {
    this.recording = false;
    this.visualizer = visualizer;

    // Create a ScriptProcessorNode with a bufferSize of 4096 and a single input and output channel
    this.node = source.context.createScriptProcessor(4096, 1, 1);

    let self = this;
    worker.onmessage = function(message) {
      let buffer = message.data;
      if (buffer)
        self.onChunkedAudio(buffer);
    };

    worker.postMessage({
      command: 'init',
      config: {
        sampleRate: source.context.sampleRate,
      }
    });

    this.clear();

    /**
     * The onaudioprocess event handler of the ScriptProcessorNode interface. It is the EventHandler to be
     * called for the audioprocess event that is dispatched to ScriptProcessorNode node types.
     * @param {AudioProcessingEvent} audioProcessingEvent - The audio processing event.
     */
    this.node.onaudioprocess = function(audioProcessingEvent) {
      if (!self.recording) {
        return;
      }

      worker.postMessage({
        command: 'record',
        buffer: [
          audioProcessingEvent.inputBuffer.getChannelData(0),
        ]
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
  record(onChunkedAudio, onSilence) {
    this.silenceCallback = onSilence;
    this.onChunkedAudio = onChunkedAudio;
    this.start = Date.now();
    this.recording = true;
  };

  /**
   * Sets recording to false.
   */
  stop() {
    this.recording = false;
  };

  /**
   * Posts "clear" message to the worker.
   */
  clear() {
    worker.postMessage({ command: 'clear' });
  };


  /**
   * Checks the time domain data to see if the amplitude of the sound waveform is more than
   * 0.01 or less than -0.01. If it is, "noise" has been detected and it resets the start time.
   * If the elapsed time reaches 1 second the silence callback is called.
   */
  startSilenceDetection() {
    this.analyser.fftSize = 2048;
    let bufferLength = this.analyser.fftSize;
    let dataArray = new Uint8Array(bufferLength);

    this.analyser.getByteTimeDomainData(dataArray);

    if (this.visualizer) {
      this.visualizer.visualizeAudioBuffer(dataArray, bufferLength);
    }

    let curr_value_time = (dataArray[0] / 128) - 1.0;

    if (curr_value_time > 0.01 || curr_value_time < -0.01) {
      this.start = Date.now();
    }
    let newtime = Date.now();
    let elapsedTime = newtime - this.start;
    if (elapsedTime > 1000) {
      this.silenceCallback();
    }
  };
}

class AudioRecorder {
  constructor(visualizer) {
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
  requestDevice() {

    if (typeof this.audioContext === 'undefined') {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
    }

    let self = this;
    return new Promise(function(resolve, reject) {
      getUserMedia({video: false, audio: true}, function (err, stream) {
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
  };

  createRecorder() {
    let source = this.audioContext.createMediaStreamSource(this.audioStream, worker);
    return new Recorder(source, this.visualizer);
  };
}


var workerString = `
var
  SIXTEEN_kHz = 16000,
  sampleRate;

var onmessage = function(e) {
  switch (e.data.command) {
    case 'init':
      init(e.data.config);
      break;
    case 'record':
      record(e.data.buffer);
      break;
  }
};

function init(config) {
  sampleRate = config.sampleRate;
}

function record(inputBuffer) {
  var recBuffer = [ inputBuffer[0] ];
  var recLength = inputBuffer[0].length;

  var mergedBuffers = mergeBuffers(recBuffer, recLength);
  var downsampledBuffer = downsampleBuffer(mergedBuffers, SIXTEEN_kHz);
  postMessage(convertFloat32ToInt16(downsampledBuffer));
}

function convertFloat32ToInt16(buffer) {
  var l = buffer.length;
  var buf = new Int16Array(l);
  while (l--) {
    buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
  }
  return buf.buffer;
}

function downsampleBuffer(buffer) {
  if (SIXTEEN_kHz === sampleRate) {
    return buffer;
  }
  var sampleRateRatio = sampleRate / SIXTEEN_kHz;
  var newLength = Math.round(buffer.length / sampleRateRatio);
  var result = new Float32Array(newLength);
  var offsetResult = 0;
  var offsetBuffer = 0;
  while (offsetResult < result.length) {
    var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    var accum = 0,
      count = 0;
    for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = accum / count;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function mergeBuffers(bufferArray, recLength) {
  var result = new Float32Array(recLength);
  var offset = 0;
  for (var i = 0; i < bufferArray.length; i++) {
    result.set(bufferArray[i], offset);
    offset += bufferArray[i].length;
  }
  return result;
}
`;
var blob = new Blob([workerString]);
var blobUrl = window.URL.createObjectURL(blob);
const worker = new Worker(blobUrl);


export default AudioRecorder;
