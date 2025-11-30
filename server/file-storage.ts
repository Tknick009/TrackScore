import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const MAX_DIMENSION = 1024;

export class FileStorage {
  private uploadsRoot: string;

  constructor(uploadsRoot: string = 'uploads') {
    this.uploadsRoot = uploadsRoot;
  }

  async saveAthletePhoto(
    buffer: Buffer,
    athleteId: string,
    meetId: string,
    originalName: string
  ): Promise<{
    storageKey: string;
    width: number;
    height: number;
    byteSize: number;
    contentType: string;
  }> {
    const processedImage = await this.processImage(buffer);
    const extension = this.getExtensionFromMimeType(processedImage.contentType);
    const storageKey = `athletes/${meetId}/${athleteId}/photo${extension}`;
    const fullPath = path.join(this.uploadsRoot, storageKey);

    await this.ensureDirectoryExists(path.dirname(fullPath));
    await fs.writeFile(fullPath, processedImage.buffer);

    return {
      storageKey,
      width: processedImage.width,
      height: processedImage.height,
      byteSize: processedImage.byteSize,
      contentType: processedImage.contentType,
    };
  }

  async saveTeamLogo(
    buffer: Buffer,
    teamId: string,
    meetId: string,
    originalName: string
  ): Promise<{
    storageKey: string;
    width: number;
    height: number;
    byteSize: number;
    contentType: string;
  }> {
    const processedImage = await this.processImage(buffer);
    const extension = this.getExtensionFromMimeType(processedImage.contentType);
    const storageKey = `teams/${meetId}/${teamId}/logo${extension}`;
    const fullPath = path.join(this.uploadsRoot, storageKey);

    await this.ensureDirectoryExists(path.dirname(fullPath));
    await fs.writeFile(fullPath, processedImage.buffer);

    return {
      storageKey,
      width: processedImage.width,
      height: processedImage.height,
      byteSize: processedImage.byteSize,
      contentType: processedImage.contentType,
    };
  }

  async saveMeetLogo(
    buffer: Buffer,
    meetId: string,
    originalName: string
  ): Promise<{
    storageKey: string;
    width: number;
    height: number;
    byteSize: number;
    contentType: string;
  }> {
    const processedImage = await this.processImage(buffer);
    const extension = this.getExtensionFromMimeType(processedImage.contentType);
    const storageKey = `meets/${meetId}/logo${extension}`;
    const fullPath = path.join(this.uploadsRoot, storageKey);

    await this.ensureDirectoryExists(path.dirname(fullPath));
    await fs.writeFile(fullPath, processedImage.buffer);

    return {
      storageKey,
      width: processedImage.width,
      height: processedImage.height,
      byteSize: processedImage.byteSize,
      contentType: processedImage.contentType,
    };
  }

  async deleteByKey(storageKey: string): Promise<void> {
    const fullPath = path.join(this.uploadsRoot, storageKey);
    
    try {
      await fs.unlink(fullPath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  publicUrlForKey(storageKey: string): string {
    return `/${this.uploadsRoot}/${storageKey}`;
  }

  private async processImage(buffer: Buffer): Promise<{
    buffer: Buffer;
    width: number;
    height: number;
    byteSize: number;
    contentType: string;
  }> {
    let image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.format) {
      throw new Error('Unable to determine image format');
    }

    const mimeType = this.formatToMimeType(metadata.format);
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(
        `Invalid image type. Only JPEG, PNG, and GIF are allowed. Received: ${mimeType}`
      );
    }

    const width = metadata.width || 0;
    const height = metadata.height || 0;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      image = image.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    image = image.rotate();

    let processedBuffer: Buffer;
    if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
      processedBuffer = await image
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
    } else if (metadata.format === 'png') {
      processedBuffer = await image
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toBuffer();
    } else if (metadata.format === 'gif') {
      processedBuffer = await image.toBuffer();
    } else {
      processedBuffer = await image.toBuffer();
    }

    const processedMetadata = await sharp(processedBuffer).metadata();

    return {
      buffer: processedBuffer,
      width: processedMetadata.width || width,
      height: processedMetadata.height || height,
      byteSize: processedBuffer.length,
      contentType: mimeType,
    };
  }

  private formatToMimeType(format: string): string {
    const formatMap: Record<string, string> = {
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
    };
    return formatMap[format.toLowerCase()] || 'application/octet-stream';
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const extensionMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
    };
    return extensionMap[mimeType] || '.jpg';
  }

  async saveSponsorLogo(
    sponsorId: number,
    file: Express.Multer.File
  ): Promise<{ storageKey: string; publicUrl: string }> {
    const extension = this.getExtensionFromMimeType(this.formatToMimeType(path.extname(file.originalname).slice(1)));
    const storageKey = `sponsors/${sponsorId}/logo${extension}`;
    
    // Process image: resize to 1200x400 (3:1 aspect for banners), optimize
    const processed = await sharp(file.path)
      .resize(1200, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ quality: 90 })
      .toBuffer();
    
    const fullPath = path.join(this.uploadsRoot, storageKey);
    await this.ensureDirectoryExists(path.dirname(fullPath));
    await fs.writeFile(fullPath, processed);
    
    return {
      storageKey,
      publicUrl: this.publicUrlForKey(storageKey)
    };
  }

  async deleteSponsorLogo(storageKey: string): Promise<void> {
    await this.deleteByKey(storageKey);
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Extract dominant colors from an image buffer to generate a color scheme
   * Returns primary, secondary, accent, and text colors
   */
  async extractColorsFromImage(buffer: Buffer): Promise<{
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    textColor: string;
  }> {
    try {
      const image = sharp(buffer);
      
      // Resize to small size for faster color analysis
      const resized = await image.resize(100, 100, { fit: 'cover' }).raw().toBuffer({ resolveWithObject: true });
      
      const { data, info } = resized;
      const pixelCount = info.width * info.height;
      const channels = info.channels;
      
      // Collect color samples
      const colors: { r: number; g: number; b: number; count: number }[] = [];
      const colorMap = new Map<string, { r: number; g: number; b: number; count: number }>();
      
      for (let i = 0; i < data.length; i += channels) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Quantize colors to reduce variations (group similar colors)
        const qr = Math.round(r / 32) * 32;
        const qg = Math.round(g / 32) * 32;
        const qb = Math.round(b / 32) * 32;
        
        const key = `${qr},${qg},${qb}`;
        const existing = colorMap.get(key);
        
        if (existing) {
          existing.count++;
          // Average the actual colors
          existing.r = Math.round((existing.r * (existing.count - 1) + r) / existing.count);
          existing.g = Math.round((existing.g * (existing.count - 1) + g) / existing.count);
          existing.b = Math.round((existing.b * (existing.count - 1) + b) / existing.count);
        } else {
          colorMap.set(key, { r, g, b, count: 1 });
        }
      }
      
      // Sort by frequency
      const sortedColors = Array.from(colorMap.values())
        .filter(c => {
          // Filter out very dark (near black) and very light (near white) colors
          const brightness = (c.r + c.g + c.b) / 3;
          return brightness > 30 && brightness < 225;
        })
        .sort((a, b) => b.count - a.count);
      
      // Get vibrant/saturated colors for accent
      const vibrantColors = sortedColors.filter(c => {
        const max = Math.max(c.r, c.g, c.b);
        const min = Math.min(c.r, c.g, c.b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        return saturation > 0.3;
      });
      
      // Helper to convert RGB to hex
      const toHex = (r: number, g: number, b: number) => 
        `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
      
      // Helper to darken a color
      const darken = (r: number, g: number, b: number, factor: number) => ({
        r: Math.max(0, Math.round(r * factor)),
        g: Math.max(0, Math.round(g * factor)),
        b: Math.max(0, Math.round(b * factor)),
      });
      
      // Primary: Most frequent non-neutral color
      const primary = sortedColors[0] || { r: 0, g: 102, b: 204 };
      
      // Secondary: Darker version of primary for gradients
      const secondaryRgb = darken(primary.r, primary.g, primary.b, 0.5);
      
      // Accent: Most vibrant color, or gold if none found
      const accent = vibrantColors[0] || { r: 255, g: 215, b: 0 };
      
      // Text: White works best on dark backgrounds
      const textColor = "#FFFFFF";
      
      return {
        primaryColor: toHex(primary.r, primary.g, primary.b),
        secondaryColor: toHex(secondaryRgb.r, secondaryRgb.g, secondaryRgb.b),
        accentColor: toHex(accent.r, accent.g, accent.b),
        textColor,
      };
    } catch (error) {
      console.error("Error extracting colors from image:", error);
      // Return default colors if extraction fails
      return {
        primaryColor: "#0066CC",
        secondaryColor: "#003366",
        accentColor: "#FFD700",
        textColor: "#FFFFFF",
      };
    }
  }
}
