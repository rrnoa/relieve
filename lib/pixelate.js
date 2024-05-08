import kmeans from "./kmeans";

export default function pixelateImg(croppedImageSrc, xBlocks, yBlocks) {
  // Set canvas size
  return new Promise((resolve, reject) => {
    const croppedImage = new Image();
    croppedImage.src = croppedImageSrc;

    croppedImage.onload = () => {
      let ctxSettings = {
        willReadFrequently: true,
        mozImageSmoothingEnabled: false,
        webkitImageSmoothingEnabled: false,
        imageSmoothingEnabled: false,
      };

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", ctxSettings);

      let croppedWidth = croppedImage.width;
      let croppedHeight = croppedImage.height;

      console.log(croppedImage.width,croppedImage.height)
      let ratio = croppedWidth / croppedHeight;

      let canvasWidth = 450;
      let canvasHeight = 450;

      //este es el tamaño del bloque en pixeles
      //xBlocks va a depender del tamaño en "pulgadas" que se seleccionó en la interfaz puede ser (1,2,3)
      //si pulgas es igual a 2, xBlockc va a ser la mitad los bloque cuando había 1 pulgada
      // xBlockSize seria el tamaño en píxeles de la base(cuadrada) del bloque que se va a pintar

      let xBlockSize = Math.max(Math.floor(canvasWidth / xBlocks), 1);
      let yBlockSize = Math.max(Math.floor(canvasHeight / yBlocks), 1);      

      let width = xBlockSize * xBlocks;
      let height = yBlockSize * yBlocks;
      canvas.width = width;
      canvas.height = height;

      // Draw initial image (en el canvas que esta oculto se dibuja la image con crop)
      ctx.drawImage(
        croppedImage,
        0,
        0,
        croppedImage.width,
        croppedImage.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
      let allColors = [];
      // Get image data in form of array of pixels (RGBA) not array of arrays
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const imData = imageData.data;
      // Calculate average color of each block
      for (let y = 0; y < height; y += yBlockSize) {
        for (let x = 0; x < width; x += xBlockSize) {
          let red = 0;
          let green = 0;
          let blue = 0;
          let alpha = 0;
          let numPixels = 0;

          for (let dy = 0; dy < yBlockSize; dy++) {
            for (let dx = 0; dx < xBlockSize; dx++) {
              if (x + dx < width && y + dy < height) {
                let offset = 4 * ((y + dy) * width + (x + dx));
                let redValue = imData[offset];
                let greenValue = imData[offset + 1];
                let blueValue = imData[offset + 2];
                let alphaValue = imData[offset + 3];

                if (alphaValue === 0) {
                  continue;
                }
                red += redValue;
                green += greenValue;
                blue += blueValue;
                alpha += alphaValue;
                numPixels++;
              }
            }
          }

          if (numPixels != 0) {
            red = Math.floor(red / numPixels);
            green = Math.floor(green / numPixels);
            blue = Math.floor(blue / numPixels);
            alpha = Math.floor(alpha / numPixels);
          } else {
            red = 0;
            green = 0;
            blue = 0;
            alpha = 0;
          }
          // Add color to array
          allColors.push([red, green, blue]);
        }
      }
      // Cluster colors using kmeans
      let kmeansResult = kmeans(allColors, 30);
      //let colorPalette = [];
      let i = 0;
      // Replace colors with cluster centroids
      for (let y = 0; y < height; y += yBlockSize) {
        let newColor;
        for (let x = 0; x < width; x += xBlockSize) {
          let color = allColors[i];
          let clusterFound = false;
          for (let cluster of kmeansResult.clusters) {
            for (let point of cluster.points) {
              if (point === color) {
                newColor = cluster.centroid;

                newColor[0] = Math.floor(newColor[0]);
                newColor[1] = Math.floor(newColor[1]);
                newColor[2] = Math.floor(newColor[2]);

                allColors[i] = newColor;

                clusterFound = true;
                break;
              }
            }
            if (clusterFound) {
              break;
            }
          }
          //Set color for the entire block
          ctx.clearRect(x, y, xBlockSize, yBlockSize);
          color =
            "rgb(" + newColor[0] + "," + newColor[1] + "," + newColor[2] + ")";
          ctx.fillStyle = color;
          ctx.fillRect(x, y, xBlockSize, yBlockSize);
          i++;
        }
      }

      // change color for similar in palette
      //convertPalette(xBlockSize, yBlockSize);
      // Create a dictionary of colors and their counts
      //countColors(allColors);

      //Display image and set download link
      resolve({
        imageURL: canvas.toDataURL(),
        allColors: allColors,
      });
    };
    croppedImage.onerror = (error) => {
      reject(error);
    };
  });
}
