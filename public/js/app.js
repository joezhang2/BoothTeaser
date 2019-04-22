
const body = document.body,
	doc = document,
	video = document.createElement('video');

const visualsWorker = new Worker('http://localhost:10000/js/workers/visuals.js'),
	controlsWorker = new Worker('http://localhost:10000/js/workers/controls.js'),
	videoApp = new VideoApp();

// once these are set, they're set. No changes allowed.
let appDims = {
	width: 0,
	height: 0
};

let startButton;

let boxRotationDims = {
	x: 0,
	y: 0
};
let runtimeInfo = {
	video: {
		width: 0,
		height: 0
	},
	ui: {
		width: 0,
		height: 0
	}
};

const initializeApp = () => {
	return new Promise(resolve => {
		// it's this value forever now
		appDims.width = window.innerWidth;
		appDims.height = window.innerHeight;

		const domCanvas = doc.createElement('canvas');
		domCanvas.width = appDims.width;
		domCanvas.height = appDims.height;
		domCanvas.style.background = '#000';
		body.style.background = '#000';
		const uiCanvas = domCanvas.transferControlToOffscreen(); // creates an offscreen canvas element that can be transfered to a web worker and keeps it linked to the original canvas
		body.appendChild(domCanvas);

		let fakeWindow = {
			devicePixelRatio: window.devicePixelRatio,
			screen: { 
				width: window.screen.width,
				height: window.screen.height
			},
			innerWidth: appDims.width,
			innerHeight: appDims.height,
			navigator: {
				userAgent: navigator.userAgent,
				vendor: navigator.vendor
			}
		};
		
		runtimeInfo.video.width = video.videoWidth;
		runtimeInfo.video.height = video.videoHeight;
		runtimeInfo.ui.width = appDims.width;
		runtimeInfo.ui.height = appDims.height;

		let startupPromises = [];

		startupPromises.push(new Promise(r=>{
			visualsWorker.onmessage = (event) => {
				if (event.data.yo) {
					console.log('visual worker says:', event.data.yo, event.data);
				} else {
					switch (event.data.route) {
						case 'initialized':
							r();
							console.log('initialized visuals');
							break;
						default:
							console.log('not sure what to do here', event.data);
					}
				}
			};
		}));
		
		startupPromises.push(new Promise(r=>{
			controlsWorker.onmessage = (event) => {
				if (event.data.yo) {
					console.log('visual worker says:', event.data.yo, event.data);
				} else {
					switch (event.data.route) {
						case 'initialized':
							console.log('initialized controls');
							r();
							break;
						case 'updateFacePosition':
							visualsWorker.postMessage({
								route: 'perspectiveUpdate',
								x: boxRotationDims.x, // left right position from center
								y: boxRotationDims.y, // up down position from center
								z: 10 // distance from center
							});
							break;
						default:
							console.log('not sure what to do here', event.data);
					}
				}
			};
		}));

		visualsWorker.postMessage({route:'init', fakeWindow, uiCanvas}, [uiCanvas]); // window is copied, ui is "transfered" via 0 copy
		controlsWorker.postMessage({route:'init', fakeWindow, runtimeInfo});
		// make sure we don't do this more than once
		startButton.removeEventListener('click', initializeApp);
		body.removeChild(startButton);

		Promise.all(startupPromises).then(()=>{
			resolve();
		});

	});
};

const stats = new window.Stats(); // included by index.html
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
body.appendChild( stats.dom );

const vidCanvas = document.createElement('canvas');
let vidCanvasCtx;

const raf = ()=>{
	stats.begin();

	vidCanvasCtx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
	
	if (0) { // send visuals to the 3d universe?
		// Instead of returning an ImageData object, this returns this as a Uint8ClampedArray instead. Thanks?
		const uiData = vidCanvasCtx.getImageData(
			0,
			0,
			video.videoWidth,
			video.videoHeight
		);

		// This should send as often as a frame needs to be rendered to the screen
		visualsWorker.postMessage({
			route:'videoFrameUpdate',
			uiData: uiData.data.buffer
		}, [uiData.data.buffer]); // "transfered" via 0 copy, which is really 0 serialize deserialize
	}

	// update this with a boolean representing processing state on worker
	// This should be throttled so it runs when the detections arent already running on a still
	if(1){
		const controlsData = vidCanvasCtx.getImageData(
			0,
			0,
			video.videoWidth,
			video.videoHeight
		);
		const buffer = controlsData.data.buffer;
		console.log('sending buffer', buffer);
		controlsWorker.postMessage({
			route: 'videoFrameUpdate', 
			buffer: buffer
		}, [buffer]); // "transfered"
		console.log('sent buffer', buffer);
	}

	stats.end();
	// requestAnimationFrame(raf);
}

videoApp.startVideo().then((videoMetaData)=>{
	console.log('video loadedmetadata received', videoMetaData);
	startButton = doc.createElement('button');
	startButton.innerText = 'Ready?';
	startButton.style.width = '100%';
	startButton.style.height = window.innerHeight+'px';
	startButton.addEventListener('click', ()=>{
		initializeApp().then(()=>{
			body.addEventListener('mousedown', (e) => {
				boxRotationDims.x = ((appDims.width/2) - e.pageX) * 0.01;
				boxRotationDims.y = ((appDims.height/2) - e.pageY) * 0.01;
	
				// this will be replaced by face detection updates
				visualsWorker.postMessage({
					route: 'perspectiveUpdate',
					x: boxRotationDims.x, // left right position from center
					y: boxRotationDims.y, // up down position from center
					z: 10 // distance from center
				});
			});
			requestAnimationFrame(raf);
		});
	});
	body.appendChild(startButton);

	vidCanvas.width = video.videoWidth;
	vidCanvas.height = video.videoHeight;
	vidCanvasCtx = vidCanvas.getContext('2d');
});

function VideoApp(){

	this.startVideo = () => {
		return new Promise((resolve, reject)=>{
			// first you get the permissions
			askForAudioVideoPermissions()
			// then you have all the device labels to pick from
			.then(chooseBestDeviceForAV)
			// then you actually get the media from the device you want
			.then(device=>startPlayingVideo(device, video))
			// then you can run start setting up a 3D environment to use it
			.then(() => {
				video.addEventListener('loadedmetadata', loadedmetadata => {
					resolve(loadedmetadata);
				});
			}).catch(err=>{
				console.error('Error while attempting to start video stream', err);
				reject(err);
			});
		});
	};
	
	const startPlayingVideo = (device, video) => {
		return new Promise((resolve, reject) => {
			navigator.mediaDevices.getUserMedia({ 
				// Constraints: https://w3c.github.io/mediacapture-main/#media-track-supported-constraints
				video: {
					// qvga(mbp 15) = 320x240
					// vga(mbp 15-19) = 640x480
					// hd(mbp 17-19) = 1280x720
					// full hd(camcorder) = 1920x1080
					// 4k(camcorder) = 4096x2160
					// 8k(SLR) = 7680x4320
					deviceId: device.deviceId,
					width: { min: 640, ideal: 4096, max: 7680 },
					height: { min: 480, ideal: 2160, max: 4320 }
	//				frameRate: { ideal: 1, max: 1 }
				}, 
				audio: false
			}).then(stream => {
				console.log('Playing video camera stream');
				video.srcObject = stream;
				video.play();
				resolve();
			})
			.catch(err => {
				console.log('An error occurred: ', err);
				reject(err);
			});
		});
	};

	const chooseBestDeviceForAV = () => {
		return new Promise((resolve, reject)=>{
			navigator.mediaDevices.enumerateDevices().then((devices) => {
				// Don't want to add a UI, so this is purpose driven selection logic for the demo.
				const rankedDevices = [
					'FaceTime HD Camera (05ac:8514)',
					'FaceTime HD Camera'
				].reverse();
		
				let lastBest = -1;
				const device = devices.reduce((accumulator, myDevice) => {
					if(myDevice.kind === 'videoinput') {
						let rank = rankedDevices.findIndex(label => myDevice.label === label);
			
						// return the best available device based on ranking
						if (rank > lastBest) {
							lastBest = rank;
							return myDevice;
			
						// save the default over the unknowns (don't know if this video lists as default on other platforms, but doesnt on my mac)
						} else if (rank === -1 && myDevice.deviceId === 'default') {
							return myDevice;
			
						// save last instance of a supportable unranked device as "the device"
						} else if (rank === -1 && !accumulator) {
							return myDevice;
						}
					}
			
					return accumulator;
				});
		
				resolve(device);
			}).catch(err => reject(err));
		});
	};
	
	
	const askForAudioVideoPermissions = () => {
		return new Promise((resolve, reject)=>{
			const supports = navigator.mediaDevices.getSupportedConstraints();
	
			if (!supports.aspectRatio || !supports.facingMode || !supports.width || !supports.height) {
				return reject({
					message: 'Lack of AV feature support on device',
					supports
				});
			}
	
			navigator.mediaDevices.getUserMedia({
				video:true,
				audio:true
			}).then(stream=>{
				resolve(stream);
			}).catch(err=>{
				reject(err);
			});
		});
	};	
}
