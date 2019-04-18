
let window, document;

onmessage = (event) => {
	switch (event.data.route) {
		case 'init':
			init(event.data.fakeWindow); // , event.data.fakeDocument
			postMessage({yo: 'started up'});
			break;
		default:
			postMessage({yo: 'had issues, dont even know what to do with this:' + event.data.route });
			console.log('lol');
	}
};

const init = (global) => {
	window = global;
	window.URL = self.URL;
	window.indexedDB = self.indexedDB;
	window.location = self.location;
	window.localStorage = self.localStorage;
	
	document = {
		createElement: () => {
			switch(element) {
				case 'canvas':
					const canvas = new OffscreenCanvas(1,1);
					canvas.remove = () => { console.log('nope'); };
					return canvas;
				default:
					console.log('arg', element);
					break;
			}
		},
		readyState: 'complete'
	};

	importScripts(
		'/js/libs/face-api.js'
	);
}
