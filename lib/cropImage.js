const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous"); // needed to avoid cross-origin issues on CodeSandbox
    image.src = url;
  });

function getRadianAngle(degreeValue) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * This function was adapted from the one in the ReadMe of https://github.com/DominicTobias/react-image-crop
 * @param {File} image - Image File url
 * @param {Object} pixelCrop - pixelCrop Object provided by react-easy-crop
 * @param {number} rotation - optional rotation parameter
 */
export default async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  // set each dimensions to double largest dimension to allow for a safe area for the
  // image to rotate in without being clipped by canvas context
  canvas.width = safeArea;
  canvas.height = safeArea;

  // translate canvas context to a central location on image to allow rotating around the center.
  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.translate(-safeArea / 2, -safeArea / 2);

  // draw rotated image and store data.
  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );
  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  // set canvas width to final desired crop size - this will clear existing context
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // paste generated rotate image with correct offsets for x,y crop values.
  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  );

  // As Base64 string
  // return canvas.toDataURL('image/jpeg');

  // As a blob
  return new Promise((resolve) => {
    canvas.toBlob((file) => {
      resolve(URL.createObjectURL(file));
    }, "image/jpeg");
  });
}

export async function rotateImage(imageUrl, angle) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Establecer el tamaño del canvas según la imagen
      if (angle % 180 === 0) {
        canvas.width = img.width;
        canvas.height = img.height;
      } else {
        canvas.width = img.height;
        canvas.height = img.width;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = (error) => {
      reject(error);
    };
  });
}

export function flipImage(imageSrc, flipHorizontal, flipVertical) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");

      // Guarda el contexto actual del canvas
      ctx.save();

      // Translada y escala para aplicar el flip
      ctx.translate(
        flipHorizontal ? image.width : 0,
        flipVertical ? image.height : 0
      );
      ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);

      // Dibuja la imagen en el canvas
      ctx.drawImage(image, 0, 0);

      // Restaura el contexto original
      ctx.restore();

      // Obtiene la imagen en formato base64
      const dataURL = canvas.toDataURL();
      resolve(dataURL);
    };

    image.onerror = (err) => {
      reject(new Error("Error al cargar la imagen: " + err.toString()));
    };
  });
}

export function adjustHSL(imageSrc, deltaH, deltaS, deltaL) {
  console.log(deltaH, deltaS, deltaL);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      let canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      let ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);

      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        let hsl = rgbToHsl(r, g, b);
        hsl[0] = ((hsl[0] * 360 + deltaH) % 360) / 360; // Adjust hue
        hsl[1] = Math.max(0, Math.min(1, hsl[1] + deltaS)); // Adjust saturation
        hsl[2] = Math.max(0, Math.min(1, hsl[2] + deltaL)); // Adjust lightness

        let rgb = hslToRgb(...hsl);
        data[i] = rgb[0];
        data[i + 1] = rgb[1];
        data[i + 2] = rgb[2];
      }

      ctx.putImageData(imageData, 0, 0);

      // Convertir el canvas en una imagen
      //let resultImage = new Image();
      //resultImage.src = canvas.toDataURL();
      resolve(canvas.toDataURL());
    };

    image.onerror = () => {
      reject(new Error("Error loading the image."));
    };
  });

  function rgbToHsl(r, g, b) {
    (r /= 255), (g /= 255), (b /= 255);

    let max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // Achromatic
    } else {
      let delta = max - min;
      s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
      switch (max) {
        case r:
          h = (g - b) / delta + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / delta + 2;
          break;
        case b:
          h = (r - g) / delta + 4;
          break;
      }
      h /= 6;
    }

    return [h, s, l];
  }

  function hslToRgb(h, s, l) {
    let r, g, b;

    if (s === 0) {
      r = g = b = l; // Achromatic
    } else {
      let hue2rgb = function hue2rgb(p, q, t) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      let p = 2 * l - q;

      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
}

export function adjustContrast(imageSrc, contrast) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = image.width;
      canvas.height = image.height;

      ctx.drawImage(image, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

      for (let i = 0; i < data.length; i += 4) {
        data[i] = factor * (data[i] - 128) + 128; // Red channel
        data[i + 1] = factor * (data[i + 1] - 128) + 128; // Green channel
        data[i + 2] = factor * (data[i + 2] - 128) + 128; // Blue channel
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL());
    };

    image.onerror = (error) => {
      reject(error);
    };
  });
}
