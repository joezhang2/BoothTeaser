
// Namespace for face detection component
function FaceTracking(profileFocusUpdateCallback, sourceWidth, sourceHeight, fakeDataSource) {

	let busy = false;
	let ready = false;

	let updateCamera = false;
	const renderLoop = ()=>{
		if (updateCamera) {
			updateCameraWithNewFacePosition();
		}
		requestAnimationFrame(renderLoop);
	};

	this.startFaceTracking = async ()=>{
		return new Promise(async (resolve)=>{
			const MODELS_PATH = '/js/models';

			// const startTime = Date.now();
			await faceapi.loadTinyFaceDetectorModel(MODELS_PATH);
			// console.log('after loadTinyFaceDetectorModel', Date.now() - startTime);
			await faceapi.loadFaceRecognitionModel(MODELS_PATH);
			// console.log('after loadFaceRecognitionModel', Date.now() - startTime);
			await faceapi.loadFaceLandmarkTinyModel(MODELS_PATH);
			// console.log('after loadFaceLandmarkTinyModel', Date.now() - startTime);	
			ready = true;

			renderLoop();
			resolve();
		});
	};

	let profileCache = [];
	
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
	
	const bogusGetter = () => 'o_O SaMpLe TeXt @_;';

	// matches the faker.js lib's helper for createCard
	let fakeGenerator;
	fakeGenerator = {
		name: {
			findName: bogusGetter
		},
		internet: {
			userName: bogusGetter,
			email: bogusGetter,
			domainName: bogusGetter
		},
		address: {
			streetName: bogusGetter,
			streetAddress: bogusGetter,
			secondaryAddress: bogusGetter,
			city: bogusGetter,
			state: bogusGetter,
			country: bogusGetter,
			zipCode: bogusGetter,
			latitude: bogusGetter,
			longitude: bogusGetter
		},
		phone: {
			phoneNumber: bogusGetter
		},
		company: {
			companyName: bogusGetter,
			catchPhrase: bogusGetter,
			bs: bogusGetter
		},
		lorem: {
			words: bogusGetter,
			sentence: bogusGetter,
			sentences: bogusGetter,
			paragraph: bogusGetter

		}
	};
	fakeGenerator.helpers = {};
	fakeGenerator.helpers.createTransaction = bogusGetter;
	fakeGenerator.helpers.createCard = ()=>{ return {
		name: fakeGenerator.name.findName(),
		username: fakeGenerator.internet.userName(),
		email: fakeGenerator.internet.email(),
		address: {
			streetA: fakeGenerator.address.streetName(),
			streetB: fakeGenerator.address.streetAddress(),
			streetC: fakeGenerator.address.streetAddress(true),
			streetD: fakeGenerator.address.secondaryAddress(),
			city: fakeGenerator.address.city(),
			state: fakeGenerator.address.state(),
			country: fakeGenerator.address.country(),
			zipcode: fakeGenerator.address.zipCode(),
			geo: {
				lat: fakeGenerator.address.latitude(),
				lng: fakeGenerator.address.longitude()
			}
		},
		phone: fakeGenerator.phone.phoneNumber(),
		website: fakeGenerator.internet.domainName(),
		company: {
			name: fakeGenerator.company.companyName(),
			catchPhrase: fakeGenerator.company.catchPhrase(),
			bs: fakeGenerator.company.bs()
		},
		posts: [
			{
				words: fakeGenerator.lorem.words(),
				sentence: fakeGenerator.lorem.sentence(),
				sentences: fakeGenerator.lorem.sentences(),
				paragraph: fakeGenerator.lorem.paragraph()
			},
			{
				words: fakeGenerator.lorem.words(),
				sentence: fakeGenerator.lorem.sentence(),
				sentences: fakeGenerator.lorem.sentences(),
				paragraph: fakeGenerator.lorem.paragraph()
			},
			{
				words: fakeGenerator.lorem.words(),
				sentence: fakeGenerator.lorem.sentence(),
				sentences: fakeGenerator.lorem.sentences(),
				paragraph: fakeGenerator.lorem.paragraph()
			}
		],
		accountHistory: [fakeGenerator.helpers.createTransaction(), fakeGenerator.helpers.createTransaction(), fakeGenerator.helpers.createTransaction()]
	}};

	const fakeDS = fakeDataSource || fakeGenerator;

	const generateFakeProfile = ()=>{
		try {
			return fakeDS.helpers.createCard();
		} catch (ex) {
			return fakeGenerator.helpers.createCard();
		}
	};

	const createProfileCacheEntry = (box, landmarks) => {

		profileCache.push(createPerson(true, generateFakeProfile(), box, box.area, Date.now(), landmarks));
	
		// use a timeout as a delegate to handle updates on next thread run, and if one is already scheduled, do nothing.
		updateCamera = true;
	
		return profileCache[profileCache.length-1].uuid;
	};
	
	
	const updateProfileCacheEntry = (uuid, box, landmarks) => {
		const index = profileCache.findIndex(person => person.uuid === uuid);
		if (index > -1) {
			const person = profileCache[index];
			person.active = true;
			person.boundary = box;
			person.timestamp = Date.now();
			person.priority = box.area;
			person.landmarks = landmarks;
			console.log('now active', uuid);
			if (person.idleTimeout) { clearTimeout(person.idleTimeout); person.idleTimeout = null; }
		} else {
			console.error(uuid, 'was not found in list on updated');
		}
	
		// use a timeout as a delegate to handle updates on next thread run, and if one is already scheduled, do nothing.
		updateCamera = true;
	
		return uuid;
	};
	
	const deactivateProfileCacheEntry = uuid => {
		const index = profileCache.findIndex(person => person.uuid === uuid);
		if (index > -1) {
			let person = profileCache[index];
			if (!person.idleTimeout) {
				// if a person disappears from view for 1 second, mark them as inactive
				person.idleTimeout = setTimeout(() => {
					person.active = false;
					console.log('inactive for 2 seconds:', uuid);
				}, 2000);
			}
			console.log('not in view:', uuid);
		} else {
			console.error(uuid, 'was not found in list on deactivate');
		}
	
		// use a timeout as a delegate to handle updates on next thread run, and if one is already scheduled, do nothing.
		updateCamera = true;
	};
	
	let idleCameraTimeout;

	const updateCameraWithNewFacePosition = () => {
		console.log('UPDATE CAMERA WITH NEW FACE POSITION');
		// clear update delegates if any are pending
		updateCamera = false;
	
		let faces = profileCache;
		
		let vip;
	
		// console.log(faces);
		for (let i = 0; i < faces.length; i++) {
			let person = faces[i];
			// console.log('am i active', person.active, person.uuid, person.idleTimeout);
			if (person.active && !person.idleTimeout && (!vip || person.priority > vip.priority)) {
				vip = person;
				// console.log('best area is now', person.priority);
			}
		}
		
		if (!vip) {
			if (!idleCameraTimeout) {
				idleCameraTimeout = setTimeout(() => {
					idleCameraTimeout = null;
					console.log('!!!!!!!!!!!!!!!!!!!!!');
					console.log('APP INACTIVE FOR 10 SECONDS, RESET CAMERA TO 0,0,0');
					console.log('!!!!!!!!!!!!!!!!!!!!!');
					profileFocusUpdateCallback();
				}, 8000); // 8 + 2 user idle seconds = 10 app seconds idle
			}
		} else {
			if (idleCameraTimeout) { clearTimeout(idleCameraTimeout); idleCameraTimeout = null; }
			console.log('this person is in view', vip);
			profileFocusUpdateCallback(vip);
		}
	};
	
	let labeledDescriptors = [];
	this.detect = videoCanvas => {
		return new Promise((resolve,reject)=>{
			if (busy || !ready) {
				// console.log('Requested detection, but models have not loaded yet.');
				resolve();
			}
			busy = true;
			faceapi.detectAllFaces(videoCanvas, new faceapi.TinyFaceDetectorOptions())
			.withFaceLandmarks(true)
			.withFaceDescriptors()
			.then(detections => {
				// console.log('================================');
				// console.log('detection length', detections.length);
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
								// console.log('creating new user entry', uuid);
								labeledDescriptors.push(new faceapi.LabeledFaceDescriptors(uuid, [detections[i].descriptor]));
							} else {
								uuid = updateProfileCacheEntry(m.label, detections[i].detection.box, detections[i].landmarks);
								// console.log('Updated user entry', uuid);
							}
							return uuid;
						});
		
						// sort through the knowns
						const allUuids = labeledDescriptors.map(descriptor => descriptor.label);
						// cross check them with active faces and if none exist...
						const inactiveUuids = allUuids.filter(uuid => activeUuids.indexOf(uuid) < 0);
						// loop through the leftovers and mark them inactive
						inactiveUuids.forEach(deactivateProfileCacheEntry);
		
						// console.log('---------------------------------------');
						// console.log('total labels', labeledDescriptors.length);
						// console.log('total detections', detections.length);
						// console.log('total matches', matches.length);
						// console.log('total activeUuids', activeUuids.length);
						// console.log('total allUuids', activeUuids.length);
						// console.log('total inactiveUuids', activeUuids.length);
						// console.log('---------------------------------------');
					}
				} else {
					// when there are no faces detected, filter the profile cache to active users and deactivate just those users
					let activePersons = [];
					labeledDescriptors.forEach(descriptor => {
						activePersons = activePersons.concat(profileCache.filter(person => {
							if (descriptor.label === person.uuid && person.active && !person.idleTimeout) {
								return true;
							}
						}));
					})
					// console.log('***** These are the active persons that should be marked as inactive', activePersons);
					activePersons.reduce((x, y) => x.includes(y) ? x : [...x, y], []).forEach(person => {
						// console.log('This person was deemed unfit for focus', person.uuid);
						deactivateProfileCacheEntry(person.uuid);
					});
				}
				// setTimeout was here
				// setTimeout(detect, 200, video);
				busy = false;
				resolve(profileCache);
			}).catch(err => {
				busy = false;
				// console.log(err);
				// console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
				// console.error('badness in the face detction. could not detect. exiting app.');
				// console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
				reject(err);
			});
		});

	}
	
}