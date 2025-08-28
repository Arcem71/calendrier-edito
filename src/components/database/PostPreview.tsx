import React from 'react';
import { X, Heart, MessageCircle, Share, Send, MoreHorizontal, ThumbsUp, Repeat2, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { ContentItem, Platform } from '../../types';

interface PostPreviewProps {
  item: ContentItem;
  platform: Platform | null;
  onClose: () => void;
  onPlatformChange: (platform: Platform) => void;
}

export const PostPreview: React.FC<PostPreviewProps> = ({ item, platform, onClose, onPlatformChange }) => {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  
  const availablePlatforms = item.platforms.filter(p => 
    ['Instagram', 'Facebook', 'LinkedIn'].includes(p)
  ) as Platform[];
  
  const currentPlatform = platform || availablePlatforms[0];
  
  const handlePlatformChange = (direction: 'prev' | 'next') => {
    const currentIndex = availablePlatforms.indexOf(currentPlatform);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : availablePlatforms.length - 1;
    } else {
      newIndex = currentIndex < availablePlatforms.length - 1 ? currentIndex + 1 : 0;
    }
    
    onPlatformChange(availablePlatforms[newIndex]);
    setCurrentImageIndex(0); // Reset image index when changing platform
  };
  
  const handleImageNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentImageIndex(prev => prev > 0 ? prev - 1 : item.images.length - 1);
    } else {
      setCurrentImageIndex(prev => prev < item.images.length - 1 ? prev + 1 : 0);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "aujourd'hui";
    if (diffDays === 1) return "il y a 1 jour";
    if (diffDays < 7) return `il y a ${diffDays} jours`;
    if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
    return date.toLocaleDateString('fr-FR');
  };

  const renderInstagramPreview = () => (
    <div className="bg-white max-w-md mx-auto rounded-xl overflow-hidden shadow-2xl border border-gray-200">
      {/* Header Instagram */}
      <div className="flex items-center p-4 bg-white">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-full flex items-center justify-center text-white font-bold text-sm ring-2 ring-purple-200">
          A
        </div>
        <div className="ml-3 flex-1">
          <div className="font-semibold text-sm text-gray-900">arcem.assurances</div>
          <div className="text-xs text-gray-500">Assurance • Sponsorisé</div>
        </div>
        <MoreHorizontal className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer" />
      </div>

      {/* Image */}
      {item.images.length > 0 && (
        <div className="bg-gray-100 relative" style={{ aspectRatio: '4/5' }}>
          {/* Image actuelle */}
          <img
            src={item.images[currentImageIndex]?.url}
            alt="Post"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://placehold.co/400x500?text=Image+Instagram';
            }}
          />
          
          {/* Navigation entre images (si plusieurs images) */}
          {item.images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageNavigation('prev');
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageNavigation('next');
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              
              {/* Indicateurs de pagination */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {item.images.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Pas d'image */}
      {item.images.length === 0 && (
        <div className="bg-gray-100 flex items-center justify-center" style={{ aspectRatio: '4/5' }}>
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-2">📷</div>
            <div className="text-sm">Aucune image</div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-5">
            <Heart className="w-7 h-7 text-gray-800 hover:text-red-500 cursor-pointer transition-colors" />
            <MessageCircle className="w-7 h-7 text-gray-800 hover:text-blue-500 cursor-pointer transition-colors" />
            <Send className="w-7 h-7 text-gray-800 hover:text-purple-500 cursor-pointer transition-colors" />
          </div>
          <div className="w-6 h-6 text-gray-800 hover:text-purple-500 cursor-pointer transition-colors">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
            </svg>
          </div>
        </div>

        {/* Likes */}
        <div className="font-semibold text-sm mb-2 text-gray-900">1,234 mentions J'aime</div>

        {/* Caption */}
        <div className="text-sm leading-relaxed">
          <span className="font-semibold text-gray-900">arcem.assurances</span>{' '}
          <span className="whitespace-pre-wrap text-gray-800">{item.description || item.name}</span>
        </div>

        {/* Date */}
        <div className="text-xs text-gray-400 mt-3 uppercase font-medium">
          {formatDate(item.date_brute)}
        </div>
      </div>
    </div>
  );

  const renderFacebookPreview = () => (
    <div className="bg-white max-w-lg mx-auto rounded-xl overflow-hidden shadow-2xl border border-gray-200">
      {/* Header Facebook */}
      <div className="p-5 bg-white">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
            A
          </div>
          <div className="ml-4 flex-1">
            <div className="font-bold text-base text-gray-900">ARCEM Assurances</div>
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <span>{formatDate(item.date_brute)}</span>
              <span>•</span>
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          </div>
          <MoreHorizontal className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer" />
        </div>

        {/* Content */}
        <div className="text-sm mb-4 whitespace-pre-wrap leading-relaxed text-gray-800">
          {item.description || item.name}
        </div>
      </div>

      {/* Image avec carrousel */}
      {item.images.length > 0 && (
        <div className="bg-gray-100 relative">
          {item.images.length === 1 ? (
            <img
              src={item.images[currentImageIndex]?.url}
              alt="Post"
              className="w-full h-auto object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://placehold.co/500x300?text=Image+Facebook';
              }}
            />
          ) : (
            <>
              <img
                src={item.images[currentImageIndex]?.url}
                alt="Post"
                className="w-full h-auto object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://placehold.co/500x300?text=Image+Facebook';
                }}
              />
              
              {/* Navigation entre images */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageNavigation('prev');
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageNavigation('next');
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              
              {/* Indicateurs de pagination */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {item.images.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-5 bg-white border-t border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <span className="text-base">👍❤️😮</span>
            <span className="font-medium">156 personnes</span>
          </div>
          <div className="flex items-center gap-3">
            <span>12 commentaires</span>
            <span>•</span>
            <span>8 partages</span>
          </div>
        </div>
        
        <div className="flex items-center justify-around pt-3 border-t border-gray-100">
          <button className="flex items-center gap-2 px-6 py-3 hover:bg-gray-50 rounded-lg flex-1 justify-center transition-colors">
            <ThumbsUp className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-600">J'aime</span>
          </button>
          <button className="flex items-center gap-2 px-6 py-3 hover:bg-gray-50 rounded-lg flex-1 justify-center transition-colors">
            <MessageCircle className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-600">Commenter</span>
          </button>
          <button className="flex items-center gap-2 px-6 py-3 hover:bg-gray-50 rounded-lg flex-1 justify-center transition-colors">
            <Share className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-600">Partager</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderLinkedInPreview = () => (
    <div className="bg-white max-w-lg mx-auto rounded-xl overflow-hidden shadow-2xl border border-gray-200">
      {/* Header LinkedIn */}
      <div className="p-5 bg-white">
        <div className="flex items-center mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-700 to-blue-800 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
            A
          </div>
          <div className="ml-4 flex-1">
            <div className="font-bold text-base text-gray-900">ARCEM Assurances</div>
            <div className="text-sm text-gray-600">Courtier en assurances • 1er</div>
            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              <span>{formatDate(item.date_brute)}</span>
              <span>•</span>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm0-1A7 7 0 1 1 8 1a7 7 0 0 1 0 14z"/>
              </svg>
            </div>
          </div>
          <MoreHorizontal className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer" />
        </div>

        {/* Content */}
        <div className="text-sm mb-4 whitespace-pre-wrap leading-relaxed text-gray-800">
          {item.description || item.name}
        </div>
      </div>

      {/* Image avec carrousel */}
      {item.images.length > 0 && (
        <div className="bg-gray-100 relative">
          {item.images.length === 1 ? (
            <img
              src={item.images[0].url}
              alt="Post"
              className="w-full h-auto object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://placehold.co/500x300?text=Image+LinkedIn';
              }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-1">
              {item.images.slice(0, 4).map((img, idx) => (
                <div key={idx} className="relative aspect-video">
                  <img
                    src={img.url}
                    alt={`Image ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://placehold.co/250x140?text=Image+LinkedIn';
                    }}
                  />
                  {idx === 3 && item.images.length > 4 && (
                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">+{item.images.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Navigation entre images (si plusieurs images) */}
          {item.images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageNavigation('prev');
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageNavigation('next');
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              
              {/* Indicateurs de pagination */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {item.images.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-5 bg-white border-t border-gray-100">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base">👍❤️💡</span>
            <span className="font-medium">89 réactions</span>
          </div>
          <div className="flex items-center gap-3">
            <span>15 commentaires</span>
            <span>•</span>
            <span>3 partages</span>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-1 pt-3 border-t border-gray-100">
          <button className="flex flex-col items-center gap-1 px-3 py-3 hover:bg-gray-50 rounded-lg transition-colors">
            <ThumbsUp className="w-5 h-5 text-gray-600" />
            <span className="text-xs font-medium text-gray-600">J'aime</span>
          </button>
          <button className="flex flex-col items-center gap-1 px-3 py-3 hover:bg-gray-50 rounded-lg transition-colors">
            <MessageCircle className="w-5 h-5 text-gray-600" />
            <span className="text-xs font-medium text-gray-600">Commenter</span>
          </button>
          <button className="flex flex-col items-center gap-1 px-3 py-3 hover:bg-gray-50 rounded-lg transition-colors">
            <Repeat2 className="w-5 h-5 text-gray-600" />
            <span className="text-xs font-medium text-gray-600">Republier</span>
          </button>
          <button className="flex flex-col items-center gap-1 px-3 py-3 hover:bg-gray-50 rounded-lg transition-colors">
            <Send className="w-5 h-5 text-gray-600" />
            <span className="text-xs font-medium text-gray-600">Envoyer</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderPreview = () => {
    switch (currentPlatform.toLowerCase()) {
      case 'instagram':
        return renderInstagramPreview();
      case 'facebook':
        return renderFacebookPreview();
      case 'linkedin':
        return renderLinkedInPreview();
      default:
        return (
          <div className="bg-white max-w-md mx-auto rounded-lg p-8 text-center">
            <div className="text-gray-500 mb-4">
              Prévisualisation non disponible pour {currentPlatform}
            </div>
            <div className="text-sm text-gray-400">
              Cette plateforme n'est pas encore supportée pour la prévisualisation
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 bg-opacity-95 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-4xl max-h-[95vh] bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header moderne */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-white bg-opacity-20 backdrop-blur-sm rounded-full text-white hover:bg-opacity-30 transition-all duration-200 hover:scale-105"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Eye className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-white text-xl font-bold">
                Prévisualisation
              </h3>
            </div>
            
            {/* Platform Selector */}
            {availablePlatforms.length > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlatformChange('prev');
                  }}
                  className="p-2 bg-white bg-opacity-20 backdrop-blur-sm rounded-full text-white hover:bg-opacity-30 transition-all duration-200 hover:scale-105"
                  title="Plateforme précédente"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex gap-2">
                  {availablePlatforms.map((platform) => (
                    <button
                      key={platform}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlatformChange(platform as Platform);
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        platform === currentPlatform
                          ? 'bg-white text-gray-900 shadow-lg'
                          : 'bg-white bg-opacity-20 backdrop-blur-sm text-white hover:bg-opacity-30'
                      }`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlatformChange('next');
                  }}
                  className="p-2 bg-white bg-opacity-20 backdrop-blur-sm rounded-full text-white hover:bg-opacity-30 transition-all duration-200 hover:scale-105"
                  title="Plateforme suivante"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <p className="text-blue-100 text-sm mt-2 opacity-90">
              {item.name || 'Publication sans titre'}
            </p>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 max-h-[calc(95vh-120px)] overflow-y-auto">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="transform transition-all duration-300 hover:scale-[1.02]"
          >
            {renderPreview()}
          </div>
        </div>
        
        {/* Footer avec info */}
        <div className="px-6 py-3 bg-gray-800 border-t border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Aperçu temps réel</span>
            </div>
            <div className="text-right">
              <span className="opacity-75">Date de publication : </span>
              <span className="font-medium">
                {item.date_brute ? new Date(item.date_brute).toLocaleDateString('fr-FR') : 'Non définie'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};