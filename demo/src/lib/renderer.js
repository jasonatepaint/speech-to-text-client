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

class Renderer {
  constructor(canvas) {
    if (canvas) {
      this.canvas = canvas;
      this.canvasCtx = canvas.getContext('2d');
      this.listening = true;
    }
  }

  /**
   * Clears the canvas element.
   */
  clearCanvas() {
    if (!this.canvas) return;
    this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.listening = false;
  };

  /**
   * Sets the listening flag to true.
   */
  prepCanvas() {
    this.listening = true;
  };

  /**
   * Clears the canvas and draws the dataArray.
   * @param {Uint8Array} dataArray - The time domain audio data to visualize.
   * @param {number} bufferLength - The FFT length.
   */
  visualizeAudioBuffer(dataArray, bufferLength) {
    if (!this.canvas) return;
    var WIDTH = this.canvas.width;
    var HEIGHT = this.canvas.height;
    var animationId;
    this.canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

    /**
     * Will be called at about 60 times per second. If listening, draw the dataArray.
     */
    let self = this;
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
  };
}

export default Renderer;