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

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }
}
