
// Namespace for face detection component
function FaceTracking(sourceWidth, sourceHeight) {

	let busy = false;
	let ready = false;

	const videoDims = {
		width: sourceWidth,
		height: sourceHeight
	};

	const startTime = Date.now();

	this.startFaceTracking = async ()=>{
		return new Promise(async (resolve)=>{
			const MODELS_PATH = '/js/models';

			await faceapi.loadTinyFaceDetectorModel(MODELS_PATH);
			console.log('after loadTinyFaceDetectorModel', Date.now() - startTime);
			await faceapi.loadFaceRecognitionModel(MODELS_PATH);
			console.log('after loadFaceRecognitionModel', Date.now() - startTime);
			await faceapi.loadFaceLandmarkTinyModel(MODELS_PATH);
			console.log('after loadFaceLandmarkTinyModel', Date.now() - startTime);	
			ready = true;
			resolve();
		});
	};

	let profileCache = [];
	let updateCamera;
	
	const guid = ()=>{
		function s4() {
		  return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
		}
		return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
		  s4() + '-' + s4() + s4() + s4();
	};

	const createPerson = (active, profile, boundary, priority, timestamp, landmarks) => {
		return {
			uuid: guid(),
			active,
			profile,
			boundary,
			priority,
			timestamp,
			landmarks,
			idleTimeout: null
		};
	};
	
	const createProfileCacheEntry = (box, landmarks) => {
		profileCache.push(createPerson(true, faker.helpers.createCard(), box, box.area, Date.now(), landmarks));
	
		// use a timeout as a delegate to handle updates on next thread run, and if one is already scheduled, do nothing.
		if(!updateCamera){ updateCamera = setTimeout(updateCameraWithNewFacePosition, 0); }
	
		return profileCache[profileCache.length-1].uuid;
	};
	
	
	const updateProfileCacheEntry = (uuid, box, active, landmarks) => {
		const index = profileCache.findIndex(person => person.uuid === uuid);
		if (index > -1) {
			const person = profileCache[index];
			person.active = active;
			person.boundary = box;
			person.timestamp = Date.now();
			person.priority = box.area;
			person.landmarks = landmarks;
			if (person.idleTimeout) { clearTimeout(person.idleTimeout); person.idleTimeout = null; }
		} else {
			console.error(uuid, 'was not found in list on updated');
		}
	
		// use a timeout as a delegate to handle updates on next thread run, and if one is already scheduled, do nothing.
		if(!updateCamera){ updateCamera = setTimeout(updateCameraWithNewFacePosition, 0); }
	
		return uuid;
	};
	
	
	const deactivateProfileCacheEntry = uuid => {
		const index = profileCache.findIndex(person => person.uuid === uuid);
		if (index > -1) {
			const person = profileCache[index];
			if (!person.idleTimeout) {
				// if a person disappears from view for 1 second, mark them as inactive
				person.idleTimeout = setTimeout(() => {
					person.active = false;
				}, 1000);
			}
		} else {
			console.error(uuid, 'was not found in list on deactivate');
		}
	
		// use a timeout as a delegate to handle updates on next thread run, and if one is already scheduled, do nothing.
		if(!updateCamera){ updateCamera = setTimeout(updateCameraWithNewFacePosition, 0); }
	};
	
	
	const cropBounds = (x,y,w,h) => {
		return {
			x,
			y,
			width: w,
			height: h
		};
	};
	
	var videoCrop = cropBounds(0,0,640,480);
	
	// mouse cursor replacement bounds 
	var facePosition = new faceapi.Rect(0, 0, 0, 0);
	var vidMap;
	var mvp;
	
	const cropVideo = (map, cropDims, originalBounds) => {
		// how to crop: https://github.com/mrdoob/three.js/issues/1847
		map.repeat.x = cropDims.width / originalBounds.width; // (crop size in pixels / texture width in pixels)
		map.repeat.y = cropDims.height / originalBounds.height;
		map.offset.x = ( cropDims.x / cropDims.width ) * map.repeat.x; // position x in pixels / crop size in pixels
		map.offset.y = ( cropDims.y / cropDims.height ) * map.repeat.y;
	};
	
	
	let lastBestArea = 0;
	let videoCropTweens = [];
	let cameraTweens = [];
	let cameraTarget = {x:0,y:0};
	
	
	const calculateCameraPositionFromViewerPerspective = vip => {
		mvp = vip;
		
		//	2D math
		//	|--------------------------------------------------|	x max = video width
		//	|---------------------------|							x center = video width/2
		//	|														x origin = 0
		//	|								   .____|___.
		//	|----------------------------------| ( 0_0) |			x face pos = face.x + (face.width/2) = face center
		//	|								   +----|---+
		//								|-----------|				x delta from center = face pos - (video width/2)
		//															delta from center = (face pos - (video width/2))/(video width/2)
	
		//
		//	3D math
		//	|--------------------------------------------------|	x max = visible bounds/2
		//	|---------------------------|							x center = 0
		//	|														x origin = (visible bounds/2) * -1
		//
		//															delta between 2D and 3D = visible bounds / video width
		//															x relative camera position = dim delta * x delta from center
	
		// Center point before - center point after = distance;
		const xFacePos2D = mvp.boundary.x + (mvp.boundary.width/2);
		const xDeltaFromCenter = xFacePos2D - (videoDims.width/2);
		const deltaBetweenHorizontalDims = visibleBounds.width / videoDims.width;
		const xRelativeCameraPos = deltaBetweenHorizontalDims * xDeltaFromCenter;
		const xTargetAdjusted = xRelativeCameraPos * 0.35; // only allow it to be half the actual distance from origin
	
		const yFacePos2D = mvp.boundary.y + (mvp.boundary.height/2);
		const yDeltaFromCenter = yFacePos2D - (videoDims.height/2);
		const deltaBetweenVerticalDims = visibleBounds.height / videoDims.height;
		const yRelativeCameraPos = deltaBetweenVerticalDims * yDeltaFromCenter;
		const yTargetAdjusted = yRelativeCameraPos * 0.5; // only allow it to be half the actual distance from origin
	
		console.log({xFacePos2D,xDeltaFromCenter,deltaBetweenHorizontalDims,xRelativeCameraPos,xTargetAdjusted});
		console.log({yFacePos2D,yDeltaFromCenter,deltaBetweenVerticalDims,yRelativeCameraPos,yTargetAdjusted});
		return {
			x: xTargetAdjusted,
			y: yTargetAdjusted
		};
	};
	
	const updateCameraWithNewFacePosition = () => {

		console.log('-!-!-!-!- update camera position');
		console.log('current camera pos', camera.position.x, updateCamera);
		// clear update delegates if any are pending
		if(updateCamera) { clearTimeout(updateCamera); updateCamera = null; }
	
		let faces = profileCache;
		
		let vip;
	
		console.log(faces);
		for (let i = 0; i < faces.length; i++) {
			let person = faces[i];
			console.log('am i active', person.active, person.uuid, person.idleTimeout);
			if (person.active && !person.idleTimeout && (!vip || person.priority > vip.priority)) {
				vip = person;
				console.log('best area is now', person.priority);
			}
		}
		
		if (!vip) {
			if (!idleCameraTimeout) {
				idleCameraTimeout = setTimeout(() => {
					cameraTarget = {x:0,y:0};
					updateCameraWithNewFacePosition();
				}, 10000);
			}
		} else {
			if (idleCameraTimeout) { clearTimeout(idleCameraTimeout); idleCameraTimeout = null; }
	
			cameraTarget = calculateCameraPositionFromViewerPerspective(vip);
		}
	
		if (cameraTweens.length) {
			cameraTweens.pop().kill();
			cameraTweens.pop().kill();
		}
	
		cameraTweens.push(TweenMax.to(camera.position, 2, {
			x: cameraTarget.x,
			ease: Power1.easeOut, 
			onComplete: () => {console.log('finished tween', camera.position.x)}
		}));
		cameraTweens.push(TweenMax.to(camera.rotation, 2, {
			y: cameraTarget.y,
			ease: Power1.easeOut, 
			onComplete: () => {console.log('finished tween', camera.position.x)}
		}));
	
		// cameraTweens.push(TweenMax.to(camera.position, 0.5, {y, ease: Power2.easeInOut}));
	
		if (videoCropTweens.length) {
			// videoCropTweens.pop().kill();
			// videoCropTweens.pop().kill();
		}
		// videoCropTweens.add(TweenMax.to(vidMap.rotation, 0.5, {x: 1, ease: Power2.easeInOut}));
		// videoCropTweens.add(TweenMax.to(vidMap.position, 0.5, {x: 1, ease: Power2.easeInOut}));



		postMessage({
			
		});
	};
	
	
	/*
	const photoRatio = 4/3;
	const thumb = { 
		width: 300, // height = 225
		height: 300 * photoRatio
	};
	
	const faces = detections.map(face => {
		//console.log(face.detection.box);
		const fb = face.detection.box;
	
		let scale = 1,
			inverseScale = 1;
	
		// scratch pad for math
		let adjusted = {
			scaledWidthPadding: 0,
			scaledHeightPadding: 0,
			originalWidthPadding: 0,
			originalHeightPadding: 0
		};
	
		let frame = cropBounds(0,0,0,0);
	
		// square image for portrait fill
		// landscape image for portrait fill
		if (fb.width === fb.height || fb.width > fb.height) {
			// resize to fit width
			scale = thumb.width / fb.width;
			inverseScale = fb.width / thumb.width;
	
			adjusted.scaledWidth = fb.width * scale;
			adjusted.scaledWidthPadding = 0;
			adjusted.originalWidthPadding = 0;
	
			adjusted.scaledHeight = fb.height * scale;
			adjusted.scaledHeightPadding = thumb.height - adjusted.scaledHeight;
			adjusted.originalHeightPadding = (adjusted.scaledHeightPadding * inverseScale);
	
			// calculate the new x/y w/h rect for source image using applied fill and centering logic
			frame.x = fb.x;
			frame.y = fb.y - (adjusted.originalHeightPadding/2); // centered capture point
			frame.width = fb.width;
			frame.height = fb.height + adjusted.originalHeightPadding;
	
		// portrait image for portrait fill
		} else {
			// resize to fit height
			scale = thumb.height / fb.height;
			inverseScale = fb.height / thumb.height;
	
			adjusted.scaledWidth = fb.width * scale;
			adjusted.scaledWidthPadding = thumb.width - adjusted.scaledWidth;
			adjusted.originalWidthPadding = (adjusted.scaledWidthPadding * inverseScale);
	
			adjusted.scaledHeight = fb.height * scale;
			adjusted.scaledHeightPadding = 0;
			adjusted.originalHeightPadding = 0;
	
			// calculate the new x/y w/h rect for source image using applied fill and centering logic
			frame.x = fb.x - (adjusted.originalWidthPadding/2); // centered capture point
			frame.y = fb.y;
			frame.width = fb.width + adjusted.originalWidthPadding;
			frame.height = fb.height;
	
		}
		//console.log(fb, adjusted, frame);
	
		frame.x = frame.x < 0 ? (()=> { console.log('x was negative', frame.x); return 0; })() : frame.x;
		frame.y = frame.y < 0 ? (()=> { console.log('y was negative', frame.y); return 0; })() : frame.y;
	
		// videoCrop = frame;
		// facePosition = face.detection.box;
		return {
			profile: makeProfile(getRandomName(), '444-11-6666', '+1-541-754-3010', '', ''),
			originalBox: face.detection.box,
			croppedBox: new faceapi.Rect(frame.x, frame.y, frame.width, frame.height)
		};
	});
	*/

	let labeledDescriptors = [];
	let appIdleTimeout;
	this.detect = videoCanvas => {
		return new Promise(resolve=>{
			if (busy || !ready) {
				console.log('Requested detection, but models have not loaded yet.');
				resolve();
			}
			busy = true;
			faceapi.detectAllFaces(videoCanvas, new faceapi.TinyFaceDetectorOptions())
			.withFaceLandmarks(true)
			.withFaceDescriptors()
			.then(detections => {
				console.log('================================');
				console.log('detection length', detections.length);
				// found something
				if(detections.length > 0){
					// Everyone is new. First time running through things.
					if(profileCache.length === 0) {
						labeledDescriptors = detections.map(detection => {
							const uuid = createProfileCacheEntry(detection.detection.box, detection.landmarks);
							return new faceapi.LabeledFaceDescriptors(uuid, [detection.descriptor]);
						});
					// probably know someone
					} else {
						// prime previous matches
						const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors);
						// look though previous faces and qualify how good they are
						const matches = detections.map(d => faceMatcher.matchDescriptor(d.descriptor));
						// see if there are any good ones, and if so, find out which ones
						const activeUuids = matches.map((m,i) => { 
							let uuid;
							if (m.distance > 0.6) { // was 0.6, but found low light testing was around 0.5
								uuid = createProfileCacheEntry(detections[i].detection.box, detections[i].landmarks);
								console.log('creating new user entry', uuid);
								labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(uuid, [detections[i].descriptor]));
							} else {
								uuid = updateProfileCacheEntry(m.label, detections[i].detection.box, true, detections[i].landmarks);
								console.log('Updated user entry', uuid);
							}
							return uuid;
						});
		
						// sort through the knowns
						const allUuids = labeledDescriptors.map(descriptor => descriptor.label);
						// cross check them with active faces and if none exist...
						const inactiveUuids = allUuids.filter(uuid => activeUuids.indexOf(uuid) < 0);
						// loop through the leftovers and mark them inactive
						inactiveUuids.forEach(deactivateProfileCacheEntry);
		
						console.log('---------------------------------------');
						console.log('total labels', labeledDescriptors.length);
						console.log('total detections', detections.length);
						console.log('total matches', matches.length);
						console.log('total activeUuids', activeUuids.length);
						console.log('total allUuids', activeUuids.length);
						console.log('total inactiveUuids', activeUuids.length);
						console.log('---------------------------------------');
					}
				} else {
					// when there are no faces detected, filter the profile cache to active users and deactivate just those users
					let activePersons = [];
					labeledDescriptors.forEach(descriptor => {
						activePersons = activePersons.concat(profileCache.filter(person => {
							if (descriptor.label === person.uuid && person.active) {
								return true;
							}
						}));
					})
					console.log('***** These are the active persons that should be marked as inactive', activePersons);
					activePersons.reduce((x, y) => x.includes(y) ? x : [...x, y], []).forEach(person => {
						console.log('This person was deemed unfit for focus', person.uuid);
						deactivateProfileCacheEntry(person.uuid);
					});
				}
				// setTimeout was here
				// setTimeout(detect, 200, video);
				busy = false;
				resolve(profileCache);
			}).catch(err => {
				busy = false;
				console.log(err);
				console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
				console.error('badness in the face detction. could not detect. exiting app.');
				console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
				reject(err);
			});
		});

	}
	
}