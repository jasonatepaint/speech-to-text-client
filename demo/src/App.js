import React, { Component } from 'react';
import './App.css';
import Client from './lib/client.js';


class App extends Component {

  constructor(props) {
    super(props);
    this.state= {
      status: "",
      value: ""
    }
  }

  componentDidMount() {
    const canvas = document.getElementById("visualizer");
    this.speechClient = new Client("ws://localhost:8123", canvas);

    const self = this;
    this.speechClient.on("supported", function(audioSupported) {
      console.log("Is Supported", audioSupported);
      self.setState({audioSupported: audioSupported});
    });

    this.speechClient.on("state", function(state) {
      console.log("STATE CHANGE", state);
      self.setState({status: state});
    });

    this.speechClient.on("result", function(result) {
      console.log("RESULT", result);
      self.setState({value: result});
    })
  }

  onClick = () => {
    this.speechClient.startListening();
  };

  render() {
    return (
      <div className="App">
        <div className="audio-control" onClick={this.onClick}>
          <p id="audio-control" className="white-circle">
            Click Me
              <canvas id="visualizer" className="visualizer"></canvas>
          </p>
          <p><span>{this.state.status}</span></p>
        </div>
        <h1>{this.state.value}</h1>
      </div>
    );
  }
}

export default App;
