
// Namespace
function UserInterface(THREE, canvas) {

	// Browser driver support specifics
	let context;

	// Renderer specifics
	let camera, scene, renderer, light;

	let animating = false;

	let boxRotationDims = {
		x: 0,
		y: 0
	};

	let pageCenterDims = {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};

	let cameraOriginDims = {
		x: 0,
		y: 0,
		z: 1
	};

	let visibleBounds = {
		width: 0,
		height: 0
	};

	// current state of rotation animation
	let angle = 0;

	const cameraHoverDistance = 75;

	// handy function for converting degrees to radians
	const rads = (degrees) => {
		return THREE.Math.degToRad(degrees); //  * Math.PI / 180;
	};

	// Handy synchronous load splitting function
	async function asyncForEach(array, callback) {
		let index;
		for (index = 0; index < array.length; index++) {
			await callback(array[index], index, array);
		}
	}

	const doNext = (thing, value, index, array) => new Promise(resolve => {
		resolve(thing(value, index, array));
	});

	// * t i n y  m u s c l e s *
	const spaceWorkOut = async (array, doer) => {
		await asyncForEach(array, async (value, index, arr) => {
			await doNext(doer, value, index, arr);
			// console.log(value);
		});
		// console.log('Done');
	}

	const getVisibleBounds = (depth, camera) => {
		const visibleHeightAtZDepth = (depth, camera) => {
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

	this.start3d = (appWidth, appHeight) => {
		let startTime = Date.now();

		return new Promise(resolve => {

			const aspect = appWidth / appHeight;
			scene = new THREE.Scene();

	//		scene.matrixAutoUpdate = false;
			
			const fogColor = new THREE.Color(0x000000);
			scene.background = fogColor;
			scene.fog = new THREE.Fog(fogColor, 20, 65);	

			// PerspectiveCamera( fov : Number, aspect : Number, near : Number, far : Number )
			camera = new THREE.PerspectiveCamera(50, aspect, 0.01, 70);
			visibleBounds = getVisibleBounds(50, camera);

	//		camera.matrixAutoUpdate = false;

			// WebGL 2 looks to be supported in Chrome and FF, but not in Safari Tech Preview very well.
			context = canvas.getContext('webgl2'); // webgl2 for that engine

			renderer = new THREE.WebGLRenderer({
				canvas: canvas,
				context: context,
				antialias: true
			});
			
			renderer.setSize(appWidth, appHeight);

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

			renderer.setSize( appWidth, appHeight );
			camera.aspect = appWidth / appHeight;
			camera.updateProjectionMatrix();
		
			pageCenterDims.width = window.innerWidth / 2;
			pageCenterDims.height = appHeight / 2;

			resolve();
		}).then(() => {
			console.log('after start3d', Date.now() - startTime);
			return createPoints();
		}).then(setup => {
			const config = setup.config,
				points = setup.points;
			console.log('after createPoints', Date.now() - startTime);
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
			return new Promise(resolve => {

				// Ad container is required by render function
				// drawAdContainer(video);

				render();
				resolve();
			});
		}).then(()=>{
			console.log('after first render', Date.now() - startTime);
			animating = true;
			requestAnimationFrame(animate);
		});
	};


	var textBlock;
	var adContainer = new THREE.Group(); 

	// this is where all the profile layout stuff needs to happen
	const drawAdContainer = () => {
		
		const bgMesh = new THREE.Mesh( 
			new THREE.PlaneBufferGeometry( 8, 4, 1, 1 ), 
			new THREE.MeshPhysicalMaterial({ // this should probably be basic
				color: new THREE.Color(0x2277FF),
				transparent: true,
				opacity: 0.2,
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

		adContainer.add(shadowMesh);
		adContainer.add(bgMesh);

		scene.add( adContainer );
	};

	let cameraTweens = [];
	let cameraTarget = {x:0,y:0,z:0};

	const rateOfTravel = {
		x: 500 / 1000,
		y: Math.PI / 1000,
		z: Math.PI / 1000
	}

	this.updatePerspective = (x,y,z) => {
		if (!animating) { return; }
		cameraTarget.x = x;
		cameraTarget.y = y;
		cameraTarget.z = z;

		// Calculate duration using expected distance traveled over time. 
		// Math.abs(Point A - Point B) = actual distance
		// expected distance / expected time in s = expected rate of travel per s
		// actual distance * expected rate = actual time
		const xDuration = Math.abs(x - camera.position.x) * rateOfTravel.x
		const yDuration = Math.abs(y - camera.rotation.y) * rateOfTravel.y

		if (cameraTweens.length) {
			cameraTweens.pop().kill();
			cameraTweens.pop().kill();
		}
	
		cameraTweens.push(TweenMax.to(camera.position, xDuration, {
			x: cameraTarget.x,
			ease: Power1.easeOut, 
			onComplete: () => {console.log('finished tween', camera.position.x)}
		}));

		cameraTweens.push(TweenMax.to(camera.rotation, yDuration, {
			y: cameraTarget.y,
			ease: Power1.easeOut, 
			onComplete: () => {console.log('finished tween', camera.rotation.y)}
		}));
	};

	// This is stuff that could happen at any interval driven by any animation loop (tweenmax for instance, or just a timeout, or raf)
	const render = () => {
		
		angle = (angle + 0.1) % 360;
		
		// Tilted axis of the camera to the scene
		// camera.position.x = cameraOriginDims.x + (boxRotationDims.x * -1); // @face now
		camera.rotation.x = rads(angle + 270);
		camera.rotation.y = (cameraOriginDims.x + (boxRotationDims.x * -1)) * 0.02;

		// Circular orbit around the center of the scene
		camera.position.y = cameraHoverDistance * Math.cos(rads(angle));
		camera.position.z = cameraHoverDistance * Math.sin(rads(angle));
		// camera.updateMatrix();

		/* temporarily disabled while attempting to get the app running in workers
		adContainer.rotation.x = camera.rotation.x;
		adContainer.rotation.y = (cameraOriginDims.x + (boxRotationDims.x * -1)) * -0.001;

		adContainer.position.x = camera.position.x * 1.03;
		adContainer.position.y = camera.position.y * 0.9;
		adContainer.position.z = camera.position.z * 0.9;
		*/

		light.rotation.x = camera.rotation.x;
		light.rotation.y = (cameraOriginDims.x + (boxRotationDims.x * -1)) * 0.02;

		light.position.x = camera.position.x * 5;
		light.position.y = camera.position.y * 1.5;
		light.position.z = camera.position.z * 1.5;

		// Scenes 
		// scene.matrixWorldNeedsUpdate = false;

		renderer.render(scene, camera);
	};

	// this is the use of raf (if it even works in a worker)
	const animate = () => {
		if (!animating) { return; }
		render();
		requestAnimationFrame(()=>{
			animate();
		});
	};

	const posRandRate = 0.9;

	const generatePlantedForest = (xPosition, maxWidth, numWidthIncrement, maxRadius, minRadius, numRadiusIncrements) => {
		
		let points = [];
		const twoPi = 2 * Math.PI;
		let circumference,
			startingAngle,
			endingAngle;

		const calculateRandomAngleInArc = (minArcLength, maxArcLength, radius) => {
			circumference = twoPi * radius;
			startingAngle = twoPi * minArcLength / circumference;
			endingAngle = twoPi * maxArcLength / circumference;
			return posRandRate * Math.random() * (endingAngle - startingAngle) + startingAngle;
		}
		
		let angle;

		const generateRandomPointOnArc = (currentRadius, minArcLength, maxArcLength, arcRadius) => {
			angle = calculateRandomAngleInArc(minArcLength, maxArcLength, arcRadius);
			return {
				y: currentRadius * Math.sin(angle),
				z: currentRadius * Math.cos(angle)
			};
		}

		let radius,
			pointOnArc;

		const generatePoint = (leftWidthBoundary, widthOffset, currentMinArc, currentMaxArc, minRadius, maxRadius, widthVariance) => {
			radius = minRadius + (maxRadius - minRadius) * Math.random() * posRandRate;
			
			pointOnArc = generateRandomPointOnArc(radius, currentMinArc, currentMaxArc, minRadius);

			return new Promise((resolve, reject) => {
				points.push({ 
					x: ((widthVariance ? widthOffset * posRandRate * Math.random() : 0)+ leftWidthBoundary),
					y: pointOnArc.y,
					z: pointOnArc.z
				});
				resolve(); // point
			});
		}
		
		let numMinArcSteps,
			minArcIncrement,
			currentMinArc,
			currentMaxArc,
			currentArcIncrement;

		const generateRing = (leftWidthBoundary, widthOffset, minRadius, maxRadius, widthVariance) => {
			return new Promise(resolve=>{
				numMinArcSteps = Math.ceil((minRadius * twoPi) / (widthOffset));
				minArcIncrement = (minRadius * twoPi) / numMinArcSteps;
				
				let promises = [];

				for (currentArcIncrement = 0; currentArcIncrement < numMinArcSteps; currentArcIncrement++) {
					currentMinArc = currentArcIncrement * minArcIncrement;
					currentMaxArc = currentMinArc + minArcIncrement;
					
					promises.push(generatePoint(leftWidthBoundary, widthOffset, currentMinArc, currentMaxArc, minRadius, maxRadius, widthVariance));
				}
	
				Promise.all(promises).then(()=>{ // verticies
					resolve(); // vertices
				});
			})
		}
		
		let radiusIncrement,
			currentRadius;

		const generateDisk = (leftWidthBoundary, widthOffset, maxRadius, minRadius, numRadiusIncrements, widthVariance) => {
			return new Promise(resolve => {
				radiusIncrement = (maxRadius - minRadius)/ numRadiusIncrements;
	
				let promises = [];
				//Generate points on inner diameter
				promises.push(generateRing(leftWidthBoundary, widthOffset, minRadius, minRadius, widthVariance));
				// Generate points inside ring
				for(currentRadius = minRadius; currentRadius < maxRadius; currentRadius += radiusIncrement) {
					promises.push(generateRing(leftWidthBoundary, widthOffset, currentRadius, currentRadius + radiusIncrement, widthVariance));
				}
				//Generate points on outer diameter
				promises.push(generateRing(leftWidthBoundary, widthOffset, maxRadius, maxRadius, widthVariance));
				
				Promise.all(promises).then(() => { // pointArrays
					// let vertices = [];
					// pointArrays.forEach(ring=>{
					// 	vertices = [...vertices, ...ring];
					// });
					// console.log('generateDisk',vertices);
					resolve(); // vertices
				});
			});
		}

		return new Promise(resolve => {
			const widthIncrement = maxWidth / numWidthIncrement;
			const endWith = xPosition + maxWidth;
			
			let startTime = Date.now();
			let firstSet = generateDisk(xPosition, widthIncrement, maxRadius, minRadius, numRadiusIncrements, false);

			let promises = [];
			for(let currentXPosition = xPosition; currentXPosition < endWith; currentXPosition += widthIncrement) {
				promises = [...promises, generateDisk(currentXPosition, widthIncrement, maxRadius, minRadius, numRadiusIncrements, true)];
			}
			
			let lastSet = generateDisk(endWith, widthIncrement, maxRadius, minRadius, numRadiusIncrements, false);
			console.log('after last promise chain', Date.now() - startTime);

			Promise.all([firstSet, ...promises, lastSet]).then(() => { // pointArrays
				console.log('generatePlantedForest', Date.now() - startTime);

				// let vertices = [];
				// pointArrays.forEach(disk=>{
				// 	vertices = [...vertices, ...disk];
				// });
				// console.log('generateDisk',vertices);
				resolve(points); // vertices
			});
		});
	};


	const createMaterial = (color) => {
		return new THREE.MeshBasicMaterial({
			color: new THREE.Color(color),
			transparent: true,
			side: THREE.FrontSide
		});
	};


	const createPoints = () => {

		// this works for non-rasterized fonts. Should still work on rasterized fonts
		const Xonfig = {
			maxWidth: 90,
			xPosition: (90 / 2) * -1, // maxwidth / 2 * -1
			numWidthIncrement: 30,
			maxRadius: 45,
			minRadius: 20,
			numRadiusIncrements: 20
		};

		const config = { // this is the dev config because it starts up faster, so your refreshes arent slow
			maxWidth: 90,
			xPosition: (90 / 2) * -1, // maxwidth / 2 * -1
			numWidthIncrement: 30,
			maxRadius: 45,
			minRadius: 20,
			numRadiusIncrements: 10
		};

		return new Promise(resolve => {
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
		return new Promise(resolve => {
			(new THREE.FontLoader()).load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', resolve);
		});
	};

	const generateMaterials = (font) => {
		const fontSize = .3,
			possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; //+'abcdefghijklmnopqrstuvwxyz';

		let letterShapeGeoms = [],
			geometry,
			shape;

		return new Promise(resolve => {
			spaceWorkOut(possible.split(''), (value, index) => {
				shape = font.generateShapes(value, fontSize);
				geometry = new THREE.ShapeBufferGeometry(shape);
				geometry.computeBoundingBox();
				geometry.translate(-0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x), 0, 0);
				letterShapeGeoms[index] = geometry;
			}).then(()=>{
				resolve(letterShapeGeoms);
			});
		});
	};

	const generateGeometries = (letterShapeGeoms, points, midway) => {
		let geometries = [],
			rotY,
			letterPos,
			newGeom;
	
		const halfPi = Math.PI/2;

		return new Promise(resolve => {
			spaceWorkOut(points, (pos)=>{
				if (pos.x < midway - 15){
					rotY = 2;
				} else if (pos.x > midway + 15) {
					rotY = 0;
				} else {
					rotY = 1;
				}

				letterPos = Math.floor(Math.random() * letterShapeGeoms.length);

				if (!geometries[rotY]) { geometries[rotY] = []; }
				if (!geometries[rotY][letterPos]) { geometries[rotY][letterPos] = []; }

				newGeom = letterShapeGeoms[letterPos].clone();

				newGeom.rotateX(Math.atan2(pos.z, pos.y) + 3 * halfPi);
		//		newGeom.rotateY(rotY);
				// plane.rotation.y = plane.rotation.y + rotY;
				newGeom.translate( pos.x, pos.y, pos.z );

				geometries[rotY][letterPos].push(newGeom);
			}).then(()=>{
				resolve(geometries);
			});
		});
	};

	const addLettersToScene = (geometries) => {
		const colors = [
			createMaterial(0xFF0000),
			createMaterial(0x333333),
			createMaterial(0x0000FF)
		];

		let mesh,
			meshes = [];

		const startTime = Date.now();

		console.log('start add letters to scene', Date.now() - startTime);
		return new Promise(resolve => {
			spaceWorkOut(geometries, (letterGroups, rotIndex)=>{
				spaceWorkOut(letterGroups, (geoms, letterIndex) => {
					mesh = new THREE.Mesh( THREE.BufferGeometryUtils.mergeBufferGeometries(geoms, true), colors[rotIndex]);
					mesh.updateMatrix();
					mesh.matrixAutoUpdate = false;
					// mesh.rotation.x = mesh.rotation.x;
					// mesh.rotation.y = mesh.rotation.y;
					meshes.push(mesh);
				}).then(()=>{
					spaceWorkOut(meshes, (mesh)=>{
						scene.add(mesh);
					});
				});
			}).then(()=>{
				console.log('done adding letter meshes to scene:', Date.now() - startTime);
				resolve();
			});
		});
	}

};