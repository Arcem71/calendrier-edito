import React from 'react';
import { Check, Plus } from 'lucide-react';
import { ContentItem, Platform } from '../../types';

interface PlatformsCellProps {
  item: ContentItem;
  isEditing: boolean;
  onStartEdit: (itemId: string) => void;
  onTogglePlatform: (item: ContentItem, platform: Platform) => void;
}

const platformOptions: Platform[] = ['Instagram', 'Facebook', 'Twitter', 'LinkedIn', 'TikTok', 'YouTube', 'Blog'];

const getPlatformClasses = (platform: Platform): string => {
  const normalizedPlatform = platform.toLowerCase().trim();
  switch (normalizedPlatform) {
    case 'instagram':
      return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
    case 'facebook':
      return 'bg-blue-600 text-white';
    case 'twitter':
      return 'bg-sky-400 text-white';
    case 'linkedin':
      return 'bg-blue-800 text-white';
    case 'tiktok':
      return 'bg-black text-white';
    case 'youtube':
      return 'bg-red-600 text-white';
    case 'blog':
      return 'bg-green-600 text-white';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const PlatformsCell: React.FC<PlatformsCellProps> = ({
  item,
  isEditing,
  onStartEdit,
  onTogglePlatform
}) => {
  const hasPlatforms = item.platforms && item.platforms.length > 0;

  if (isEditing) {
    return (
      <div className="relative">
        <div className="flex flex-wrap gap-1">
          {platformOptions.map((platform) => (
            <button
              key={platform}
              onClick={() => onTogglePlatform(item, platform)}
              className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-all duration-200 hover:scale-105 ${
                item.platforms.includes(platform)
                  ? getPlatformClasses(platform)
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {platform}
              {item.platforms.includes(platform) && (
                <Check className="w-3 h-3" />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onStartEdit(item.id)}
      className="cursor-pointer group min-h-[40px] flex items-center"
    >
      {hasPlatforms ? (
        <div className="flex flex-wrap gap-1">
          {item.platforms.map((platform) => (
            <span
              key={platform}
              className={`px-2 py-1 rounded-full text-xs font-medium ${getPlatformClasses(
                platform
              )}`}
            >
              {platform}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-gray-400 group-hover:text-blue-500 transition-colors duration-200">
          <Plus className="w-4 h-4" />
          <span className="text-sm">Ajouter des plateformes</span>
        </div>
      )}
    </div>
  );
};