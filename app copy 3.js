import pixelateImg from "./lib/pixelate";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const fileInput = document.getElementById('fileInput');
const fileInputMap = document.getElementById('fileInputMap');
const fileInputBordes = document.getElementById('fileInputBordes');
let originalImageURL;
let depthMapURL;
let borderURL;
const blockSizeInInches = 0.5;
let aspect;            
let xBlocks ;
let yBlocks;
let allColors;
let greyDepthPixels;
let greyDepthImg;
let allColorsDepth;
let pixelesOscuros;
let scaledDepthMap;
let borderPixels = [];

let scene, camera, renderer, controls;
let light1,light2,light3;

let colorHeightMap;



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

fileInputBordes.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            borderURL = event.target.result;
            processBorderImage();
        }
        reader.readAsDataURL(file);
    }
});

function processBorderImage() {
    const img = new Image();
    img.src = borderURL;
    img.onload = async function() {
        const imgContainer = document.getElementById('outputBorder');
            imgContainer.innerHTML = '<img src="' + borderURL + '" style="width:300px; max-height: 300px">';

            xBlocks = 100;
            yBlocks = 100;
          
            
            let blockSize = Math.max(Math.floor(img.width / xBlocks), 1);
            let width = blockSize * xBlocks;
            let height = blockSize * yBlocks;

            console.log(width, height);

            const resultCanvas = document.createElement("canvas");
            resultCanvas.width = width;  // Asegúrate de que el ancho sea el adecuado
            resultCanvas.height = height;  // Asegúrate de que la altura sea la adecuada
            const resultCtx = resultCanvas.getContext("2d");
            resultCtx.drawImage(
                img,
                0,
                0,
                img.width,
                img.height,
                0,
                0,
                resultCanvas.width,
                resultCanvas.height
              );

              let imageData = resultCtx.getImageData(0, 0, resultCanvas.width, resultCanvas.height);
              const imData = imageData.data;

            for (let y = 0; y < height; y += blockSize) {
                for (let x = 0; x < width; x += blockSize) {
                    let foundBlack = false;
                    for (let i = 0; i < blockSize; i++) {
                        for (let j = 0; j < blockSize; j++) {
                            const index = ((y + i) * width + (x + j)) * 4;
                            if (imData[index] < 128) { // Asumimos un umbral para considerar "negro"
                                foundBlack = true;
                            }
                            if (foundBlack) break;
                        }
                        if (foundBlack) break;
                    }
                    borderPixels.push(foundBlack ? 1 : 0);
                    resultCtx.fillStyle = foundBlack ? 'black' : 'white';
                    resultCtx.fillRect(
                            Math.floor(x / blockSize) * blockSize,
                            Math.floor(y / blockSize) * blockSize,
                            blockSize,
                            blockSize
                        );
                }
            }

    console.log("borderPixels", borderPixels)
    const pixelatedContainer = document.getElementById('outputPixelBorder');
    pixelatedContainer.innerHTML = '<img src="' + resultCanvas.toDataURL() + '" style="width:300px; max-height: 300px">';

            
    }

}

function processOriginalImage() {
    const img = new Image();
    img.src = originalImageURL;
    img.onload = async function() {
        const imgContainer = document.getElementById('output');
            imgContainer.innerHTML = '<img src="' + originalImageURL + '" style="width:300px; max-height: 300px">';            
          
        
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

       
        const greyDepthImg = convertirPixelToImg(greyDepthPixels, xBlocks, yBlocks);
        //esto espara poder dibujarlo en una <img>
        const conv = convertColorArray(scaledDepthMap);
        const greyDepthImgScaled = convertirPixelToImg(conv, xBlocks, yBlocks);
        
        const pixelatedDepthContainer = document.getElementById('pixelatedMap');
        pixelatedDepthContainer.innerHTML = '<img src="' + greyDepthImg + '">';

        const pixelatedDepthScaledContainer = document.getElementById('pixelatedMapScaled');
        pixelatedDepthScaledContainer.innerHTML = '<img src="' + greyDepthImgScaled + '">';

        colorHeightMap = ponderacionAltura();

        //const pixelsOriginal = [...allColors];
        //pixelesOscuros = applyDepthToPixels(pixelsOriginal, allColorsDepth);
        //heights = calculateHeightsFromPixels(pixelesOscuros);
        //alturasAvg();
        //alturas();//calcular las alturas basado en la luminocidad
        //applyGaussianFilter(heights, xBlocks, yBlocks);
        initThreeJS()//iniciar escena
        //paint3d();//pintar los bloques a color
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
	renderer.shadowMap.enabled = true;
    //renderer.shadowMap.renderReverseSided = false;
    document.getElementById('scene').appendChild(renderer.domElement);
    let directionalLight = new THREE.DirectionalLight({intensity: 1});
    directionalLight.castShadow = true;
    directionalLight.position.x = 1.5;
    directionalLight.position.y = 10;
    directionalLight.position.z = 20;
    directionalLight.shadow.camera.far = 40;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.left = -20 ;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.bottom = -20;
    let shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
    const helper = new THREE.DirectionalLightHelper( directionalLight, 5 );
    
    scene.add( helper );
    
    scene.add(shadowHelper);


    let ambientLight = new THREE.AmbientLight({intensity: 1});
    scene.add(directionalLight);
    scene.add(ambientLight);

    controls = new OrbitControls(camera, renderer.domElement);
    //light1 = addShadowedLight( 0, -2, 2, 0xffffff, 2 );
	//light2 = addShadowedLight( -1, 1, 1, 0xffffff, 1.8 );
	//light3 = addShadowedLight( 1, 1, 0.5, 0xffffff, 1.6 );
}

function paint3d(){

    console.log(colorHeightMap.length);
    console.log(borderPixels.length);

    for(let i = 0; i < xBlocks; i++) {
        for(let j = 0; j < yBlocks; j++) {

            const height = borderPixels[j * xBlocks + i] == 1? colorHeightMap[j * xBlocks + i] - 0.5 : colorHeightMap[j * xBlocks + i];
            const color = `rgb(${allColors[j * xBlocks + i].join(",")})`;
                        
            const geometry = new THREE.BoxGeometry(blockSizeInInches, blockSizeInInches, height);                    
            //const geometry = new THREE.BoxGeometry(blockSizeInInches, blockSizeInInches, 1);                    
            const material = new THREE.MeshStandardMaterial({ color: color });
            const cube = new THREE.Mesh(geometry, material);
            cube.castShadow = true;
            cube.receiveShadow = true;
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

function pixelateImage(sourceImage, pixelSize, callback) {
    const img = new Image();
    img.src = sourceImage;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;

        // Dibujar la imagen en una resolución reducida
        ctx.drawImage(img, 0, 0, img.width / pixelSize, img.height / pixelSize);

        // Escalar de nuevo a la dimensión original
        ctx.drawImage(canvas, 0, 0, img.width / pixelSize, img.height / pixelSize, 0, 0, img.width, img.height);

        // Extraer los datos de píxeles
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = [];
        for (let i = 0; i < imageData.data.length; i += 4) {
            // Obtener solo los valores RGB de cada píxel
            pixels.push({
                r: imageData.data[i],
                g: imageData.data[i + 1],
                b: imageData.data[i + 2]
            });
        }
        callback(pixels, canvas.toDataURL());
    };
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


//Normalizar el mapa de profundidad que ya esta pixelado y en escala de grises
function normalizarMapaProfundidad(greyDepthPixels){

    const pixels = [...greyDepthPixels]; // ahora es una copia superficial del arreglo original

    let valorMinimo = 255;
    let valorMaximo = 0;

    // Encuentra los valores máximo y mínimo
    pixels.forEach(pixel => {
        let valor = pixel[0]; // Solo se necesita un valor ya que r = g = b
        if(valor < valorMinimo) valorMinimo = valor;
        if(valor > valorMaximo) valorMaximo = valor;
    });

    // Normaliza los valores
    let pixelsNormalizados = pixels.map(pixel => {
        let valor = pixel[0];
        let valorNormalizado = (valor - valorMinimo) / (valorMaximo - valorMinimo);
        return [valorNormalizado, valorNormalizado, valorNormalizado];
    });

    // Aquí puedes optar por imprimir los valores antes y después de la normalización para depuración 
    console.log("pixelsNormalizados",pixelsNormalizados)


    return pixelsNormalizados;
}


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
    return greys; // Devolver la lista de colores en escala de grises
}


//const discreteHeightsInInches = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const discreteHeightsInInches = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];

function applyGaussianFilter(heights, width, height) {
    //const discreteHeightsInInches = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
    //const discreteHeightsInInches = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

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


//determinar alturas aplicando ponderacion de color


function ponderacionAltura(){
   // Mapa de alturas convertido
   console.log(greyDepthPixels);
   let alturaMap = greyDepthPixels.map(depthValue => {
    // Escala el valor normalizado al rango de índices para 'alturas'
    let index = depthValue[0];
    // Retorna el valor correspondiente del array 'alturas'
    return index;
});

console.log("alturaMap con valores discretos", alturaMap);
return alturaMap;

}


// Función para redondear a la altura discreta más cercana
function redondearAltura(valor) {
  return alturasPosibles.reduce((prev, curr) => 
    (Math.abs(curr - valor) < Math.abs(prev - valor) ? curr : prev));
}

// Función para calcular la luminosidad de un color y ajustar la altura
function ajustarPorLuminosidad(color, alturaNormalizada) {
    let luminosidad = 0.21 * color[0] + 0.72 * color[1] + 0.07 * color[2];
    let peso = luminosidad / 255; // Escala la luminosidad a un rango de 0 a 1
    //llevar la luminosidad a una escala de 1 a 10
    let s = peso * 5;
    //let alturaPonderada = alturaNormalizada * peso;
    let alturaPonderada = alturaNormalizada + s;
    //alturaPonderada = Math.max(alturaPonderada, alturaNormalizada);

    return alturaPonderada;
}

function sobelFilter(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const sobelData = [];
    const grayscaleData = convertToGrayscale(imageData); // Necesitas implementar esta función
  
    // Los kernels del filtro Sobel
    const xKernel = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ];
    const yKernel = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ];
  
    // Aplicar el filtro Sobel
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let pixelX = applyKernel(grayscaleData, xKernel, width, x, y); // Necesitas implementar esta función
        let pixelY = applyKernel(grayscaleData, yKernel, width, x, y); // Necesitas implementar esta función
  
        let magnitude = Math.sqrt(pixelX * pixelX + pixelY * pixelY);
        sobelData.push(magnitude);
      }
    }
  
    // Normalizar la magnitud del gradiente si es necesario
    // ...
  
    return sobelData;
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

function convertColorArray(colorsArray) {
    let converted = [];
    for (let index = 0; index < colorsArray.length; index++) {
        let red = Math.round(colorsArray[index][0] * 255);
        let green = Math.round(colorsArray[index][1] * 255);
        let blue = Math.round(colorsArray[index][2] * 255);
        converted[index] = [red,green,blue];
        
    }
    return converted;

}

function convertirPixelToImg(greyColors, imageWidth, imageHeight) {
    // Define el tamaño de cada píxel para el efecto pixelado
    var pixelSize = 5; // Ajusta este valor según sea necesario

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















