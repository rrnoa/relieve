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
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 400, 400);
            //gaussianBlur(ctx, 0, 0, 400, 400); // Agrega esta línea aquí
            const {imageURL, allColors} = await pixelateImg(canvas.toDataURL(), 50, 50);
            
            const pixelatedContainer = document.getElementById('pixelated');
            pixelatedContainer.innerHTML = '<img src="' + imageURL + '">';

            // Detección del color de fondo
            const bgColor = detectBackgroundColor(allColors, 50, 50);

            // Lógica para asignar alturas
            const heights = allColors.map(color => {
                if (isSimilarColor(color, bgColor)) {
                    return 1;  // La menor altura posible
                } else {
                    const luminosity = 0.3 * color[0] + 0.59 * color[1] + 0.11 * color[2];
                    return 2 + (8 * (luminosity / 255));  // Valores desde 2 hasta 10 basados en luminosidad
                }
            });

            // Establece todos los píxeles en el borde de la imagen a 0.
            for (let i = 0; i < canvas.width; i++) {
                heights[i] = 0;  // Borde superior
                heights[i + (canvas.height - 1) * canvas.width] = 0;  // Borde inferior
            }
            for (let j = 0; j < canvas.height; j++) {
                heights[j * canvas.width] = 0;  // Borde izquierdo
                heights[j * canvas.width + canvas.width - 1] = 0;  // Borde derecho
            }

            //smoothHeights(heights, 50, 50);
            applyGaussianFilter(heights, 50, 50);
            applyGaussianFilter(heights, 50, 50);

            // Una vez que el filtro se ha aplicado, vuelves a establecer los píxeles del borde a 0.
            for (let i = 0; i < canvas.width; i++) {
                heights[i] = 0;  // Borde superior
                heights[i + (canvas.height - 1) * canvas.width] = 0;  // Borde inferior
            }
            for (let j = 0; j < canvas.height; j++) {
                heights[j * canvas.width] = 0;  // Borde izquierdo
                heights[j * canvas.width + canvas.width - 1] = 0;  // Borde derecho
}
            

            // Crear el renderizado en Three.js
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer();
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.getElementById('scene').appendChild(renderer.domElement);

            // Crear los bloques con sus alturas determinadas
            for(let i = 0; i < 50; i++) {
                for(let j = 0; j < 50; j++) {
                    const geometry = new THREE.BoxGeometry(1, heights[j * 50 + i], 1);
                    const material = new THREE.MeshBasicMaterial({ color: `rgb(${allColors[j * 50 + i].join(",")})` });
                    const cube = new THREE.Mesh(geometry, material);
                    cube.position.set(i - 25, heights[j * 50 + i] / 2 - 5, j - 25);
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

function smoothHeights(heights, width, height) {
    const originalHeights = [...heights];
    const weights = [
        [0.5, 1, 0.5],
        [1,   2, 1],
        [0.5, 1, 0.5]
    ];

    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            let totalHeight = 0;
            let appliedWeight = 0;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const x = i + dx;
                    const y = j + dy;

                    if (x >= 0 && x < width && y >= 0 && y < height) {
                        const index = y * width + x;
                        totalHeight += originalHeights[index] * weights[dy + 1][dx + 1];
                        appliedWeight += weights[dy + 1][dx + 1];
                    }
                }
            }
            
            const currentIndex = j * width + i;
            heights[currentIndex] = totalHeight / appliedWeight;
        }
    }
}



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
            
            const currentIndex = j * width + i;
            heights[currentIndex] = totalHeight / kernelSum;
        }
    }
}






