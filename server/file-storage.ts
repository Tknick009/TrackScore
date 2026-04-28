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
   * Default colors for when extraction fails or produces invalid results
   */
  private defaultColors = {
    primaryColor: "#0066CC",
    secondaryColor: "#003366",
    accentColor: "#FFD700",
    textColor: "#FFFFFF",
  };

  /**
   * Clamp a number between 0 and 255
   */
  private clamp(value: number): number {
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  /**
   * Convert RGB values to valid #RRGGBB hex string
   */
  private rgbToHex(r: number, g: number, b: number): string {
    const cr = this.clamp(r);
    const cg = this.clamp(g);
    const cb = this.clamp(b);
    return `#${cr.toString(16).padStart(2, '0').toUpperCase()}${cg.toString(16).padStart(2, '0').toUpperCase()}${cb.toString(16).padStart(2, '0').toUpperCase()}`;
  }

  /**
   * Validate that a string is a valid #RRGGBB hex color
   */
  private isValidHexColor(color: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(color);
  }

  /**
   * Extract dominant colors from an image buffer to generate a color scheme
   * Uses sharp's stats() method for reliable color extraction
   * Returns primary, secondary, accent, and text colors - always valid #RRGGBB format
   */
  async extractColorsFromImage(buffer: Buffer): Promise<{
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    textColor: string;
  }> {
    try {
      const image = sharp(buffer);
      
      // Get image statistics which includes dominant channel values
      const stats = await image.stats();
      
      // Get RGB channels (handle different channel counts)
      const rChannel = stats.channels[0];
      const gChannel = stats.channels[1] || stats.channels[0];
      const bChannel = stats.channels[2] || stats.channels[0];
      
      if (!rChannel || !gChannel || !bChannel) {
        console.warn("Could not extract color channels, using defaults");
        return this.defaultColors;
      }
      
      // Use the mean values as the primary color base
      const meanR = rChannel.mean;
      const meanG = gChannel.mean;
      const meanB = bChannel.mean;
      
      // Calculate saturation and brightness of the mean color
      const max = Math.max(meanR, meanG, meanB);
      const min = Math.min(meanR, meanG, meanB);
      const brightness = (meanR + meanG + meanB) / 3;
      const saturation = max === 0 ? 0 : (max - min) / max;
      
      let primaryR: number, primaryG: number, primaryB: number;
      
      // If the mean color is too neutral (low saturation), try to enhance it
      if (saturation < 0.15 && brightness > 40 && brightness < 200) {
        // Use the channel with highest deviation as the "feature" color
        const deviations = [
          { channel: 'r', dev: rChannel.stdev, mean: meanR },
          { channel: 'g', dev: gChannel.stdev, mean: meanG },
          { channel: 'b', dev: bChannel.stdev, mean: meanB },
        ].sort((a, b) => b.dev - a.dev);
        
        // Boost the most varying channel
        const boost = 1.3;
        primaryR = deviations[0].channel === 'r' ? meanR * boost : meanR * 0.8;
        primaryG = deviations[0].channel === 'g' ? meanG * boost : meanG * 0.8;
        primaryB = deviations[0].channel === 'b' ? meanB * boost : meanB * 0.8;
      } else {
        primaryR = meanR;
        primaryG = meanG;
        primaryB = meanB;
      }
      
      // If color is too dark or too light, adjust it
      const primaryBrightness = (primaryR + primaryG + primaryB) / 3;
      if (primaryBrightness < 50) {
        // Too dark - brighten
        const factor = 50 / Math.max(primaryBrightness, 1);
        primaryR = Math.min(255, primaryR * factor);
        primaryG = Math.min(255, primaryG * factor);
        primaryB = Math.min(255, primaryB * factor);
      } else if (primaryBrightness > 200) {
        // Too light - darken
        const factor = 180 / primaryBrightness;
        primaryR *= factor;
        primaryG *= factor;
        primaryB *= factor;
      }
      
      // Create secondary color (darker version for gradients)
      const secondaryR = primaryR * 0.4;
      const secondaryG = primaryG * 0.4;
      const secondaryB = primaryB * 0.4;
      
      // Create accent color - try to find a contrasting vibrant color
      // Use the channel with max variance, boosted
      let accentR: number, accentG: number, accentB: number;
      
      if (rChannel.stdev > gChannel.stdev && rChannel.stdev > bChannel.stdev) {
        // Red is most varied - use warm accent
        accentR = 255;
        accentG = 180;
        accentB = 50;
      } else if (gChannel.stdev > bChannel.stdev) {
        // Green is most varied - use complementary
        accentR = 50;
        accentG = 200;
        accentB = 100;
      } else {
        // Blue or neutral - use gold for contrast
        accentR = 255;
        accentG = 215;
        accentB = 0;
      }
      
      // Generate hex colors with validation
      const primaryColor = this.rgbToHex(primaryR, primaryG, primaryB);
      const secondaryColor = this.rgbToHex(secondaryR, secondaryG, secondaryB);
      const accentColor = this.rgbToHex(accentR, accentG, accentB);
      const textColor = "#FFFFFF"; // White text for dark display backgrounds
      
      // Final validation - ensure all colors are valid hex
      const result = {
        primaryColor: this.isValidHexColor(primaryColor) ? primaryColor : this.defaultColors.primaryColor,
        secondaryColor: this.isValidHexColor(secondaryColor) ? secondaryColor : this.defaultColors.secondaryColor,
        accentColor: this.isValidHexColor(accentColor) ? accentColor : this.defaultColors.accentColor,
        textColor: this.isValidHexColor(textColor) ? textColor : this.defaultColors.textColor,
      };
      
      console.log("Extracted colors:", result);
      return result;
    } catch (error) {
      console.error("Error extracting colors from image:", error);
      return this.defaultColors;
    }
  }
}
