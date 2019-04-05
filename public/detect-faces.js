const faceapi = window.faceapi;
const MODELS_PATH = '/public/models';
const lastNames = ['SMITH','JOHNSON','WILLIAMS','BROWN','JONES','MILLER','DAVIS','GARCIA','RODRIGUEZ','WILSON','MARTINEZ','ANDERSON','TAYLOR','THOMAS','HERNANDEZ','MOORE','MARTIN','JACKSON','THOMPSON','WHITE','LOPEZ','LEE','GONZALEZ','HARRIS','CLARK','LEWIS','ROBINSON','WALKER','PEREZ','HALL','YOUNG','ALLEN','SANCHEZ','WRIGHT','KING','SCOTT','GREEN','BAKER','ADAMS','NELSON','HILL','RAMIREZ','CAMPBELL','MITCHELL','ROBERTS','CARTER','PHILLIPS','EVANS','TURNER','TORRES','PARKER','COLLINS','EDWARDS','STEWART','FLORES','MORRIS','NGUYEN','MURPHY','RIVERA','COOK','ROGERS','MORGAN','PETERSON','COOPER','REED','BAILEY','BELL','GOMEZ','KELLY','HOWARD','WARD','COX','DIAZ','RICHARDSON','WOOD','WATSON','BROOKS','BENNETT','GRAY','JAMES','REYES','CRUZ','HUGHES','PRICE','MYERS','LONG','FOSTER','SANDERS','ROSS','MORALES','POWELL','SULLIVAN','RUSSELL','ORTIZ','JENKINS','GUTIERREZ','PERRY','BUTLER','BARNES','FISHER','HENDERSON','COLEMAN','SIMMONS','PATTERSON','JORDAN','REYNOLDS','HAMILTON','GRAHAM','KIM','GONZALES','ALEXANDER','RAMOS','WALLACE','GRIFFIN','WEST','COLE','HAYES','CHAVEZ','GIBSON','BRYANT','ELLIS','STEVENS','MURRAY','FORD','MARSHALL','OWENS','MCDONALD','HARRISON','RUIZ','KENNEDY','WELLS','ALVAREZ','WOODS','MENDOZA','CASTILLO','OLSON','WEBB','WASHINGTON','TUCKER','FREEMAN','BURNS','HENRY','VASQUEZ','SNYDER','SIMPSON','CRAWFORD','JIMENEZ','PORTER','MASON','SHAW','GORDON','WAGNER','HUNTER','ROMERO','HICKS','DIXON','HUNT','PALMER','ROBERTSON','BLACK','HOLMES','STONE','MEYER','BOYD','MILLS','WARREN','FOX','ROSE','RICE','MORENO','SCHMIDT','PATEL','FERGUSON','NICHOLS','HERRERA','MEDINA','RYAN','FERNANDEZ','WEAVER','DANIELS','STEPHENS','GARDNER','PAYNE','KELLEY','DUNN','PIERCE','ARNOLD','TRAN','SPENCER','PETERS','HAWKINS','GRANT','HANSEN','CASTRO','HOFFMAN','HART','ELLIOTT','CUNNINGHAM','KNIGHT'];
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

let faceLabels = [];

const faceDetection = () => {
	var video = document.createElement('video');

	video.addEventListener('timeupdate', (evt) => {
		// send in the video on each frame of video received
		detect(evt.target);
	});

	navigator.mediaDevices.getUserMedia({ 
		video: {
//			width: { min: 1024, ideal: 1280, max: 1920 },
//			height: { min: 776, ideal: 720, max: 1080 },
// boolean width = true;
// boolean height = true;
// boolean aspectRatio = true;
// boolean frameRate = true;
// boolean facingMode = true;
// boolean volume = true;
// boolean sampleRate = true;
// boolean sampleSize = true;
// boolean echoCancellation = true;
// boolean autoGainControl = true;
// boolean noiseSuppression = true;
// boolean latency = true;
// boolean channelCount = true;
// boolean deviceId = true;
// boolean groupId = true;
			facingMode: 'user',
			frameRate: { ideal: 1, max: 1 }
		}, 
		audio: false 
	}).then(function(stream) {
		video.srcObject = stream;
		video.play();
	})
	.catch(function(err) {
		console.log('An error occurred: ', err);
	});
};

class BannerHandler {
	constructor() {
			this.q1 = [];
			this.q2 = [];
			this.current = null;
	}

	submit(name){
		this.q1.push(name)
	}

	updateCanvases(currentFaces){
		if (this.current && currentFaces[this.current]) {
	//		console.log(currentFaces, this.q1);
			while(this.q1.length > 0){
				const temp = this.q1.pop();
				if(temp in currentFaces){
					console.log(temp, currentFaces);
					this.current = temp;
					const leftDiv = document.getElementById('left-div');
					leftDiv.appendChild(currentFaces[temp].canvas);
					break;
				}
			}
			const leftDiv = document.getElementById('left-div');
			leftDiv.appendChild(currentFaces[this.current].canvas)
		} 
	}

	remove(){
		const leftDiv = document.getElementById('left-div');
		while (leftDiv.firstChild) {
			leftDiv.removeChild(leftDiv.firstChild);
		} 
		this.q2.push(this.current);
		this.current = null;
	}
}

const bh = new BannerHandler();



function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min)) + min;
}

function getRandomName(){
	return lastNames[getRandomInt(0,198)]
}

async function run() {
	// load the models
	await faceapi.loadTinyFaceDetectorModel(MODELS_PATH);
	await faceapi.loadFaceRecognitionModel(MODELS_PATH);
	await faceapi.loadFaceLandmarkTinyModel(MODELS_PATH);

	faceDetection();
}

function detect(video){
	return new Promise((resolve,reject)=>{
		faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
		.withFaceLandmarks(true)
		.withFaceDescriptors()
		.then(detections=>{
			if(detections.length>0){
				if(faceLabels.length===0){
					faceLabels = [ 
						...faceLabels, 
						...detections.map(detection=> new faceapi.LabeledFaceDescriptors(
							getRandomName(),
							[detection.descriptor])
					)]
					resolve(faceLabels)
				} else {
					const faceMatcher = new faceapi.FaceMatcher(faceLabels);
					const matches = detections.map(d=>faceMatcher.matchDescriptor(d.descriptor))
					const names = matches.map(m => m.distance>0.6 ? getRandomName() : m.label )
					
					const regionsToExtract = detections.map(faceDetection=> faceDetection.detection.box)
					faceapi.extractFaces(video, regionsToExtract).then(canvases=>{
					canvases.forEach((c)=> { 
						c.style='position:absolute;left:0;top:0;width:200px;height:200px;';
					});
					const faces = names.reduce((o, name, i) => (
							{ ...o, [name]: 
								{
									'detection': detections[i],
									'match': matches[i],
									'canvas': canvases[i]
								}}
							), {});
					
							faceLabels = [ 
								...faceLabels, 
								...names.filter((name,i)=>{
										return faces[name].match.distance>0.6
									})
									.map((name)=> {
										bh.submit(name);
										return new faceapi.LabeledFaceDescriptors(
											name,
											[faces[name].detection.descriptor]
										)
									})
							]
						bh.updateCanvases(faces);
						console.log(bh.q1, faces)
						resolve(faceLabels)
					})
				}
			} else {
				console.log('No matches')
				resolve(faceLabels)
			}
		});
	});
}

run();