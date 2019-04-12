// Browser driver support specifics
var canvas, context;

// Renderer specifics
var camera, scene, renderer, light;
var THREE = window.THREE || {};

var boxRotationDims = {
	x: 0,
	y: 0
};

var pageCenterDims = {
	x: 0,
	y: 0,
	width: 0,
	height: 0
};

var cameraOriginDims = {
	x: 0,
	y: 0,
	z: 1
};

var visibleBounds = {
	width: 0,
	height: 0
};

// current state of rotation animation
var angle = 0;

// shapes pre-organized into buckets based on angle ranges so we can rotate only the ones in view
var meshBuckets = {};
const totalBuckets = 360;
const bucketAngleSize = 360 / totalBuckets;

const cameraHoverDistance = 75;
const faker = window.faker;
const faceapi = window.faceapi;
const MODELS_PATH = '/public/models';
const lastNames = ['SMITH','JOHNSON','WILLIAMS','BROWN','JONES','MILLER','DAVIS','GARCIA','RODRIGUEZ','WILSON','MARTINEZ','ANDERSON','TAYLOR','THOMAS','HERNANDEZ','MOORE','MARTIN','JACKSON','THOMPSON','WHITE','LOPEZ','LEE','GONZALEZ','HARRIS','CLARK','LEWIS','ROBINSON','WALKER','PEREZ','HALL','YOUNG','ALLEN','SANCHEZ','WRIGHT','KING','SCOTT','GREEN','BAKER','ADAMS','NELSON','HILL','RAMIREZ','CAMPBELL','MITCHELL','ROBERTS','CARTER','PHILLIPS','EVANS','TURNER','TORRES','PARKER','COLLINS','EDWARDS','STEWART','FLORES','MORRIS','NGUYEN','MURPHY','RIVERA','COOK','ROGERS','MORGAN','PETERSON','COOPER','REED','BAILEY','BELL','GOMEZ','KELLY','HOWARD','WARD','COX','DIAZ','RICHARDSON','WOOD','WATSON','BROOKS','BENNETT','GRAY','JAMES','REYES','CRUZ','HUGHES','PRICE','MYERS','LONG','FOSTER','SANDERS','ROSS','MORALES','POWELL','SULLIVAN','RUSSELL','ORTIZ','JENKINS','GUTIERREZ','PERRY','BUTLER','BARNES','FISHER','HENDERSON','COLEMAN','SIMMONS','PATTERSON','JORDAN','REYNOLDS','HAMILTON','GRAHAM','KIM','GONZALES','ALEXANDER','RAMOS','WALLACE','GRIFFIN','WEST','COLE','HAYES','CHAVEZ','GIBSON','BRYANT','ELLIS','STEVENS','MURRAY','FORD','MARSHALL','OWENS','MCDONALD','HARRISON','RUIZ','KENNEDY','WELLS','ALVAREZ','WOODS','MENDOZA','CASTILLO','OLSON','WEBB','WASHINGTON','TUCKER','FREEMAN','BURNS','HENRY','VASQUEZ','SNYDER','SIMPSON','CRAWFORD','JIMENEZ','PORTER','MASON','SHAW','GORDON','WAGNER','HUNTER','ROMERO','HICKS','DIXON','HUNT','PALMER','ROBERTSON','BLACK','HOLMES','STONE','MEYER','BOYD','MILLS','WARREN','FOX','ROSE','RICE','MORENO','SCHMIDT','PATEL','FERGUSON','NICHOLS','HERRERA','MEDINA','RYAN','FERNANDEZ','WEAVER','DANIELS','STEPHENS','GARDNER','PAYNE','KELLEY','DUNN','PIERCE','ARNOLD','TRAN','SPENCER','PETERS','HAWKINS','GRANT','HANSEN','CASTRO','HOFFMAN','HART','ELLIOTT','CUNNINGHAM','KNIGHT'];
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const minMaxRand = (min, max) => {
	return Math.random() * (max - min) + min;
};

const rads = (degrees) => {
	return THREE.Math.degToRad(degrees); //  * Math.PI / 180;
};

const getVisibleBounds = (depth, camera) => {
	const visibleHeightAtZDepth = ( depth, camera ) => {
		// compensate for cameras not positioned at z=0
		const cameraOffset = camera.position.z;
		if ( depth < cameraOffset ) depth -= cameraOffset;
		else depth += cameraOffset;
	  
		// vertical fov in radians
		const vFOV = camera.fov * Math.PI / 180; 
	  
		// Math.abs to ensure the result is always positive
		return 2 * Math.tan( vFOV / 2 ) * Math.abs( depth );
	};
	
	const visibleWidthAtZDepth = ( depth, camera ) => {
		const height = visibleHeightAtZDepth( depth, camera );
		return height * camera.aspect;
	};

	return {
		width: visibleWidthAtZDepth(depth, camera),
		height: visibleHeightAtZDepth(depth, camera)
	};
};

const start3d = () => {
	return new Promise((resolve,reject) => {
	
		var resizeThrottle;

		const onWinResize = () => {
			if(resizeThrottle) { clearTimeout(resizeThrottle); resizeThrottle = null; }
			resizeThrottle = setTimeout(()=>{
				renderer.setSize( window.innerWidth, window.innerHeight );
				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();
			
				pageCenterDims.width = window.innerWidth / 2;
				pageCenterDims.height = window.innerHeight / 2;
			}, 100);
		}

		const onMouseMove = (e) => {
			boxRotationDims.x = (pageCenterDims.width - e.pageX) * 0.01;
			boxRotationDims.y = (pageCenterDims.height - e.pageY) * 0.01;
		}

		const aspect = window.innerWidth / window.innerHeight;
		scene = new THREE.Scene();

//		scene.matrixAutoUpdate = false;
		
		const fogColor = new THREE.Color(0x000000);
		scene.background = fogColor;
//		scene.fog = new THREE.Fog(fogColor, 20, 65);	

		// PerspectiveCamera( fov : Number, aspect : Number, near : Number, far : Number )
		camera = new THREE.PerspectiveCamera(50, aspect, 0.01, 2000); // 40
		visibleBounds = getVisibleBounds(50, camera);

//		camera.matrixAutoUpdate = false;

		// WebGL 2 looks to be supported in Chrome and FF, but not in Safari Tech Preview very well.
		canvas = document.createElement('canvas');
		canvas.style.background = '#000000';
		context = canvas.getContext('webgl2'); // webgl2 for that engine
		renderer = new THREE.WebGLRenderer({
			canvas: canvas,
			context: context,
			antialias: true
		});
		
		renderer.setSize(window.innerWidth, window.innerHeight);

		// positioning a light above the camera
		light = new THREE.PointLight(0xFFFFFF, 1);
		light.position.set(200, 250, 600);
		light.castShadow = true;
		light.shadow = new THREE.LightShadow( new THREE.PerspectiveCamera( 50, .5, 200, 2000 ) );
		light.shadow.bias = - 0.000222;
		light.shadow.mapSize.width = 1024;
		light.shadow.mapSize.height = 1024;
		scene.add(light);

		// scene.updateMatrix();

		document.body.appendChild(renderer.domElement);
		
//		document.body.addEventListener('mousemove', onMouseMove);
		window.addEventListener('resize', onWinResize);

		onWinResize();

		setTimeout(resolve, 0);
	});
};


let profileCache = [];
let updateCamera;

const createPerson = (active, profile, boundary, priority, timestamp, landmarks) => {
	return {
		uuid: THREE.Math.generateUUID(),
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

var textBlock;
var adContainer = new THREE.Group(); 
var videoCrop = cropBounds(0,0,640,480);
var videoDims = {
	width: 640,
	height: 480
};

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
	const xTargetAdjusted = xRelativeCameraPos * 0.5; // only allow it to be half the actual distance from origin

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

let idleCameraTimeout;
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
			}, 500);
		}
	} else {
		if (idleCameraTimeout) { clearTimeout(idleCameraTimeout); idleCameraTimeout = null; }

		cameraTarget = calculateCameraPositionFromViewerPerspective(vip);
	}

	if (cameraTweens.length) {
		cameraTweens.pop().kill();
		cameraTweens.pop().kill();
	}

	cameraTweens.push(TweenMax.to(camera.position, 1, {
		x: cameraTarget.x,
		ease: Sine.easeOut, 
		onComplete: ()=>{console.log('finished tween', camera.position.x)}
	}));
	cameraTweens.push(TweenMax.to(camera.rotation, 1, {
		y: cameraTarget.y,
		ease: Sine.easeOut, 
		onComplete: ()=>{console.log('finished tween', camera.position.x)}
	}));

	// cameraTweens.push(TweenMax.to(camera.position, 0.5, {y, ease: Power2.easeInOut}));

	if (videoCropTweens.length) {
		// videoCropTweens.pop().kill();
		// videoCropTweens.pop().kill();
	}
	// videoCropTweens.add(TweenMax.to(vidMap.rotation, 0.5, {x: 1, ease: Power2.easeInOut}));
	// videoCropTweens.add(TweenMax.to(vidMap.position, 0.5, {x: 1, ease: Power2.easeInOut}));
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

const drawAdContainer = (video) => {
	
	console.log('Generating ad container with live video textures');
	vidMap = new THREE.VideoTexture(video);
	videoDims.width = video.videoWidth;
	videoDims.height = video.videoHeight;
	videoCrop = cropBounds(0,0,videoDims.width,videoDims.height);
	cropVideo(vidMap, videoCrop, videoDims);

	const vidMesh = new THREE.Mesh( 
		new THREE.PlaneBufferGeometry( 2, 2, 1, 1 ), 
		new THREE.MeshPhysicalMaterial({
			map: vidMap,
			transparent: false,
			opacity: 1,
			metalness: 0.2,
			roughness: 0.9,
			reflectivity: 0.3,
			clearCoat: 0.5,
			clearCoatRoughness: 0.5,
			color: 0xFFFFFF
		})
	);
	vidMesh.position.z = 0.5; // depth
	vidMesh.position.x = -2.25; // left and right
	vidMesh.position.y = 0.5; // up and down

	const bgMesh = new THREE.Mesh( 
		new THREE.PlaneBufferGeometry( 8, 4, 1, 1 ), 
		new THREE.MeshPhysicalMaterial({ // this should probably be basic
			color: new THREE.Color(0x2277FF),
			transparent: true,
			opacity: 0.1,
			metalness: 1,
			roughness: 0.5,
			reflectivity: 1,
			clearCoat: 1,
			clearCoatRoughness: 0.5,
			side: THREE.FrontSide
		})
	);

	const shadowMesh = new THREE.Mesh( 
		new THREE.PlaneBufferGeometry( 5, 4, 1, 1 ), 
		new THREE.ShadowMaterial({ // this should probably be basic
			opacity: 0.9,
			color: new THREE.Color(0x000000),
		})
	);
	shadowMesh.position.z = 0.2; // depth
	shadowMesh.receiveShadow = true;

	adContainer.add(vidMesh);
	adContainer.add(shadowMesh);
	adContainer.add(bgMesh);

	scene.add( adContainer );
};

const render = () => {
	
	angle = (angle + 0.1) % 360;
	
//	let rotation = rads(angle + 270);
//	hideCulledMeshes();

	// Tilted axis of the camera to the scene
	// camera.position.x = cameraOriginDims.x + (boxRotationDims.x * -1); // @face now
	camera.rotation.x = rads(angle + 270);
	camera.rotation.y = (cameraOriginDims.x + (boxRotationDims.x * -1)) * 0.02;

	// Circular orbit around the center of the scene
	camera.position.y = cameraHoverDistance * Math.cos(rads(angle));
	camera.position.z = cameraHoverDistance * Math.sin(rads(angle));
	// camera.updateMatrix();

	// Disatance of text to the camera
	// textBlock.position.y = camera.position.y * 0.9;
	// textBlock.position.z = camera.position.z * 0.9; 
	// textBlock.rotation.y = camera.rotation.x * 0.9;
	// textBlock.rotation.z = camera.rotation.y * 0.9;

	adContainer.rotation.x = camera.rotation.x;
	adContainer.rotation.y = (cameraOriginDims.x + (boxRotationDims.x * -1)) * -0.001;

	adContainer.position.x = camera.position.x * 1.03;
	adContainer.position.y = camera.position.y * 0.9;
	adContainer.position.z = camera.position.z * 0.9;

	cropVideo(vidMap, videoCrop, videoDims);

	light.rotation.x = camera.rotation.x;
	light.rotation.y = (cameraOriginDims.x + (boxRotationDims.x * -1)) * 0.02;

	light.position.x = camera.position.x * 10;
	light.position.y = camera.position.y * 1.5;
	light.position.z = camera.position.z * 1.5;

	// Scenes 
	// scene.matrixWorldNeedsUpdate = false;

	renderer.render(scene, camera);
};


const stats = new Stats();
stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild( stats.dom );

const animate = () => {
	stats.begin();
	render();
	stats.end();

	requestAnimationFrame(animate);
};


const posRandRate = 0.9;

const generatePlantedForest = (xPosition, maxWidth, numWidthIncrement, maxRadius, minRadius, numRadiusIncrements) => {
	
	const calculateRandomAngleInArc = (minArcLength, maxArcLength, radius) => {
		const circumference = 2 * Math.PI * radius;
		const startingAngle = 2 * Math.PI * minArcLength / circumference;
		const endingAngle = 2 * Math.PI * maxArcLength / circumference;
		
		return posRandRate * Math.random() * (endingAngle - startingAngle) + startingAngle;
	}
	
	const generateRandomPointOnArc = (currentRadius, minArcLength, maxArcLength, arcRadius) => {
		const angle = calculateRandomAngleInArc(minArcLength, maxArcLength, arcRadius);
		
		return {
			y: currentRadius * Math.sin(angle),
			z: currentRadius * Math.cos(angle)
		};
	}
	
	const generatePoint = (leftWidthBoundary, widthOffset, currentMinArc, currentMaxArc, minRadius, maxRadius, widthVariance) => {
		let x, y, z;
		const radius = minRadius + (maxRadius - minRadius) * Math.random() * posRandRate;
		
		const pointOnArc = generateRandomPointOnArc(radius, currentMinArc, currentMaxArc, minRadius);
		
		x = (widthVariance ? widthOffset * posRandRate * Math.random() : 0)+ leftWidthBoundary;
		y = pointOnArc.y;
		z = pointOnArc.z;
		return {x: x, y: y, z: z};
	}
	
	const generateRing = (leftWidthBoundary, widthOffset, minRadius, maxRadius, widthVariance) => {
		const numMinArcSteps = Math.ceil((minRadius * 2 * Math.PI) / (widthOffset));
		const minArcIncrement = (minRadius * 2 * Math.PI) / numMinArcSteps;
		
		let vertices = [];
		
		for (let currentArcIncrement = 0; currentArcIncrement < numMinArcSteps; currentArcIncrement++) {
			let currentMinArc = currentArcIncrement * minArcIncrement;
			let currentMaxArc = currentMinArc + minArcIncrement;
			
			vertices.push(generatePoint(leftWidthBoundary, widthOffset, currentMinArc, currentMaxArc, minRadius, maxRadius, widthVariance));
		}
		return vertices;
	}
	
	const generateDisk = (leftWidthBoundary, widthOffset, maxRadius, minRadius, numRadiusIncrements, widthVariance) => {
		const radiusIncrement = (maxRadius - minRadius)/ numRadiusIncrements;
		let vertices = [];
		
		//Generate points on inner diameter
		vertices = vertices.concat(generateRing(leftWidthBoundary, widthOffset, minRadius, minRadius, widthVariance));
		
		// Generate points inside ring
		for(let currentRadius = minRadius; currentRadius < maxRadius; currentRadius += radiusIncrement) {
			vertices = vertices.concat(generateRing(leftWidthBoundary, widthOffset, currentRadius, currentRadius + radiusIncrement, widthVariance));
		}
		//Generate points on outer diameter
		vertices = vertices.concat(generateRing(leftWidthBoundary, widthOffset, maxRadius, maxRadius, widthVariance));
		
		return vertices;
	}

	return new Promise((resolve,reject) => {
		const widthIncrement = maxWidth / numWidthIncrement;
		const endWith = xPosition + maxWidth;
		
		let vertices = [];
		let startTime = Date.now();
		vertices = vertices.concat(generateDisk(xPosition, widthIncrement, maxRadius, minRadius, numRadiusIncrements, false));
		console.log('after vertices.concat(generateDisk', Date.now() - startTime);

		for(let currentXPosition = xPosition; currentXPosition < endWith; currentXPosition += widthIncrement) {
			vertices = vertices.concat(generateDisk(currentXPosition, widthIncrement, maxRadius, minRadius, numRadiusIncrements, true));
		}
		console.log('after for(let currentXPosition', Date.now() - startTime);
		
		vertices = vertices.concat(generateDisk(endWith, widthIncrement, maxRadius, minRadius, numRadiusIncrements, false));
		console.log('after last vertices.concat(generateDisk', Date.now() - startTime);

		setTimeout(resolve, 0, vertices);
	});
};


const createMaterial = (color) => {
	return new THREE.MeshBasicMaterial({
		color: new THREE.Color(color),
		transparent: true,
		side: THREE.FrontSide
	});
};


const drawSomething = () => {

	const demoConfig = {
		maxWidth: 90,
		xPosition: (90 / 2) * -1, // maxwidth / 2 * -1
		numWidthIncrement: 45,
		maxRadius: 45,
		minRadius: 20,
		numRadiusIncrements: 20
	};

	const config = {
		maxWidth: 90,
		xPosition: (90 / 2) * -1, // maxwidth / 2 * -1
		numWidthIncrement: 15,
		maxRadius: 45,
		minRadius: 20,
		numRadiusIncrements: 2
	};

	return new Promise((resolve,reject) => {
		generatePlantedForest(config.xPosition,
			config.maxWidth, 
			config.numWidthIncrement, 
			config.maxRadius, 
			config.minRadius, 
			config.numRadiusIncrements).then((points) => {
			// loadFonts
			resolve({config,points});
		});
	});
};

const loadFonts = () => {
	const loader = new THREE.FontLoader();
	return new Promise((resolve,reject) => {
		loader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', (font) => {
			//drawLetters
			resolve(font);
		});
	});
};

const generateMaterials = (font) => {
	return new Promise((resolve,reject) => {
		const fontSize = .3,
			possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

		let letterShapeGeoms = [];

		for (let i = 0; possible.length > i; i++) {
			let geometry = new THREE.ShapeBufferGeometry(font.generateShapes(possible[i], fontSize));
			geometry.computeBoundingBox();
			geometry.translate(-0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x), 0, 0);
			letterShapeGeoms[i] = geometry;
		}
		// 
		setTimeout(resolve, 0, letterShapeGeoms);
	});
};

const generateGeometries = (letterShapeGeoms, points, midway) => {
	return new Promise((resolve,reject) => {
		let geometries = {};

		points.forEach((pos) => {
			let rotY;
			if (pos.x < midway - 20){
				rotY = 1;
			} else if (pos.x > midway + 20) {
				rotY = -1;
			} else {
				rotY = 0;
			}

			let letterPos = Math.floor(Math.random() * letterShapeGeoms.length);

			if (!geometries[rotY]) { geometries[rotY] = {}; }
			if (!geometries[rotY][letterPos]) { geometries[rotY][letterPos] = []; }

			let newGeom = letterShapeGeoms[letterPos].clone();

			newGeom.rotateX(Math.atan2(pos.z, pos.y) + 3 * Math.PI/2);
	//		newGeom.rotateY(rotY);
			// plane.rotation.y = plane.rotation.y + rotY;
			newGeom.translate( pos.x, pos.y, pos.z );

			geometries[rotY][letterPos].push(newGeom);
		});

		// addLettersToScene
		setTimeout(resolve, 0, geometries);
	});
};

const addLettersToScene = (geometries) => {
	const colors = {
		'-1': createMaterial(0xFF7722),
		'0': createMaterial(0x222222),
		'1': createMaterial(0x2277FF)
	};

	return new Promise((resolve,reject) => {
		for(let rotY in geometries) {
			let letterGroups = geometries[rotY];
			for(let index in letterGroups) {
				let geoms = letterGroups[index],
					mesh = new THREE.Mesh( THREE.BufferGeometryUtils.mergeBufferGeometries(geoms, true), colors[rotY]);
				// mesh.updateMatrix();
				// mesh.matrixAutoUpdate = false;
				// mesh.rotation.x = mesh.rotation.x;
				// mesh.rotation.y = mesh.rotation.y;
				scene.add(mesh);
			}
		}
		
		setTimeout(resolve, 0, {});
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

		navigator.mediaDevices.getUserMedia({video:true, audio:true}).then(stream=>{
			resolve(stream);
		}).catch(err=>{
			reject(err);
		});
	});
};


async function run() {
	let startTime = Date.now();

	// load the models
	await faceapi.loadTinyFaceDetectorModel(MODELS_PATH);
	console.log('after loadTinyFaceDetectorModel', Date.now() - startTime);
	await faceapi.loadFaceRecognitionModel(MODELS_PATH);
	console.log('after loadFaceRecognitionModel', Date.now() - startTime);
	await faceapi.loadFaceLandmarkTinyModel(MODELS_PATH);
	console.log('after loadFaceLandmarkTinyModel', Date.now() - startTime);

	const video = document.createElement('video');

//	document.querySelector('.main-container').appendChild(video);
//	video.setAttribute('style', 'position:absolute;transform:scale(0.3);top:0;right:0;');

	// first you get the permissions
	askForAudioVideoPermissions()
	// then you have all the device labels to pick from
	.then(chooseBestDeviceForAV)
	// then you actually get the media from the device you want
	.then(device=>startPlayingVideo(device, video))
	// then you can run start setting up a 3D environment to use it
	.then(() => {

		console.log('after AV perms granted and streams started', Date.now() - startTime);

		video.addEventListener('loadedmetadata', evt => {
			console.log('after loadedmetadata', Date.now() - startTime);

			// This is fragmented because each of the steps really need to be broken up to be async
			// and this gives me a better shot of seeing where the worst offenders are.
			console.log('kickoff render loop');
			start3d().then(() => { 
				console.log('after start3d', Date.now() - startTime);
				return drawSomething();
			}).then(setup => {
				const config = setup.config,
					points = setup.points;
				console.log('after drawSomething', Date.now() - startTime);
				return loadFonts().then(font => {
					console.log('after loadFonts', Date.now() - startTime);
					const midway = config.maxWidth/2 + config.xPosition;
					console.log('Total objects in universe:', points.length);
					return generateMaterials(font).then(letterShapeGeoms => {
						console.log('after generateMaterials', Date.now() - startTime);
						return generateGeometries(letterShapeGeoms, points, midway);
					});
				});
			}).then().then(geometries => {
				console.log('after generateGeometries', Date.now() - startTime);
				return addLettersToScene(geometries);
			}).then(()=>{
				console.log('after addLettersToScene', Date.now() - startTime);
				return new Promise((resolve,reject) => {

					// Ad container is required by render function
					drawAdContainer(video);

					render();
					setTimeout(resolve, 0, {});
				});
			}).then(()=>{
				console.log('after first render', Date.now() - startTime);

				console.log('TODO start detection loop here.');
//				video.addEventListener('timeupdate', evt => {
					// console.dir(video); // evt.target
					// console.dir(evt); // evt.target
//				});
				detect(video);
				requestAnimationFrame(animate);
			});

		});

	}).catch(err=>{
		console.error('Error while attempting to start video stream', err);
	});

}


let labeledDescriptors = [];
let appIdleTimeout;
const detect = video => {
	faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
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
				activePersons.concat(profileCache.filter(person => {
					if (descriptor.label === person.uuid && person.active) {
						return true;
					}
				}));
			})
			
			activePersons.reduce((x, y) => x.includes(y) ? x : [...x, y], []).forEach(person => {
				console.log('This person was deemed unfit for focus', person.uuid);
				deactivateProfileCacheEntry(person.uuid);
			});
		}
		// setTimeout was here
		setTimeout(detect, 200, video);
	}).catch(err => {
		console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
		console.error('badness in the face detction. could not detect. exiting app.');
		console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
	});
}


// yeild the thread so chrome doesn't nerf the raf
setTimeout(run, 0);