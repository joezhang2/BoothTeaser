import _ from 'lodash';

const faceapi = require('face-api.js');
const MODELS_PATH = '/public/models'

$(document).ready(function() {
    run()
  })
      
  async function run() {
    // load the models
    await faceapi.loadTinyFaceDetectorModel(MODELS_PATH)
    await faceapi.loadFaceRecognitionModel(MODELS_PATH)
    
    // try to access users webcam and stream the images
    // to the video element
    const videoEl = document.getElementById('inputVideo')
    navigator.getUserMedia(
      { video: {} },
      stream => videoEl.srcObject = stream,
      err => console.error(err)
    )
  }

  
  async function detect(){
    const input = document.getElementById('inputVideo');
    const detections2 = await faceapi.detectAllFaces(input, new faceapi.TinyFaceDetectorOptions())
    const regionsToExtract = detections2.map(faceDetection=> faceDetection.box)
    const canvases = await faceapi.extractFaces(input, regionsToExtract)
    canvases.forEach((c)=>document.getElementById("left-div").appendChild(c))
}
  
async function onPlay(videoEl) {
  detect()
  
  setTimeout(() => onPlay(videoEl),3000)
}

window.onPlay = onPlay