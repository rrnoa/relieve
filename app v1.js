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


            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, img.width, img.height);

            const aspect = img.width / img.height;
            
            const xBlocks = 100;
            const yBlocks = Math.floor(xBlocks/aspect);

            console.log(xBlocks,yBlocks);

            const {imageURL, allColors} = await pixelateImg(canvas.toDataURL(), xBlocks, yBlocks);
            
            const pixelatedContainer = document.getElementById('pixelated');
            pixelatedContainer.innerHTML = '<img src="' + imageURL + '">';


            // Lógica para asignar alturas
            const heights = allColors.map(color => {
                const luminosity = 0.3 * color[0] + 0.59 * color[1] + 0.11 * color[2];
                return 2 + (8 * (luminosity / 255));  // Valores desde 2 hasta 10 basados en luminosidad

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
            for(let i = 0; i < xBlocks; i++) {
                for(let j = 0; j < yBlocks; j++) {
                    const geometry = new THREE.BoxGeometry(1, 1, -heights[j * xBlocks + i]);                    
                    const material = new THREE.MeshBasicMaterial({ color: `rgb(${allColors[j * xBlocks + i].join(",")})` });
                    const cube = new THREE.Mesh(geometry, material);
                    cube.position.set(i - xBlocks/2, (yBlocks - j - 1) - yBlocks/2, (heights[j * xBlocks + i] / 2 - 5));
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

function applyGaussianFilter(heights, width, height) {
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
            
            // Calcular el valor filtrado y discretizarlo en el rango 1-10.
            const filteredValue = totalHeight / kernelSum;
            const discretizedValue = Math.round(filteredValue);
            const clippedValue = Math.min(Math.max(discretizedValue, 1), 10);  // Asegura que el valor esté entre 1 y 10.

            const currentIndex = j * width + i;
            heights[currentIndex] = clippedValue;
        }
    }
}
