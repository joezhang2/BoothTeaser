
// Namespace
function UserInterface(THREE, canvas) {

	// Browser driver support specifics
	let context;

	// Renderer specifics
	let camera, scene, renderer, light;

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

	const rads = (degrees) => {
		return THREE.Math.degToRad(degrees); //  * Math.PI / 180;
	};

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

		return new Promise((resolve,reject) => {

			const aspect = appWidth / appHeight;
			scene = new THREE.Scene();

	//		scene.matrixAutoUpdate = false;
			
			const fogColor = new THREE.Color(0x000000);
			scene.background = fogColor;
			scene.fog = new THREE.Fog(fogColor, 20, 65);	

			// PerspectiveCamera( fov : Number, aspect : Number, near : Number, far : Number )
			camera = new THREE.PerspectiveCamera(50, aspect, 0.01, 2000); // 40
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

			setTimeout(resolve, 0);
		}).then(() => { 
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
				// drawAdContainer(video);

				render();
				setTimeout(resolve, 0, {});
			});
		}).then(()=>{
			console.log('after first render', Date.now() - startTime);

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
		render();

		requestAnimationFrame(animate); // what should i replace this will? I think raf is supported, but is it?
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

		const config = {
			maxWidth: 90,
			xPosition: (90 / 2) * -1, // maxwidth / 2 * -1
			numWidthIncrement: 45,
			maxRadius: 45,
			minRadius: 20,
			numRadiusIncrements: 20
		};

		const Xonfig = { // this is the dev config because it starts up faster, so your refreshes arent slow
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
	}

};