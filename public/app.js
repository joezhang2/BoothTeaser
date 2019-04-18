
const visualsWorker = new Worker('/js/workers/visuals.js'),
	controlsWorker = new Worker('/js/workers/controls.js');

visualsWorker.onmessage = (event) => {
	console.log(event, visualsWorkerBuffer);
};

controlsWorker.onmessage = (event) => {
	console.log(event, controlsWorkerBuffer);
};

const visualsWorkerBuffer = new ArrayBuffer(8);
const controlsWorkerBuffer = new ArrayBuffer(8);

let fakeWindow = {
	devicePixelRatio: window.devicePixelRatio,
	screen: { 
		width: window.screen.width,
		height: window.screen.height
	},
	navigator: {
		userAgent: navigator.userAgent,
		vendor: navigator.vendor
	},
	URL: {
		createObjectURL: {}
	},
	indexedDB: {},
	localStorage: {
		removeItem: {}
	},
	location: {
		search: {}
	}
};

visualsWorker.postMessage({route:'init', contents: visualsWorkerBuffer}, [visualsWorkerBuffer]);
controlsWorker.postMessage({route:'init', fakeWindow});
