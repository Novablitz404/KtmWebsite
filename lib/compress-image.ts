/**
 * Client-side image compression utility.
 * Resizes images to a max dimension and compresses to JPEG/WebP
 * to reduce upload size — critical for mobile cameras (4-12MB originals).
 */

interface CompressOptions {
    /** Max width or height in pixels (default: 1200) */
    maxDimension?: number;
    /** JPEG/WebP quality 0-1 (default: 0.8) */
    quality?: number;
    /** Output MIME type (default: 'image/jpeg') */
    outputType?: 'image/jpeg' | 'image/webp';
    /** Max file size in bytes — if already under this, skip compression (default: 500KB) */
    skipIfUnder?: number;
}

const DEFAULTS: Required<CompressOptions> = {
    maxDimension: 1200,
    quality: 0.8,
    outputType: 'image/jpeg',
    skipIfUnder: 500 * 1024, // 500KB
};

/**
 * Compress an image File on the client using Canvas.
 * Returns a new File with reduced size, or the original if already small enough.
 */
export async function compressImage(
    file: File,
    options?: CompressOptions
): Promise<File> {
    const opts = { ...DEFAULTS, ...options };

    // Skip compression if file is already small
    if (file.size <= opts.skipIfUnder) {
        return file;
    }

    // Load image into an HTMLImageElement
    const img = await loadImage(file);

    // Calculate scaled dimensions
    let { width, height } = img;
    if (width > opts.maxDimension || height > opts.maxDimension) {
        if (width > height) {
            height = Math.round((height / width) * opts.maxDimension);
            width = opts.maxDimension;
        } else {
            width = Math.round((width / height) * opts.maxDimension);
            height = opts.maxDimension;
        }
    }

    // Draw onto canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
            opts.outputType,
            opts.quality
        );
    });

    // Determine extension
    const ext = opts.outputType === 'image/webp' ? '.webp' : '.jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '');

    return new File([blob], `${baseName}${ext}`, { type: opts.outputType });
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
            reject(new Error('Failed to load image'));
        };
        img.src = url;
    });
}
