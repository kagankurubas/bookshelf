// Scales an image blob down to maxWidth (keeping its aspect ratio) as a JPEG.
// Images already that narrow are returned unchanged; never scales up.
export async function resizeImageBlob(blob, maxWidth) {
  const bitmap = await createImageBitmap(blob);
  try {
    if (bitmap.width <= maxWidth) return blob;
    const height = Math.round((bitmap.height * maxWidth) / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = maxWidth;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, maxWidth, height);
    return await new Promise((resolve, reject) => {
      canvas.toBlob((resized) => (resized ? resolve(resized) : reject(new Error('canvas.toBlob returned null'))), 'image/jpeg', 0.85);
    });
  } finally {
    bitmap.close();
  }
}
