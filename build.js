var fs = require('fs');
var worker = fs.readFileSync('./worker.js', 'utf-8');
var recorder = fs.readFileSync('./dist/recorder.js', 'utf-8');

recorder = recorder.replace("'@@@WORKER_JS_CONTENT@@@'", "`" + worker + "`");
fs.writeFileSync('./dist/recorder.js', recorder, 'utf-8');

