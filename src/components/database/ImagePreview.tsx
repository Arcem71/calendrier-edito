import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';
import { ImageInfo, Vote } from '../../types';
import toast from 'react-hot-toast';

interface ImagePreviewProps {
  images: ImageInfo[];
  initialIndex: number;
  onClose: () => void;
  onVote?: (image: ImageInfo, vote: Vote) => void;
  onDelete?: (image: ImageInfo) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ 
  images, 
  initialIndex, 
  onClose, 
  onVote, 
  onDelete 
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [localImages, setLocalImages] = useState(images);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setLocalImages(images);
  }, [images]);

  const currentImage = localImages[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : localImages.length - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev < localImages.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [localImages.length, onClose]);

  const handleDelete = async (image: ImageInfo) => {
    if (isDeleting) return;
    
    const confirmed = window.confirm('Êtes-vous sûr de vouloir supprimer cette image ? Cette action est irréversible.');
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      console.log('Début de la suppression de l\'image via Edge Function:', image.filename);
      
      // Appeler l'edge function pour supprimer l'image
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: image.filename
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('Réponse de l\'edge function:', result);

      if (!result.success) {
        throw new Error(result.error || 'Échec de la suppression');
      }

      console.log('✅ Image supprimée avec succès via Edge Function');

      // Appeler la fonction de suppression parent si elle existe
      if (onDelete) {
        await onDelete(image);
      }
      
      // Mettre à jour l'état local
      const newImages = localImages.filter(img => img.filename !== image.filename);
      setLocalImages(newImages);
      
      // Si c'était la dernière image, fermer la prévisualisation
      if (newImages.length === 0) {
        onClose();
        return;
      }
      
      // Ajuster l'index si nécessaire
      if (currentIndex >= newImages.length) {
        setCurrentIndex(newImages.length - 1);
      }
      
      toast.success('Image supprimée avec succès du stockage Supabase');
      console.log('Suppression complète réussie pour:', image.filename);
      
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'image:', error);
      toast.error(`Erreur lors de la suppression: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleVote = (image: ImageInfo, vote: Vote) => {
    if (onVote) {
      const newVote = image.vote === vote ? null : vote;
      setLocalImages(prev =>
        prev.map(img =>
          img.filename === image.filename
            ? { ...img, vote: newVote }
            : img
        )
      );
      onVote(image, newVote);
    }
  };

  if (!currentImage) {
    onClose();
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] p-4">
        <button
          onClick={onClose}
          className="absolute top-0 right-0 m-4 p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100 z-10"
        >
          <X className="w-6 h-6" />
        </button>
        
        {localImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((prev) => (prev > 0 ? prev - 1 : localImages.length - 1));
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100 z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((prev) => (prev < localImages.length - 1 ? prev + 1 : 0));
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100 z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
        
        <img
          src={currentImage.url}
          alt={currentImage.filename}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://placehold.co/600x400?text=Image+non+trouvée';
          }}
        />
        
        <div className="absolute top-4 right-16 flex gap-2 z-10">
          {onVote && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleVote(currentImage, 'up');
                }}
                className={`p-2 rounded-full transition-colors ${
                  currentImage.vote === 'up'
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-gray-800 hover:bg-green-100'
                }`}
                title="J'aime cette image"
              >
                <ThumbsUp className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleVote(currentImage, 'down');
                }}
                className={`p-2 rounded-full transition-colors ${
                  currentImage.vote === 'down'
                    ? 'bg-red-500 text-white'
                    : 'bg-white text-gray-800 hover:bg-red-100'
                }`}
                title="Je n'aime pas cette image"
              >
                <ThumbsDown className="w-6 h-6" />
              </button>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(currentImage);
            }}
            disabled={isDeleting}
            className={`p-2 rounded-full transition-colors ${
              isDeleting 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-white text-red-500 hover:bg-red-500 hover:text-white'
            }`}
            title="Supprimer cette image définitivement du stockage Supabase"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        </div>
        
        {localImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {localImages.length}
          </div>
        )}
      </div>
    </div>
  );
};