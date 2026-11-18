const DEFAULT_MAX_DIMENSION = 800;
const WEBP_QUALITY = 0.75;

/**
 * Redimensiona uma imagem selecionada para largura/altura máxima configurável
 * (padrão 800px para produtos, 400px para logo) usando HTML5 <canvas> e converte para Blob image/webp (0.75).
 */
export async function compressImage(
  file: File,
  maxDimension: number = DEFAULT_MAX_DIMENSION
): Promise<Blob> {
  const imageBitmap = await loadImage(file);

  let { width, height } = imageBitmap;
  if (width > maxDimension || height > maxDimension) {
    if (width >= height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Não foi possível inicializar o contexto 2D do canvas.');
  }

  ctx.drawImage(imageBitmap, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Falha ao comprimir imagem para WebP.'));
          return;
        }
        resolve(blob);
      },
      'image/webp',
      WEBP_QUALITY
    );
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível carregar a imagem selecionada.'));
    };
    img.src = url;
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Erro ao ler imagem comprimida.'));
    reader.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}
