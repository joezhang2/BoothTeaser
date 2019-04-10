// Browser driver support specifics
var canvas, context;

// Renderer specifics
var camera, scene, renderer;
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

// current state of rotation animation
var angle = 0;

// shapes pre-organized into buckets based on angle ranges so we can rotate only the ones in view
var meshBuckets = {};
const totalBuckets = 360;
const bucketAngleSize = 360 / totalBuckets;

const cameraHoverDistance = 70;

const minMaxRand = (min, max) => {
	return Math.random() * (max - min) + min;
};

const rads = (degrees) => {
	return THREE.Math.degToRad(degrees); //  * Math.PI / 180;
};

const init = () => {
	
	var resizeThrottle;

	const onWinResize = () => {
		if(resizeThrottle) clearTimeout(resizeThrottle);
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

	scene.matrixAutoUpdate = false;
	
	const fogColor = new THREE.Color(0x000000);
	scene.background = fogColor;
	scene.fog = new THREE.Fog(fogColor, 10, 70);	

	// PerspectiveCamera( fov : Number, aspect : Number, near : Number, far : Number )
	camera = new THREE.PerspectiveCamera(50, aspect, 0.01, 70); // 40

	camera.matrixAutoUpdate = false;

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

	scene.updateMatrix();

	document.body.appendChild(renderer.domElement);
	
	document.body.addEventListener('mousemove', onMouseMove);
	window.addEventListener('resize', onWinResize);

	onWinResize();

	// yeild the thread so chrome doesn't nerf the raf
	setTimeout(drawSomething);
};

var textBlock;

const render = () => {
	
	angle = (angle + 0.1) % 360;
	
//	let rotation = rads(angle + 270);
//	hideCulledMeshes();

	// Tilted axis of the camera to the scene
	camera.position.x = cameraOriginDims.x + (boxRotationDims.x * -1);
	camera.rotation.x = rads(angle + 270);
	camera.rotation.y = (cameraOriginDims.x + (boxRotationDims.x * -1)) * 0.03;

	// Circular orbit around the center of the scene
	camera.position.y = cameraHoverDistance * Math.cos(rads(angle));
	camera.position.z = cameraHoverDistance * Math.sin(rads(angle));
	camera.updateMatrix();

	// Disatance of text to the camera
	// textBlock.position.y = camera.position.y * 0.9;
	// textBlock.position.z = camera.position.z * 0.9;
	// textBlock.rotation.y = camera.rotation.x * 0.9;
	// textBlock.rotation.z = camera.rotation.y * 0.9;

	// Scenes 
	scene.matrixWorldNeedsUpdate = false;

	renderer.render(scene, camera);
};


const animate = () => {
	requestAnimationFrame(animate);
	render();
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
	return vertices;
};


const createMaterial = (color) => {
	return new THREE.MeshBasicMaterial({
		color: new THREE.Color(color),
		transparent: true,
		side: THREE.FrontSide
// None of the options below significantly improved rendering performance		
//		reflectivity: 0,
//		depthWrite: false,
//		depthTest: false, // disabling this made things noticably slower
//		refractionRatio: 1, 
//		aoMapIntensity: 0, // oclussion effect
//		precision: 'lowp' // highp", "mediump" or "lowp"
//		opacity:  //Math.round(minMaxRand(0.3, 1) * 10).toFixed(2) 
	});
};


const loadTextFromCanvas2D = (scene) => {
	let texture = new THREE.TextTexture({
		fontFamily: '"Times New Roman", Times, serif',
		fontSize: 128,
		fontStyle: 'italic',
		text: [
		  'This is some demo text',
		  'It is clearly demo text'
		].join('\n'),
	});
	let material = new THREE.SpriteMaterial({
		color: 0xffffbb,
		map: texture
	});
	let sprite = new THREE.Sprite(material);
	sprite.scale.setX(texture.image.width / texture.image.height).multiplyScalar(1);
	textBlock = sprite;
	scene.add(sprite);
};

const drawSomething = () => {

	const config = { 
		maxWidth: 80,
		xPosition: (80 / 2) * -1, // maxwidth / 2 * -1
		numWidthIncrement: 45,
		maxRadius: 50,
		minRadius: 20,
		numRadiusIncrements: 20
	};

	const points = generatePlantedForest(config.xPosition,
		config.maxWidth, 
		config.numWidthIncrement, 
		config.maxRadius, 
		config.minRadius, 
		config.numRadiusIncrements);

	setTimeout(loadFonts, 0, points, config);
//	loadTextFromCanvas2D(scene);
};

const loadFonts = (points, config) => {
	const loader = new THREE.FontLoader();
	loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
		setTimeout(drawLetters, 0, font, points, config);
	}); //end load function
};

const generateMaterials = (font, cb) => {

	const fontSize = .3,
		possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

	let letterShapeGeoms = [];

	for (let i = 0; possible.length > i; i++) {
		let geometry = new THREE.ShapeBufferGeometry(font.generateShapes(possible[i], fontSize));
		geometry.computeBoundingBox();
		geometry.translate(-0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x), 0, 0);
		letterShapeGeoms[i] = geometry;
	}

	cb(letterShapeGeoms);
};

const generateGeometries = (letterShapeGeoms, points, midway) => {
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

	return geometries;
}

const addLettersToScene = (geometries) => {
	const colors = {
		'-1': createMaterial(0xFF7722),
		'0': createMaterial(0x333333),
		'1': createMaterial(0x2277FF)
	};

	for(let rotY in geometries) {
		let letterGroups = geometries[rotY];
		for(let index in letterGroups) {
			let geoms = letterGroups[index],
				mesh = new THREE.Mesh( THREE.BufferGeometryUtils.mergeBufferGeometries(geoms, true), colors[rotY]);
			mesh.updateMatrix();
			mesh.matrixAutoUpdate = false;
			// mesh.rotation.x = mesh.rotation.x;
			// mesh.rotation.y = mesh.rotation.y;
			scene.add(mesh);
		}
	}
	setTimeout(animate, 0);
};

const drawLetters = (font, points, config) => {

	let startTime = Date.now();

	const midway = config.maxWidth/2 + config.xPosition;

	console.log('Total objects in universe:', points.length);

	setTimeout(generateMaterials, 0, font, (letterShapeGeoms) => {
		console.log('after generateMaterials', Date.now() - startTime);
		setTimeout(addLettersToScene, 0, generateGeometries(letterShapeGeoms, points, midway));
	});
	
};

// yeild the thread so chrome doesn't nerf the raf
setTimeout(init, 0);