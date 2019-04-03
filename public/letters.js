// Browser driver support specifics
var canvas, context;
// Renderer specifics
var camera, scene, renderer, controls, helper;
var cylGeom, cylMat, boxGeom, boxMat, box, cylinder;
var boxRotationDims = {
    x: 0,
    y: 0
};
var pageCenterDims = {
    x: 0,
    y: 0
};
var cameraOriginDims = {
    x: 0,
    y: 0,
    z: 1
};
// var cameraHoverDistance = 150;
var cameraHoverDistance = 65;
//var meshes = [];
var frustumSize = 1000;


init();
animate();

function rads(degrees) {
    return THREE.Math.degToRad(degrees); //  * Math.PI / 180;
}

function init() {
    
    var aspect = window.innerWidth / window.innerHeight;
    scene = new THREE.Scene();
    
    // PerspectiveCamera( fov : Number, aspect : Number, near : Number, far : Number )
    camera = new THREE.PerspectiveCamera(30, aspect, 0.01, 200);
    
    helper = new THREE.CameraHelper(camera);
    
    
    fogColor = new THREE.Color(0x000);
    scene.background = fogColor;
    scene.fog = new THREE.Fog(fogColor, 50, 175);
    
    // PerspectiveCamera( fov : Number, aspect : Number, near : Number, far : Number )
    
    camera = new THREE.PerspectiveCamera(50, aspect, 0.01, 175);
    
    
    //  scene.add(helper);
    
    // show me x/y/z grids
    var size = 20;
    var divisions = 20;
    
    var xGridHelper = new THREE.GridHelper(size, divisions);
    xGridHelper.position.x = 0;
    xGridHelper.position.y = 0;
    xGridHelper.position.z = 0;
    xGridHelper.rotation.x = rads(90);
    //  scene.add(xGridHelper);
    
    var yGridHelper = new THREE.GridHelper(size, divisions);
    yGridHelper.position.x = 0;
    yGridHelper.position.y = 0;
    yGridHelper.position.z = 0;
    yGridHelper.rotation.y = rads(90);
    //  scene.add(yGridHelper);
    
    var polarGridHelper = new THREE.PolarGridHelper(size, divisions, 8, 64, 0x0000ff, 0x808080);
    polarGridHelper.position.y = 0;
    polarGridHelper.position.x = 0;
    polarGridHelper.position.z = 0;
    polarGridHelper.rotation.z = rads(90);
    // scene.add(polarGridHelper);
    
    drawLetters(scene);
    
    // WebGL 2 looks to be supported in Chrome and FF, but not in Safari Tech Preview very well.
    canvas = document.createElement('canvas');
    canvas.style.background = '#000';
    context = canvas.getContext('webgl2'); // webgl2 for that engine
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        context: context,
        antialias: true
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
}

// shapes pre-organized into buckets based on angle ranges so we can rotate only the ones in view
var meshBuckets = {};
var totalBuckets = 120;
var bucketAngleSize = 360 / totalBuckets;

function assignToBucket (mesh) {
    var p1 = { x:0, y:0},
            p2 = { x: mesh.position.y, y: mesh.position.z };
    
    // angle in radians
    var angleRads = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    
    // angle in degrees
    var angleDeg = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
    
    var bucketSlice = Math.floor(angleDeg / bucketAngleSize);
    var bucketAngle = bucketSlice * bucketAngleSize;
    
    // console.log(angleDeg, angleRads, bucketSlice, bucketAngle, p2.x, p2.y);
    if (!meshBuckets[bucketAngle]) {
        meshBuckets[bucketAngle] = [];
    }
    // console.log(meshBuckets[bucketAngle]);
    meshBuckets[bucketAngle].push(mesh);
}

document.body.addEventListener('mousemove', onMouseMove);
document.body.addEventListener('onresize', onWinResize);
onWinResize();

function onWinResize() {
    pageCenterDims.width = window.innerWidth / 2;
    pageCenterDims.height = window.innerHeight / 2;
}

function onMouseMove(e) {
    boxRotationDims.x = (pageCenterDims.width - e.pageX) * 0.01;
    boxRotationDims.y = (pageCenterDims.height - e.pageY) * 0.01;
}

var angle = 0;

function animate() {
    
    requestAnimationFrame(animate);
    
    camera.position.x = cameraOriginDims.x + (boxRotationDims.x * -1);
    
    angle += 0.1;
    
    camera.position.z = cameraHoverDistance * Math.sin(rads(angle));
    camera.position.y = cameraHoverDistance * Math.cos(rads(angle));
    
    var rot = rads(angle + 270);
    camera.rotation.x = rot;
    
    renderer.render(scene, camera);
    
}

//var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
var possible = 'abcdefghijklmnopqrstuvwxyz';

function perc2color(perc, min, max) {
    var base = (max - min);
    
    if (base == 0) {
        perc = 100;
    } else {
        perc = (perc - min) / base * 100;
    }
    var r, g, b = 0;
    if (perc < 50) {
        r = 255;
        g = Math.round(5.1 * perc);
    } else {
        g = 255;
        r = Math.round(510 - 5.10 * perc);
    }
    var h = r * 0x10000 + g * 0x100 + b * 0x1;
    return '#' + ('000000' + h.toString(16)).slice(-6);
}

function drawLetter(font) {
    
    var letters = [];
    
    for (var i = 0; i < 2; i ++) {
        var xMid;
        var perc = Math.random() * 100;
        var color = new THREE.Color(perc2color(perc, 0, 100)); //0x006600;
        // console.log(perc, color);
        var matLite = new THREE.MeshBasicMaterial({
            color: color,
            transparent: false,
            opacity: 1 //minMaxRand(0.3, 1)
            // ,side: THREE.DoubleSide
        });
        
        // var message = possible.charAt(Math.floor(Math.random() * possible.length));
        // var shapes = font.generateShapes(message, 1);
        // var geometry = new THREE.ShapeBufferGeometry(shapes);
        // geometry.computeBoundingBox();
        // xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
        // geometry.translate(xMid, 0, 0);
        // // make shape ( N.B. edge view not visible )
        // letters.push({g: geometry, m: matLite});
        letters.push(matLite);
    }
    return letters;
    
}

function minMaxRand(min, max) {
    return Math.random() * (max - min) + min;
}


function generateCylinder(centerPoint, edgePoint, density, height, numHeightSteps) {
    var DEFAULT_RADIUS_INCREMENTS = 20;
    var DEFAULT_ANGLE_INCREMENTS =  .05;
    var DEFAULT_SPIRAL = 150;
    
    var radiusIncrement = density * DEFAULT_RADIUS_INCREMENTS;
    var angleIncrement = 2*Math.PI / (density * DEFAULT_ANGLE_INCREMENTS);
    var numSpirals = density * DEFAULT_SPIRAL;
    
    function calculateRadius(centerPoint, edgePoint) {
        return Math.sqrt(Math.pow(edgePoint.y - centerPoint.y, 2)
                + Math.pow(edgePoint.z - centerPoint.z, 2)
                + Math.pow(edgePoint.x - centerPoint.x, 2));
    }
    
    function randomness(currentIncrement, currentRadius, maxRadius) {
        return (Math.random() * (maxRadius/currentRadius) * currentRadius);
    }
    
    
    function createPointOnSpiral(centerPoint, currentIncrement, currentRadius, maxRadius, numRadiusIncrements, angle, shiftHeight, maxHeightVariance) {
        var zOffset = shiftHeight ? (2 * Math.random() - .5) * maxHeightVariance : 0;
        y = centerPoint.y + (randomness(currentIncrement, currentRadius, maxRadius, numRadiusIncrements)) * Math.cos(angle),
                z = centerPoint.z + (randomness(currentIncrement, currentRadius, maxRadius, numRadiusIncrements)) * Math.sin(angle),
                x = centerPoint.x + zOffset;
        return {x: x, y: y, z: z}
    }
    
    function createSpiralPoints(vertices, centerPoint, maxRadius, numRadiusIncrements, angleIncrement, offset, shiftHeight, maxHeightVariance){
        for (var currentIncrement = 0; currentIncrement < numRadiusIncrements; currentIncrement++) {
            var angle = (currentIncrement * angleIncrement + offset),
                    currentRadius = maxRadius * currentIncrement / numRadiusIncrements;
            
            if (currentRadius/maxRadius > .6) {
                var point = createPointOnSpiral(centerPoint, currentIncrement, currentRadius, maxRadius, numRadiusIncrements, angle, shiftHeight, maxHeightVariance);
                vertices.push(point);
            }
        }
    }
    
    var vertices = [];
    var radius = calculateRadius(centerPoint, edgePoint);
    var NO_SHIFT_HEIGHT = false;
    var SHIFT_HEIGHT = true;
    var heightIncrements =  height / numHeightSteps;
    
    for (var spiral = 0; spiral < numSpirals; spiral++) {
        createSpiralPoints(vertices, centerPoint, radius, radiusIncrement, angleIncrement, spiral * Math.random() * 2 * Math.PI, NO_SHIFT_HEIGHT);
    }
    
    for (var currentHeight = 1; currentHeight < numHeightSteps-1; currentHeight++) {
        var startingPoint = {
            y: centerPoint.y,
            z: centerPoint.z,
            x: centerPoint.x + currentHeight * heightIncrements
        };
        
        for (var spiral = 0; spiral < numSpirals; spiral++) {
            createSpiralPoints(vertices, startingPoint, radius, radiusIncrement, angleIncrement, spiral * Math.random() * 2 * Math.PI, SHIFT_HEIGHT, heightIncrements);
        }
    }
    
    var endpointPoint = {
        y: centerPoint.y,
        z: centerPoint.z,
        x: centerPoint.x + height
    };
    
    for (var spiral = 0; spiral < numSpirals; spiral++) {
        createSpiralPoints(vertices, endpointPoint, radius, radiusIncrement, angleIncrement, spiral * Math.random() * 2 * Math.PI, NO_SHIFT_HEIGHT);
    }
    
    return vertices;
}


function generatePlantedForest(xPosition, maxWidth, numWidthIncrement, maxRadius, minRadius, numRadiusIncrements) {
    
    function calculateRandomAngleInArc(minArcLength, maxArcLength, radius) {
        var circumference = 2 * Math.PI * radius;
        var startingAngle = 2 * Math.PI * minArcLength / circumference;
        var endingAngle = 2 * Math.PI * maxArcLength / circumference;
        
        return .3 * Math.random() * (endingAngle - startingAngle) + startingAngle;
    }
    
    function generateRandomPointOnArc(currentRadius, minArcLength, maxArcLength, arcRadius) {
        var angle = calculateRandomAngleInArc(minArcLength, maxArcLength, arcRadius);
        
        return {
            y: currentRadius * Math.sin(angle),
            z: currentRadius * Math.cos(angle)
        };
    }
    
    function generatePoint(leftWidthBoundary, widthOffset, currentMinArc, currentMaxArc, minRadius, maxRadius, widthVariance) {
        var x, y, z;
        var radius = minRadius + (maxRadius - minRadius) * Math.random();
        
        var pointOnArc = generateRandomPointOnArc(radius, currentMinArc, currentMaxArc, minRadius);
        
        x = (widthVariance ? widthOffset * .3 * Math.random() : 0)+ leftWidthBoundary;
        y = pointOnArc.y;
        z = pointOnArc.z;
        return {x: x, y: y, z: z};
    }
    
    function generateRing(leftWidthBoundary, widthOffset, minRadius, maxRadius, widthVariance) {
        var numMinArcSteps = Math.ceil((minRadius * 2 * Math.PI) / (widthOffset));
        var minArcIncrement = (minRadius * 2 * Math.PI) / numMinArcSteps;
        
        var vertices = [];
        
        for (var currentArcIncrement = 0; currentArcIncrement < numMinArcSteps; currentArcIncrement++) {
            var currentMinArc = currentArcIncrement * minArcIncrement;
            var currentMaxArc = currentMinArc + minArcIncrement ;
            
            vertices.push(generatePoint(leftWidthBoundary, widthOffset, currentMinArc, currentMaxArc, minRadius, maxRadius, widthVariance));
        }
        return vertices;
    }
    
    function generateDisk(leftWidthBoundary, widthOffset, maxRadius, minRadius, numRadiusIncrements, widthVariance) {
        var radiusIncrement = (maxRadius - minRadius)/ numRadiusIncrements;
        var vertices = [];
        
        //Generate points on inner diameter
        vertices = vertices.concat(generateRing(leftWidthBoundary, widthOffset, minRadius, minRadius, widthVariance));
        
        // Generate points inside ring
        for(var currentRadius = minRadius; currentRadius < maxRadius; currentRadius += radiusIncrement) {
            vertices = vertices.concat(generateRing(leftWidthBoundary, widthOffset, currentRadius, currentRadius + radiusIncrement, widthVariance));
        }
        //Generate points on outer diameter
        vertices = vertices.concat(generateRing(leftWidthBoundary, widthOffset, maxRadius, maxRadius, widthVariance));
        
        return vertices;
    }
    
    var widthIncrement = maxWidth / numWidthIncrement;
    var endWith = xPosition + maxWidth;
    
    var vertices = [];
    
    vertices = vertices.concat(generateDisk(xPosition, widthIncrement, maxRadius, minRadius, numRadiusIncrements, false));
    
    for(var currentXPosition = xPosition; currentXPosition < endWith; currentXPosition += widthIncrement) {
        vertices = vertices.concat(generateDisk(currentXPosition, widthIncrement, maxRadius, minRadius, numRadiusIncrements, true));
    }
    
    vertices = vertices.concat(generateDisk(endWith, widthIncrement, maxRadius, minRadius, numRadiusIncrements, false));
    return vertices;
}


function generateRandom(count) {
    var points = [];
    var pos = {
        x: 0,
        y: 0,
        z: 0
    };
    
    for (var i = 0; i < count; i++) {
        var pos = {
            x: minMaxRand(-75, 75),
            y: minMaxRand(-150, 150),
            z: minMaxRand(-150, 150)
        };
        
        points.push(pos);
//      meshes.push(mesh);
    }
    return points
}

function angleLetter(mesh) {
    var pos = mesh.position;
    mesh.rotation.x =  Math.atan2(pos.z, pos.y) + 3*Math.PI/2 ;
};


function drawLetters(scene) {
    var loader = new THREE.FontLoader();
    
    loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function generateFontForrest(font) {
        // var count = 22500;
        // var count = 9000;
        // var points = generateRandom(count);
        
        // var centerPoint = {x: -75, y: 0, z: 0};
        // var edgePoint = {x: -75, y: 150, z: 150};
        // var height = 150;
        // var heightIncrements = 100;
        // var density = .3;
        // var points = generateCylinder(centerPoint, edgePoint, density, height, heightIncrements);
        
        var xPosition = -20;
        var maxWidth = 30;
        var numWidthIncrement = 15;
        var maxRadius = 47;
        var minRadius = 46;
        var numRadiusIncrements = .2
        ;
        var points = generatePlantedForest(xPosition, maxWidth, numWidthIncrement, maxRadius, minRadius, numRadiusIncrements);
        
        console.log('Total count of letters:', points.length);
        var midway = maxWidth/2 + xPosition;
        var meshInfo = drawLetter(font);
        // noinspection BadExpressionStatementJS
        
        
        var message = possible.charAt(Math.floor(Math.random() * possible.length));
        var shapes = font.generateShapes(message, 1);
        var geometry = new THREE.ShapeBufferGeometry(shapes);
        geometry.computeBoundingBox();
        xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
        geometry.translate(xMid, 0, 0);
        // make shape ( N.B. edge view not visible )
        
        var perc = Math.random() * 100;
        var color = new THREE.Color(perc2color(perc, 0, 100)); //0x006600;
        // console.log(perc, color);
        var matLite1 = new THREE.MeshBasicMaterial({
            color: color,
            transparent: false,
            opacity: 1 //minMaxRand(0.3, 1)
            // ,side: THREE.DoubleSide
        });
        
        
        var perc1 = Math.random() * 100;
        var color1 = new THREE.Color(perc2color(perc1, 0, 100)); //0x006600;
        // console.log(perc, color);
        var matLite2 = new THREE.MeshBasicMaterial({
            color: color1,
            transparent: false,
            opacity: 1 //minMaxRand(0.3, 1)
            // ,side: THREE.DoubleSide
        });
        
        points.forEach((pos) => {
            var curMesh;
            if (pos.x > midway){
                curMesh = matLite1;
            } else {
                curMesh = matLite2;
            }
            
            var mesh = new THREE.Mesh(geometry, curMesh);
            mesh.position.x = pos.x;
            mesh.position.y = pos.y;
            mesh.position.z = pos.z;
            
            angleLetter(mesh);
            mesh.updateMatrix();
            mesh.matrixAutoUpdate = false;
            scene.add(mesh);
            assignToBucket(mesh);

//      meshes.push(mesh);
        });
        
    }); //end load function
    
}
