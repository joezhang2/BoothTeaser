
let window, document;

let faceTracking, gestureTracking;

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

let workingCanvas,
	workingContext;

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

			runtimeInfo = event.data.runtimeInfo;
			workingCanvas = new OffscreenCanvas(runtimeInfo.video.width, runtimeInfo.video.height);
			workingContext = workingCanvas.getContext('2d');
			faceTracking = new FaceTracking(runtimeInfo.video.width, runtimeInfo.video.height);
			gestureTracking = new GestureTracking();

			postMessage({route: 'initialized'});
			break;
		case 'videoFrameUpdate':
			if(!faceTracking) { return; }
			console.log('processing video', event);

			// ctx.putImageData(imageData, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight)
			workingContext.putImageData(new ImageData( 
				new Uint8ClampedArray( event.data.buffer ),
				runtimeInfo.video.width,
				runtimeInfo.video.height
			), 0, 0, 0, 0, runtimeInfo.video.width, runtimeInfo.video.height);

			faceTracking.detect(workingCanvas).then((faceDims)=>{
				console.log(faceDims);
				postMessage({route: 'updateFacePosition', dims:{ x:0, y:0, z:0, width:100, height: 100} });
			}).catch(()=>{
				postMessage({route: 'noFacesFound' });
			});
		default:
			postMessage({yo: 'had issues, dont even know what to do with this:' + event.data.route });
	}
};

