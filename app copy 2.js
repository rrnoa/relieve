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
let greyDepthPixels;
let greyDepthImg;
let allColorsDepth;
let pixelesOscuros;

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

        // Pixelar el mapa de profundidad 
        const PixelDepth = await pixelateImg(canvas.toDataURL(), xBlocks, yBlocks);
        allColorsDepth = PixelDepth.allColors;
        
        //console.log("allColorsDepth",allColorsDepth);
        //LLevar a escala de grises el mapa de profundidad
        greyDepthPixels = greyScale(allColorsDepth);

        const greyDepthImg = convertirPixelToImg(greyDepthPixels, xBlocks, yBlocks);
        
        const pixelatedDepthContainer = document.getElementById('pixelatedMap');
        pixelatedDepthContainer.innerHTML = '<img src="' + greyDepthImg + '">';

        const pixelsOriginal = [...allColors];
        pixelesOscuros = applyDepthToPixels(pixelsOriginal, allColorsDepth);
        heights = calculateHeightsFromPixels(pixelesOscuros);
        //alturasAvg();
        //alturas();//calcular las alturas basado en la luminocidad
        //applyGaussianFilter(heights, xBlocks, yBlocks);
        initThreeJS()//iniciar escena
        paint3d();//pintar los bloques a color
    }
}  

function initThreeJS() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    scene = new THREE.Scene({antialias: true});
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 80;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    //renderer.gammaInput = true;
	//renderer.gammaOutput = true;
	//renderer.shadowMap.enabled = true;
    //renderer.shadowMap.renderReverseSided = false;
    document.getElementById('scene').appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    //light1 = addShadowedLight( 0, -2, 2, 0xffffff, 2 );
	//light2 = addShadowedLight( -1, 1, 1, 0xffffff, 1.8 );
	//light3 = addShadowedLight( 1, 1, 0.5, 0xffffff, 1.6 );
}

function paint3d(){

    console.log(pixelesOscuros);

    for(let i = 0; i < xBlocks; i++) {
        for(let j = 0; j < yBlocks; j++) {

            const height = heights[j * xBlocks + i];
            
            const geometry = new THREE.BoxGeometry(blockSizeInInches, blockSizeInInches, heights[j * xBlocks + i]);                    
            //const geometry = new THREE.BoxGeometry(blockSizeInInches, blockSizeInInches, 1);                    
            const material = new THREE.MeshBasicMaterial({ color: `rgb(${allColors[j * xBlocks + i].join(",")})` });
            const cube = new THREE.Mesh(geometry, material);
            //cube.castShadow = true;
            //cube.receiveShadow = true;
            cube.position.set(i * blockSizeInInches - xBlocks * blockSizeInInches / 2, (yBlocks - j - 1) * blockSizeInInches - yBlocks * blockSizeInInches / 2, height/2);
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

function adjustPixelColorByDepth(imagePixel, depthValue) {
    // Aquí definimos el rango de variación. 
    // Puedes ajustar los valores 0.5 y 1.0 si quieres un rango de oscurecimiento diferente.
    //const factor = 0.5 + depthValue * 0.5; 
    const factor = depthValue * depthValue;

    return [
        Math.min(Math.round(imagePixel[0] * factor), 255),
        Math.min(Math.round(imagePixel[1] * factor), 255),
        Math.min(Math.round(imagePixel[2] * factor), 255)
    ];
}

function applyDepthToPixels(imagePixels, depthPixels) {
    for (let i = 0; i < imagePixels.length; i++) {
        //con esto ya se resuelve lo de la escala de grises del mapa
        const depthValue = (depthPixels[i][0] + depthPixels[i][1] + depthPixels[i][2]) / (3 * 255);
        imagePixels[i] = adjustPixelColorByDepth(imagePixels[i], depthValue);
    }

    return imagePixels;
}

/*function calculateHeightsFromPixels(pimagePixels) {
    const heightMap = [1, 1.25, 1.50, 1.75, 2.25, 2.50, 2.75, 3.25, 3.50, 3.75, 4];
    let heights = [];
    
    for (let pixel of pimagePixels) {
        // Calcular el promedio de los valores R, G y B
        let avgColorValue = (pixel[0] + pixel[1] + pixel[2]) / 3;
        
        // Normalizar el valor entre 0 y 1
        let normalizedValue = avgColorValue / 255;

        // Mapear el valor normalizado a un índice en el heightMap
        let index = Math.floor(normalizedValue * (heightMap.length - 1));
        
        // Añadir la altura correspondiente al arreglo de alturas
        heights.push(heightMap[index]);
    }
    
    return heights;
}*/

function calculateHeightsFromPixels(imagePixels) {
    const heightMap = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 4];
    let heights = [];
    
    // Convertir cada pixel a una escala de grises y almacenarlo en un nuevo arreglo
    let grayValues = imagePixels.map(pixel => (pixel[0] + pixel[1] + pixel[2]) / 3);
    
    // Ordenar el arreglo de valores grises
    let sortedGrayValues = [...grayValues].sort((a, b) => a - b);
    
    for (let grayValue of grayValues) {
        // Determinar en qué percentil se encuentra el valor gris
        let percentile = sortedGrayValues.indexOf(grayValue) / sortedGrayValues.length;

        // Convertir el percentil a un índice en el heightMap
        let index = Math.floor(percentile * (heightMap.length));
        
        // Garantizar que el índice no exceda el tamaño de heightMap
        index = Math.min(index, heightMap.length - 1);

        // Añadir la altura correspondiente al arreglo de alturas
        heights.push(heightMap[index]);
    }
    
    return heights;
}
//convertir el mapa a escala de grises
function greyScale(colors){
    let greys = [];
    for (let index = 0; index < colors.length; index++) {
        // Asegúrate de agrupar las sumas antes de dividir
        const avg = Math.floor((colors[index][0] + colors[index][1] + colors[index][2]) / 3);
        const g = [avg, avg, avg];
        greys.push(g);
    }
    console.log(greys); // Imprimir la lista de colores en escala de grises
    return greys; // Devolver la lista de colores en escala de grises
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

function convertirPixelToImg(greyColors, imageWidth, imageHeight) {
    // Define el tamaño de cada píxel para el efecto pixelado
    var pixelSize = 4; // Ajusta este valor según sea necesario

    // Crea el elemento canvas y establece su ancho y alto
    var canvas = document.createElement('canvas');
    canvas.width = imageWidth * pixelSize;
    canvas.height = imageHeight * pixelSize;

    // Obtiene el contexto 2D del canvas y comienza a dibujar
    var ctx = canvas.getContext('2d');

    // Recorre el arreglo de píxeles y dibuja cada uno
    for (var y = 0; y < imageHeight; y++) {
        for (var x = 0; x < imageWidth; x++) {
            // Encuentra el índice del píxel en el arreglo basado en x e y
            var index = (y * imageWidth) + x;

            // Asegúrate de no ir más allá del final del arreglo
            if (index < greyColors.length) {
                // Establece el color basado en los valores del píxel actual
                ctx.fillStyle = `rgb(${greyColors[index][0]}, ${greyColors[index][1]}, ${greyColors[index][2]})`;

                // Dibuja el píxel (aquí, un cuadrado)
                ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            }
        }
    }

    // Convierte el contenido del canvas en una imagen y la retorna
    return canvas.toDataURL('image/png');
}















