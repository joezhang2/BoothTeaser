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

const cameraHoverDistance = 100;

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
	scene.fog = new THREE.Fog(fogColor, 10, 100);	

	// PerspectiveCamera( fov : Number, aspect : Number, near : Number, far : Number )
	camera = new THREE.PerspectiveCamera(50, aspect, 0.01, 100); // 40

	camera.matrixAutoUpdate = false;

	drawLetters(scene);
	
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
	render();
	requestAnimationFrame(animate);
};


const isInView = (bucketAngle, angleDeg) => {
	let min, max;

	if(angleDeg < 90) {
		min = (angleDeg + 360) - 90;
		max = angleDeg + 90;
		return (bucketAngle < max) || // if 1 then buckets less than 91 are in view
			(bucketAngle > min) // if 1 then buckets greater than 271 are in view
	} else if (angleDeg > 270) {
		min = angleDeg - 90;
		max = ((angleDeg + 360) + 90) % 360;
		return (bucketAngle < max) || // if 271 then buckets less than 1 are in view
			(bucketAngle > min) // if 271 then buckets greater than 181 are in view
	} else {
		min = angleDeg - 90;
		max = angleDeg + 90;
		return (bucketAngle <= max) && // if 180 then buckets less than 270 are in view
			(bucketAngle >= min) // if 180 then buckets greater than 90 are in view
	}
};


const hideCulledMeshes = () => {
	// Calculate the rotation angle of the camera
	const origin = { x:0, y:0 },
		cameraPos = { x: camera.position.y, y: camera.position.z };

	let angleDeg = (Math.atan2(cameraPos.x - origin.x, cameraPos.y - origin.y) * 180 / Math.PI);

	// atan returns -179 through -0.001 beyond 180 degress, so add 360 to give us the positive angles rather than a negative bucket angle
	angleDeg = angleDeg < 0 ? angleDeg + 360 : angleDeg;

	if (!meshBuckets || !Object.keys(meshBuckets) || Object.keys(meshBuckets).length === 0) { return; }

	for(let sliceAngle in meshBuckets) {
		if (!isInView(+sliceAngle, angleDeg)) {
			meshBuckets[sliceAngle].forEach((mesh)=>{
				mesh.visible = false;
				mesh.matrixWorldNeedsUpdate = false;
			}) 
		} else {
			meshBuckets[sliceAngle].forEach((mesh)=>{
				mesh.visible = true;
				mesh.matrixWorldNeedsUpdate = true;
			}) 
		}
	}
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
//	scene.matrixWorldNeedsUpdate = false;

	renderer.render(scene, camera);
};


const animate = () => {
	requestAnimationFrame(animate);
	render();
};


const generatePlantedForest = (xPosition, maxWidth, numWidthIncrement, maxRadius, minRadius, numRadiusIncrements) => {
	
	const calculateRandomAngleInArc = (minArcLength, maxArcLength, radius) => {
		const circumference = 2 * Math.PI * radius;
		const startingAngle = 2 * Math.PI * minArcLength / circumference;
		const endingAngle = 2 * Math.PI * maxArcLength / circumference;
		
		return .6 * Math.random() * (endingAngle - startingAngle) + startingAngle;
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
		const radius = minRadius + (maxRadius - minRadius) * Math.random() * .6;
		
		const pointOnArc = generateRandomPointOnArc(radius, currentMinArc, currentMaxArc, minRadius);
		
		x = (widthVariance ? widthOffset * .6 * Math.random() : 0)+ leftWidthBoundary;
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
	
	vertices = vertices.concat(generateDisk(xPosition, widthIncrement, maxRadius, minRadius, numRadiusIncrements, false));
	
	for(let currentXPosition = xPosition; currentXPosition < endWith; currentXPosition += widthIncrement) {
		vertices = vertices.concat(generateDisk(currentXPosition, widthIncrement, maxRadius, minRadius, numRadiusIncrements, true));
	}
	
	vertices = vertices.concat(generateDisk(endWith, widthIncrement, maxRadius, minRadius, numRadiusIncrements, false));
	return vertices;
};


const angleLetter = (pos) => {
	return Math.atan2(pos.z, pos.y) + 3 * Math.PI/2 ;
};


const createMaterial = (color) => {
	return new THREE.MeshBasicMaterial({
//		color: new THREE.Color(color),
		transparent: true
//		side: THREE.FrontSide //FrontSide
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


const loadTextFromJSON = () => {

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

class GroupedLetters {
	constructor(total, centerX, centerY) {
		this.total = total || 360;
		this.anglePer = 360 / total;
		this.center = { x: +centerX, y: +centerY };
		this.group = {};
		for (let i = 0; i < total; i++) {
			this.group[(this.anglePer * i)] = [];
		}
	}

	addObject(letter, x, y){
		// angle in degrees
		const angleToPoint = (Math.atan2(x - this.center.x, y - this.center.y) * 180 / Math.PI);
			
		// number of times the bucket angle size goes into the angle to the letter
		const bucketSlice = Math.floor(angleToPoint / this.anglePer);

		// put the letter in a bucket lesser than the next angle
		let bucketAngle = (bucketSlice * bucketAngleSize);
		bucketAngle = bucketAngle < 0 ? bucketAngle + 360 : bucketAngle;
	
		this.group[bucketAngle].push(letter);
	}
}


const assignToBucket = (mesh) => {
	const p1 = { x:0, y:0},
		p2 = { x: mesh.position.y, y: mesh.position.z };
	
	// angle in radians
//	var angleRads = Math.atan2(p2.y - p1.y, p2.x - p1.x);
	
	// angle in degrees to get to letter point
	const angleToLetterDeg = (Math.atan2(p2.x - p1.x, p2.y - p1.y) * 180 / Math.PI);
	
	// number of times the bucket angle size goes into the angle to the letter
	const bucketSlice = Math.floor(angleToLetterDeg / bucketAngleSize);
	// put the letter in a bucket lesser than the next angle
	// var bucketAngle = (bucketSlice * bucketAngleSize) + 180;

	let bucketAngle = (bucketSlice * bucketAngleSize);
	bucketAngle = bucketAngle < 0 ? bucketAngle + 360 : bucketAngle;

	if (!meshBuckets[bucketAngle]) {
		meshBuckets[bucketAngle] = [];
	}
	meshBuckets[bucketAngle].push(mesh);
};

const drawLetters = (scene) => {
	const loader = new THREE.FontLoader();
	
	//loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
		
		const maxWidth = 80,
			xPosition = (maxWidth / 2) * -1,
			numWidthIncrement = 40,
			maxRadius = 50,
			minRadius = 20,
			numRadiusIncrements = 10,
			fontSize = .3,
			points = generatePlantedForest(xPosition, maxWidth, numWidthIncrement, maxRadius, minRadius, numRadiusIncrements),
			midway = maxWidth/2 + xPosition,
			// leftMat = createMaterial(0xFF7722),
			// centerMat = createMaterial(0x111111),
			// rightMat = createMaterial(0x2277FF),
			possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

		const letterWidth = 1,
			letterHeight = 1;

		let letterMats = [];
		console.log('Total objects in universe:', points.length);

		for (let i = 0; possible.length > i; i++) {
			letterMats[i] = new THREE.MeshBasicMaterial({
//				color: 0xffffbb,
				transparent: true,
//				side: THREE.DoubleSide,
				map: new THREE.TextTexture({
					fontFamily: 'Helvetica, Arial, sans-serif',
					fontSize: 128,
					fontStyle: 'italic',
					text: possible[i]
				})
			});
		}

		let geometry = new THREE.PlaneBufferGeometry( letterWidth, letterHeight, 1, 1 );
		let geometries = [];
		let matrix = new THREE.Matrix4();

		points.forEach((pos) => {
			// let curMat;
			// let yRot = 0;
			// if (pos.x < midway - 20){
			// 	curMat = leftMat;
			// 	yRot = 1;
			// } else if (pos.x > midway + 20) {
			// 	curMat = rightMat;
			// 	yRot = -1;
			// } else {
			// 	curMat = centerMat;
			// }

			let letterPos = Math.floor(Math.random() * possible.length);

//			let letterImage = letterSpriteMats[letterPos].map.image;
//			let plane = new THREE.Mesh( geometry, letterSpriteMats[letterPos] );

			if (!geometries[letterPos]) geometries[letterPos] = [];

			let newGeom = new THREE.PlaneBufferGeometry( letterWidth, letterHeight, 1, 1 );

			// plane.scale.setX(letterImage.width / letterImage.height).multiplyScalar(1);

			newGeom.translate( pos.x, pos.y, pos.z );
			newGeom.rotateX(Math.atan2(pos.z, pos.y) + 3 * Math.PI/2); // 
//			newGeom.rotateY();
			// plane.rotation.x = angleLetter(pos);
			// plane.rotation.y = plane.rotation.y + yRot;

			geometries[letterPos].push(newGeom);

			// assignToBucket(plane);

			// do update after properties are set as part of startup process
			// plane.updateMatrix();
			
			// don't auto update every frame for this mesh
			// plane.matrixAutoUpdate = false;
			
			// try to save some cycles in calculating what to show and hide by doing this ourselves using in view mesh buckets
			// mesh.frustumCulled = false; // this worked horribly. Double the render object calls. 
			// combinedGeometry.merge(geometry, plane);
		});

		geometries.forEach((geoms, index) => {
			let mesh = new THREE.Mesh( THREE.BufferGeometryUtils.mergeBufferGeometries(geoms, true), letterMats[index] );
			mesh.updateMatrix();
			let letterImage = letterMats[index].map.image;
			// mesh.rotation.x = mesh.rotation.x;
			// mesh.rotation.y = mesh.rotation.y;
			mesh.scale.setX(letterImage.width / letterImage.height).multiplyScalar(1);
			
			scene.add(mesh);
			
		});

	//}); //end load function

//	loadTextFromCanvas2D(scene);
};

init();