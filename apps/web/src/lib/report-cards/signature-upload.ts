export type SignatureUploadPreview = { file: File; url: string; width: number; height: number };

export async function inspectSignatureUpload(file: File): Promise<SignatureUploadPreview> {
  if (!["image/png", "image/jpeg"].includes(file.type)) throw new Error("Choose a PNG or JPEG signature image.");
  if (!file.size || file.size > 2 * 1024 * 1024) throw new Error("Signature images must be non-empty and no larger than 2 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The signature image is damaged or could not be decoded."));
      image.src = url;
    });
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (width < 300 || height < 80 || width > 1600 || height > 600) {
      throw new Error("Use an image 300–1600 pixels wide and 80–600 pixels high. A cropped 600 × 200 image is recommended.");
    }
    if (width / height < 2 || width / height > 6) {
      throw new Error("Crop closely around the signature in landscape: 2–6 times wider than it is tall. Do not upload a photograph of the whole page.");
    }
    return { file, url, width, height };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
