import React from 'react';
import { Eye } from 'lucide-react';
import { ContentItem, Platform } from '../../types';

interface PlatformSelectorProps {
  item: ContentItem;
  onPreview: (platform: Platform) => void;
}

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({ item, onPreview }) => {
  
  const availablePlatforms = item.platforms.filter(platform => 
    ['Instagram', 'Facebook', 'LinkedIn'].includes(platform)
  );

  if (availablePlatforms.length === 0) {
    return (
      <button
        disabled
        className="flex items-center gap-1 px-2 py-1 text-gray-400 cursor-not-allowed text-xs"
        title="Aucune plateforme supportée pour la prévisualisation"
      >
        <Eye className="w-4 h-4" />
        <span>Visualisation</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => onPreview(availablePlatforms[0] as Platform)}
      className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:text-blue-800 rounded transition-colors text-xs"
      title="Visualiser le post sur les réseaux sociaux"
    >
      <Eye className="w-4 h-4" />
      <span>Visualisation</span>
    </button>
  );
};