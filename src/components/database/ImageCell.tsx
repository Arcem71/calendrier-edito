import React, { useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { ImageInfo, ContentItem } from '../../types';
import { ImagePreview } from './ImagePreview';

interface ImageCellProps {
  item: ContentItem;
  onImageUpload: (file: File, itemId: string) => void;
  onImageClick: (images: ImageInfo[], index: number) => void;
  uploading: boolean;
}

export const ImageCell: React.FC<ImageCellProps> = ({
  item,
  onImageUpload,
  onImageClick,
  uploading
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const images = Array.isArray(item.images) ? item.images : [];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2">
        {images.map((image, index) => (
          <img
            key={image.filename}
            src={image.url}
            alt={`Image ${index + 1}`}
            className="w-12 h-12 object-cover rounded cursor-pointer hover:opacity-75 transition-opacity"
            onClick={() => onImageClick(images, index)}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://placehold.co/48x48?text=Error';
            }}
          />
        ))}
      </div>
      
      <label className="cursor-pointer">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onImageUpload(file, item.id);
            }
          }}
          disabled={uploading}
        />
        <div className="flex items-center justify-center w-12 h-8 bg-gray-100 hover:bg-gray-200 rounded border-2 border-dashed border-gray-300 transition-colors">
          {uploading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </label>
    </div>
  );
};