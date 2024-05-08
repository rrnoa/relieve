import pixelateImg from "./lib/pixelate";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', function() {
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
        const img = new Image();
        img.onload = async function() {
            // Muestra la imagen original
            const imgContainer = document.getElementById('output');
            imgContainer.innerHTML = '<img src="' + event.target.result + '">';
            
            // Muestra la imagen pixelada
            const canvas = document.createElement('canvas');
            canvas.width = img.width;     // Asigna el ancho de la imagen al canvas
            canvas.height = img.height;   // Asigna el alto de la imagen al canvas

            const blockSizeInInches = 0.5;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, img.width, img.height);

            const aspect = img.width / img.height;
            
            const xBlocks = 50;
            const yBlocks = Math.floor(xBlocks/aspect);


            const {imageURL, allColors} = await pixelateImg(canvas.toDataURL(), xBlocks, yBlocks);
            
            const pixelatedContainer = document.getElementById('pixelated');
            pixelatedContainer.innerHTML = '<img src="' + imageURL + '">';

            //alturas de los bloques
            const discreteHeightsInInches = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];


            // Lógica para asignar alturas
            const heights = allColors.map(color => {
                const luminosity = 0.3 * color[0] + 0.59 * color[1] + 0.11 * color[2];
                const normalizedLuminosity = luminosity / 255;  // Esto te da un valor entre 0 y 1
                const index = Math.round(normalizedLuminosity * (discreteHeightsInInches.length - 1));
                return discreteHeightsInInches[index];
            });

            applyGaussianFilter(heights, xBlocks, yBlocks);
            applyGaussianFilter(heights, xBlocks, yBlocks);            

            // Crear el renderizado en Three.js
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer();
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.getElementById('scene').appendChild(renderer.domElement);

            // Crear los bloques con sus alturas determinadas
            // Crear los bloques con sus alturas determinadas
            for(let i = 0; i < xBlocks; i++) {
                for(let j = 0; j < yBlocks; j++) {
                    const geometry = new THREE.BoxGeometry(blockSizeInInches, blockSizeInInches, -heights[j * xBlocks + i]);                    
                    const material = new THREE.MeshBasicMaterial({ color: `rgb(${allColors[j * xBlocks + i].join(",")})` });
                    const cube = new THREE.Mesh(geometry, material);
                    cube.position.set(i * blockSizeInInches - xBlocks * blockSizeInInches / 2, (yBlocks - j - 1) * blockSizeInInches - yBlocks * blockSizeInInches / 2, (heights[j * xBlocks + i] / 2 - 5));
                    scene.add(cube);
                }
            }

            camera.position.z = 70;

            const controls = new OrbitControls(camera, renderer.domElement);
            controls.update();


            const animate = function () {
                requestAnimationFrame(animate);
                controls.update();
                renderer.render(scene, camera);
            };

            animate();

        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
});

function arraysEqual(a, b) {
    return a.length === b.length && a.every((val, index) => val === b[index]);
}

function detectBackgroundColor(allColors, width, height) {
    // Asume que los bordes tienen el color de fondo.
    const edgeColors = [];
    for (let i = 0; i < width; i++) {
        edgeColors.push(allColors[i]);  // superior
        edgeColors.push(allColors[i + width * (height - 1)]);  // inferior
    }
    for (let j = 0; j < height; j++) {
        edgeColors.push(allColors[j * width]);  // izquierda
        edgeColors.push(allColors[j * width + width - 1]);  // derecha
    }

    return mode(edgeColors);
}

function isSimilarColor(color1, color2, tolerance = 30) {
    const distance = Math.sqrt(
        (color1[0] - color2[0]) ** 2 + 
        (color1[1] - color2[1]) ** 2 + 
        (color1[2] - color2[2]) ** 2
    );
    return distance < tolerance;
}

function mode(arr) {
    return arr.sort((a,b) =>
          arr.filter(v => arraysEqual(v, a)).length
        - arr.filter(v => arraysEqual(v, b)).length
    ).pop();
}

function applyGaussianFilter(heights, width, height) {
    const discreteHeightsInInches = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
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








