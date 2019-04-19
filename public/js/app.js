
const body = document.body,
	doc = document;

const visualsWorker = new Worker('http://localhost:10000/js/workers/visuals.js'),
	controlsWorker = new Worker('http://localhost:10000/js/workers/controls.js');

visualsWorker.onmessage = (event) => {
	console.log(event);
};

controlsWorker.onmessage = (event) => {
	console.log(event);
};

// once these are set, they're set. No changes allowed.
let appDims = {
	width: 0,
	height: 0
};

const initializeApp = (event) => {
	console.log('got a click', event);
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
	
	visualsWorker.postMessage({route:'init', fakeWindow, uiCanvas}, [uiCanvas]); // window is copied, ui is "transfered" via 0 copy
	controlsWorker.postMessage({route:'init', fakeWindow});
	// make sure we don't do this more than once
	startButton.removeEventListener('click', initializeApp);
	body.removeChild(startButton);

	let boxRotationDims = {
		x: 0,
		y: 0
	};

	body.addEventListener('mousemove', (e) => {
		boxRotationDims.x = ((appDims.width/2) - e.pageX) * 0.01;
		boxRotationDims.y = ((appDims.height/2) - e.pageY) * 0.01;

		visualsWorker.postMessage({
			route: 'perspectiveUpdate',
			x: boxRotationDims.x, // left right position from center
			y: boxRotationDims.y, // up down position from center
			z: 10 // distance from center
		});
	});
};

const startButton = doc.createElement('button');
startButton.innerText = 'Ready?';
startButton.style.width = '100%';
startButton.style.height = window.innerHeight+'px';
startButton.addEventListener('click', initializeApp);
body.appendChild(startButton);

const stats = new window.Stats(); // included by index.html
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
body.appendChild( stats.dom );

const raf = ()=>{
	stats.begin();
	// do something between animation frames
	stats.end();
	requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

