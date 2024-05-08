import pixelateImg from "./lib/pixelate";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const fileInput = document.getElementById('fileInput');
const fileInputMap = document.getElementById('fileInputMap');
let originalImageURL;
let depthMapURL;
const blockSizeInInches = 0.5;
let aspect;            
let xBlocks ;
let yBlocks;
let allColors;
let allColorsDepth;

let scene, camera, renderer, controls;
let light1,light2,light3;

let heights = [];

fileInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            originalImageURL = event.target.result;
            processOriginalImage();
        }
        reader.readAsDataURL(file);
    }
});

fileInputMap.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            depthMapURL = event.target.result;
            processDepthMap();
        }
        reader.readAsDataURL(file);
    }
});

function processOriginalImage() {
    const img = new Image();
    img.src = originalImageURL;
    img.onload = async function() {
        const imgContainer = document.getElementById('output');
            imgContainer.innerHTML = '<img src="' + originalImageURL + '">';
            
           
            const canvas = document.createElement('canvas');
            canvas.width = img.width;     // Asigna el ancho de la imagen al canvas
            canvas.height = img.height;   // Asigna el alto de la imagen al canvas

            aspect = img.width / img.height;            
            xBlocks = 100;
            yBlocks = Math.floor(xBlocks/aspect);           
            
            //dibuja la imagen original en el canvas
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, img.width, img.height);   
            
            //pixelar la imagen a color
            const PixelOrigen = await pixelateImg(canvas.toDataURL(), xBlocks, yBlocks);
            allColors = PixelOrigen.allColors;

            const pixelatedContainer = document.getElementById('pixelated');
            pixelatedContainer.innerHTML = '<img src="' + PixelOrigen.imageURL + '">'; 

        heights = alturasAvg(allColors);
        //alturas();//calcular las alturas basado en la luminocidad
        //applyGaussianFilter(heights, xBlocks, yBlocks);
        initThreeJS()//iniciar escena
        paint3d();//pintar los bloques a color
    }
}

function processDepthMap() {
    const img = new Image();
    img.src = depthMapURL;
    img.onload = async function() {
        const imgContainer = document.getElementById('depthMapOutput');
        imgContainer.innerHTML = '<img src="' + depthMapURL + '">';

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);   

        // Ahora puedes pixelar el mapa de profundidad o hacer algún otro proceso que requieras
        const PixelDepth = await pixelateImg(canvas.toDataURL(), xBlocks, yBlocks);
        allColorsDepth = PixelDepth.allColors;

        const pixelatedDepthContainer = document.getElementById('pixelatedMap');
        pixelatedDepthContainer.innerHTML = '<img src="' + PixelDepth.imageURL + '">';

        //alturasAvg();
        //alturas();//calcular las alturas basado en la luminocidad
        //applyGaussianFilter(heights, xBlocks, yBlocks);
        //initThreeJS()//iniciar escena
        //paint3d();//pintar los bloques a color
    }
}

function alturas(){
     //alturas de los bloques
     //const discreteHeightsInInches = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
     const discreteHeightsInInches = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
     // Lógica para asignar alturas
     heights = allColorsDepth.map((color, index) => {
         const luminosity = 0.3 * color[0] + 0.59 * color[1] + 0.11 * color[2];
         const heightIndex = Math.min(Math.floor((luminosity / 255) * discreteHeightsInInches.length), discreteHeightsInInches.length - 1);
     
        return discreteHeightsInInches[heightIndex];
     });
}

/* function alturasAvg(){
    console.log(allColors);
    for(var i = 0; i < allColors.length; i++) {
        var pixel = allColors[i];
        var r = pixel[0]/255.0;
        var g = pixel[1]/255.0;
        var b = pixel[2]/255.0;
        var z = (r + g + b) / 3.0;  // calcula el promedio de los valores RGB
        heights.push(z);  // almacena la altura en el arreglo de alturas
    }
} */

function mapHeight(value, pHeights) {
    // Suponemos que el array 'heights' está ordenado de menor a mayor.
    var min = 0; // El valor mínimo que puede tener 'value'.
    var max = 1; // El valor máximo que puede tener 'value'.
    var scale = (value - min) / (max - min); // Normalizar 'value' a un rango de 0-1.
  
    // Escala de 0 a la longitud del array de alturas menos uno (índices de array).
    var scaledIndex = scale * (pHeights.length - 1);
  
    // Redondear al índice más cercano para mapear al valor de altura.
    var index = Math.round(scaledIndex);
    return pHeights[index];
  }
  
  var heightsRang = [0.5, 0.75, 1, 1.25, 1.50, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5];
  
  function alturasAvg(allColors) {
    var mappedHeights = [];
  
    for(var i = 0; i < allColors.length; i++) {
      var pixel = allColors[i];
      var r = pixel[0]/255.0;
      var g = pixel[1]/255.0;
      var b = pixel[2]/255.0;
      var z = (r + g + b) / 3.0;  // Calcula el promedio de los valores RGB.
  
      // Mapea este valor promedio a un valor discreto de altura.
      var mappedHeight = mapHeight(z, heightsRang);
      mappedHeights.push(mappedHeight);  // Almacena la altura en el array de alturas mapeadas.
    }
  
    return mappedHeights;
  }
  

function initThreeJS() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    scene = new THREE.Scene({antialias: true});
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 40;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.gammaInput = true;
	renderer.gammaOutput = true;
	renderer.shadowMap.enabled = true;
    renderer.shadowMap.renderReverseSided = false;
    document.getElementById('scene').appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    light1 = addShadowedLight( 0, -2, 2, 0xffffff, 2 );
	light2 = addShadowedLight( -1, 1, 1, 0xffffff, 1.8 );
	light3 = addShadowedLight( 1, 1, 0.5, 0xffffff, 1.6 );
}

function paint3d(){

    for(let i = 0; i < xBlocks; i++) {
        for(let j = 0; j < yBlocks; j++) {
            //const height = Math.abs(heights[j * xBlocks + i]);
            //const geometry = new THREE.BoxGeometry(blockSizeInInches, blockSizeInInches, height);
            const geometry = new THREE.BoxGeometry(blockSizeInInches, blockSizeInInches, heights[j * xBlocks + i]);                    
            const material = new THREE.MeshStandardMaterial({ color: `rgb(${allColors[j * xBlocks + i].join(",")})` });
            const cube = new THREE.Mesh(geometry, material);
            cube.castShadow = true;
            cube.receiveShadow = true;
            cube.position.set(i * blockSizeInInches - xBlocks * blockSizeInInches / 2, (yBlocks - j - 1) * blockSizeInInches - yBlocks * blockSizeInInches / 2, (heights[j * xBlocks + i] / 2 - 5));
            scene.add(cube);
        }
    }

    const animate = function () {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    };

    animate();
}

function applyGaussianFilter(heights, width, height) {
    //const discreteHeightsInInches = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
    const discreteHeightsInInches = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

    const originalHeights = [...heights];
    const kernel = [
        [1, 2, 1],
        [2, 4, 2],
        [1, 2, 1]
    ];
    const kernelSum = 16;

    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            let totalHeight = 0;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const x = i + dx;
                    const y = j + dy;

                    if (x >= 0 && x < width && y >= 0 && y < height) {
                        const index = y * width + x;
                        totalHeight += originalHeights[index] * kernel[dy + 1][dx + 1];
                    }
                }
            }
            
            // Calcular el valor filtrado.
            const filteredValue = totalHeight / kernelSum;
            
            // Discretizar el valor filtrado para coincidir con discreteHeightsInInches.
            const closestHeight = discreteHeightsInInches.reduce((prev, curr) => {
                return (Math.abs(curr - filteredValue) < Math.abs(prev - filteredValue) ? curr : prev);
            });

            const currentIndex = j * width + i;
            heights[currentIndex] = closestHeight;
        }
    }
}

function addShadowedLight( x, y, z, color, intensity ) {
    var directionalLight = new THREE.DirectionalLight( color, intensity );
    directionalLight.position.set( x, y, z );
    directionalLight.castShadow = true;
    var d = 5;
    directionalLight.shadow.camera.left = -d;
    directionalLight.shadow.camera.right = d;
    directionalLight.shadow.camera.top = d;
    directionalLight.shadow.camera.bottom = -d;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 15;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.bias = -0.005;
    const helper = new THREE.CameraHelper(directionalLight.shadow.camera)
    //directionalLight.target.position = new THREE.Vector3(0,0,0);
    //directionalLight.target.updateMatrixWorld();
    //scene.add(helper);
    //scene.add(directionalLight.target);
    scene.add( directionalLight );

    return directionalLight;
}














