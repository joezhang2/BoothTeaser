
let window, document;

let faceTracking, gestureTracking;

onmessage = (event) => {
	switch (event.data.route) {
		case 'init':
			window = event.data.fakeWindow;
			window.URL = self.URL;
			window.indexedDB = self.indexedDB;
			window.location = self.location;
			
			document = {
				createElement: (element) => {
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
				'/js/libs/face-api.js',
				'/js/workers/controls/face-tracking.js',
				'/js/workers/controls/gesture-tracking.js'
			);

			faceTracking = new FaceTracking();
			gestureTracking = new GestureTracking();

			postMessage({yo: 'started up controls.js'});
			break;
		default:
			postMessage({yo: 'had issues, dont even know what to do with this:' + event.data.route });
	}
};

