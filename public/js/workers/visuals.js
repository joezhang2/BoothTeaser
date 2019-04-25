let window, document;

let ui;

let appDims = {
	width: 0,
	height: 0
};

let videoDims = {
	width: 0,
	height: 0
};

onmessage = (event) => {
	if (!ui && event.data.route === 'init') {
		window = event.data.fakeWindow;
		window.URL = self.URL;
		window.indexedDB = self.indexedDB;
		window.location = self.location;

		// just to make it match the parent thread
		appDims = event.data.runtimeInfo.ui;
		videoDims = event.data.runtimeInfo.video;

		// Three.js tried to edit these values of canvas (which do not exist, or are not settable on OffscreenCanvas)
		event.data.uiCanvas.style = {
			width: appDims.width,
			height: appDims.height
		};

		document = {
			createElement: (element) => {
				console.warn('Something is trying to make a node in a worker:', element);
				switch(element) {
					default: throw new Error('Something is trying to make a node in a worker');
				}
			},
			readyState: 'complete'
		};
	
		importScripts(
			'/js/libs/headposition.js',
			'/js/libs/three.js',
			'/js/libs/BufferGeometryUtils.js',
		//	'/js/libs/GeometryUtils.js',
			'/js/libs/TweenMax.js',
			'/js/workers/visuals/ui.js', 
			'/js/libs/faker.js'
		);

		ui = new UserInterface(THREE, event.data.uiCanvas, videoDims, appDims);
		ui.start3d();

		postMessage({route: 'initialized'});
	} else if (ui) {
		switch (event.data.route) {
			case 'perspectiveUpdate':
				console.log('manually setting perspective to', event.data);
				ui.updatePerspective(event.data);
				break;
			case 'focusOnProfile':
				// console.log('following', event.data.vip);
				ui.trackProfile(event.data.vip);
				break;
			default:
				postMessage({yo: 'had issues, dont even know what to do with this:' + event.data.route });
		}
	} else {
		console.log('the world isnt ready for', event);
	}
};
