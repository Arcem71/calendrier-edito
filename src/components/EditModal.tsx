import React, { useState, useRef, useEffect } from 'react';
import { X, Trash2, Check, Upload, Image as ImageIcon, ThumbsUp, ThumbsDown, Edit2, Calendar, Clock, User, Hash, FileText, Camera, Palette } from 'lucide-react';
import { ContentItem, Platform, Status, ImageInfo, Vote } from '../types';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { cancelScheduledPublication, schedulePublication } from '../utils/publicationScheduler';

interface EditModalProps {
  item: ContentItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

interface ImagePreviewProps {
  image: ImageInfo;
  onClose: () => void;
}

const platformOptions: Platform[] = ['Instagram', 'Facebook', 'Twitter', 'LinkedIn', 'TikTok', 'YouTube', 'Blog'];

const ImagePreview: React.FC<ImagePreviewProps> = ({ image, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50\" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] p-4">
        <button
          onClick={onClose}
          className="absolute top-0 right-0 m-4 p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100"
        >
          <X className="w-6 h-6" />
        </button>
        <img
          src={image.url}
          alt={image.filename}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
        />
        {image.vote && (
          <div className="absolute top-0 right-16 m-4">
            {image.vote === 'up' ? (
              <ThumbsUp className="w-6 h-6 text-green-500" />
            ) : (
              <ThumbsDown className="w-6 h-6 text-red-500" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const getPlatformClasses = (platform: Platform): string => {
  switch (platform.toLowerCase()) {
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

export function EditModal({ item, isOpen, onClose, onUpdate }: EditModalProps) {
  const [formData, setFormData] = useState({
    name: item.name,
    status: item.status,
    date_brute: item.date_brute,
    platforms: item.platforms,
    description: item.description,
    images: item.images || []
  });
  const [isPlatformDropdownOpen, setIsPlatformDropdownOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const platformDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(event.target as Node)) {
        setIsPlatformDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      setUploadError(null);

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('L\'image ne doit pas dépasser 5 MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('editorial-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('editorial-images')
        .getPublicUrl(filePath);

      const newImage: ImageInfo = {
        url: publicUrl,
        filename: fileName,
        uploaded_at: new Date().toISOString()
      };

      setFormData({ ...formData, images: [...formData.images, newImage] });
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError(error instanceof Error ? error.message : 'Erreur lors du téléchargement de l\'image');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageToDelete: ImageInfo) => {
    try {
      console.log('Suppression de l\'image via Edge Function:', imageToDelete.filename);
      
      // Appeler l'edge function pour supprimer l'image
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: imageToDelete.filename,
          itemId: item.id || undefined
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

      // Mettre à jour l'état local
      const updatedImages = formData.images.filter(img => img.filename !== imageToDelete.filename);
      setFormData({
        ...formData,
        images: updatedImages
      });

      toast.success('Image supprimée avec succès du stockage Supabase');
    } catch (error) {
      console.error('Error deleting image:', error);
      setUploadError('Erreur lors de la suppression de l\'image');
      toast.error('Erreur lors de la suppression de l\'image');
    }
  };

  const handleVoteImage = (imageToVote: ImageInfo, vote: Vote) => {
    const updatedImages = formData.images.map(img => 
      img.filename === imageToVote.filename 
        ? { ...img, vote: img.vote === vote ? null : vote }
        : img
    );
    setFormData({ ...formData, images: updatedImages });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Vérifier si on change le statut vers/depuis "Planifiée"
      const oldStatus = item.status;
      const newStatus = formData.status;
      
      // Si on annule une publication programmée
      if (oldStatus === 'Planifiée' && newStatus !== 'Planifiée' && item.id) {
        console.log(`🚫 Annulation de la publication programmée pour: ${formData.name}`);
        cancelScheduledPublication(item.id);
        toast.success('Publication programmée annulée', { duration: 3000 });
      }
      
      const data = {
        nom: formData.name,
        statut: formData.status,
        date_brute: formData.date_brute,
        platformes: formData.platforms.join(','),
        description: formData.description,
        images: formData.images
      };

      let error;
      if (item.id) {
        const result = await supabase
          .from('editorial_calendar')
          .update(data)
          .eq('id', item.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('editorial_calendar')
          .insert([data]);
        error = result.error;
      }

      if (error) throw error;
      
      // Si on programme une nouvelle publication
      if (newStatus === 'Planifiée' && formData.date_brute && item.id) {
        const scheduledDate = new Date(`${formData.date_brute}T09:00:00`);
        const now = new Date();
        
        if (scheduledDate > now) {
          console.log(`⏰ Programmation de la publication pour: ${formData.name}`);
          schedulePublication({
            id: item.id,
            name: formData.name,
            date: formData.date_brute,
            platforms: formData.platforms,
            description: formData.description,
            images: formData.images,
            informations: item.informations,
            scheduledDate
          });
          toast.success(
            `Publication programmée pour le ${scheduledDate.toLocaleDateString('fr-FR')} à 9h00`,
            { duration: 4000, icon: '⏰' }
          );
        } else {
          toast.error('Impossible de programmer une publication pour une date passée', { duration: 4000 });
        }
      }
      
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Erreur lors de la sauvegarde', { duration: 3000 });
    }
  };

  // FONCTION PRINCIPALE DE SUPPRESSION DE PUBLICATION AVEC TOUTES SES IMAGES (MODAL)
  const handleDelete = async () => {
    if (!item.id) return;
    
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer cette publication "${formData.name}" ?\n\n` +
      `Cette action supprimera définitivement :\n` +
      `- La publication de la base de données\n` +
      `- Toutes les images associées (${formData.images.length} image(s)) du stockage Supabase\n\n` +
      `Cette action est irréversible !`
    );
    
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      console.log('=== DÉBUT SUPPRESSION PUBLICATION COMPLÈTE (MODAL) ===');
      console.log('Publication à supprimer:', formData.name);
      console.log('Nombre d\'images à supprimer:', formData.images.length);

      // Étape 1: Supprimer toutes les images via l'edge function
      if (formData.images.length > 0) {
        console.log('Étape 1: Suppression des images via Edge Function...');
        
        for (let i = 0; i < formData.images.length; i++) {
          const img = formData.images[i];
          console.log(`Suppression image ${i + 1}/${formData.images.length}:`, img.filename);
          
          try {
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-image`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                filename: img.filename,
                itemId: item.id
              })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
            }

            const result = await response.json();
            if (!result.success) {
              throw new Error(result.error || 'Échec de la suppression de l\'image');
            }

            console.log(`✅ Image ${i + 1}/${formData.images.length} supprimée:`, img.filename);
          } catch (imageError) {
            console.error(`❌ Erreur suppression image ${img.filename}:`, imageError);
            // Continuer avec les autres images même si une échoue
          }
        }
        
        console.log('✅ Toutes les images ont été traitées');
      } else {
        console.log('Aucune image à supprimer');
      }

      // Étape 2: Supprimer la publication de la base de données
      console.log('Étape 2: Suppression de la publication de la base de données...');
      const { error: deleteError } = await supabase
        .from('editorial_calendar')
        .delete()
        .eq('id', item.id);

      if (deleteError) {
        throw new Error(`Erreur lors de la suppression de la publication: ${deleteError.message}`);
      }

      console.log('✅ Publication supprimée de la base de données');

      console.log('✅ SUPPRESSION PUBLICATION COMPLÈTE RÉUSSIE (MODAL)');
      console.log('=== FIN SUPPRESSION PUBLICATION COMPLÈTE (MODAL) ===');
      
      toast.success(
        `Publication "${formData.name}" supprimée avec succès !\n` +
        `${formData.images.length} image(s) supprimée(s) du stockage Supabase.`,
        { duration: 5000 }
      );

      // Fermer la modal et rafraîchir
      onUpdate();
      onClose();

    } catch (error) {
      console.error('❌ ERREUR LORS DE LA SUPPRESSION DE LA PUBLICATION (MODAL):', error);
      toast.error(
        `Erreur lors de la suppression de la publication: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        { duration: 5000 }
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const togglePlatform = (platform: Platform) => {
    const currentPlatforms = new Set(formData.platforms);
    if (currentPlatforms.has(platform)) {
      currentPlatforms.delete(platform);
    } else {
      currentPlatforms.add(platform);
    }
    setFormData({ ...formData, platforms: Array.from(currentPlatforms) });
  };

  if (!isOpen) return null;

  const statusOptions: Status[] = ['Publiée', 'En Attente de Validation', 'Planifiée'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Edit2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {item.id ? 'Modifier la publication' : 'Nouvelle publication'}
                </h2>
                <p className="text-blue-100 text-sm">
                  {item.id ? 'Modifiez les détails de votre contenu' : 'Créez un nouveau contenu pour votre calendrier'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all duration-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-8 overflow-y-auto max-h-[calc(95vh-120px)]">

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Section */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Informations générales</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Nom de la publication
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Post Instagram promotionnel"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date de publication
                </label>
                <input
                  type="date"
                  value={formData.date_brute}
                  onChange={(e) => setFormData({ ...formData, date_brute: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Status and Platforms Section */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Statut et plateformes</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Statut de la publication
                </label>
                <div className="space-y-2">
                  {statusOptions.map(status => {
                    const getStatusIcon = (s: string) => {
                      switch(s) {
                        case 'Publiée': return '✅';
                        case 'Planifiée': return '⏰';
                        case 'En Attente de Validation': return '⏳';
                        default: return '📝';
                      }
                    };
                    
                    return (
                      <label key={status} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-white transition-all duration-200">
                        <input
                          type="radio"
                          name="status"
                          value={status}
                          checked={formData.status === status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as Status })}
                          className="w-4 h-4 text-blue-500 border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-lg">{getStatusIcon(status)}</span>
                        <span className="text-sm font-medium text-gray-700">{status}</span>
                      </label>
                    );
                  })}
                </div>
              </div>


              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Plateformes de publication
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {platformOptions.map(platform => {
                    const getPlatformIcon = (p: Platform) => {
                      switch(p.toLowerCase()) {
                        case 'instagram': return '📷';
                        case 'facebook': return '👥';
                        case 'twitter': return '🐦';
                        case 'linkedin': return '💼';
                        case 'tiktok': return '🎵';
                        case 'youtube': return '📺';
                        case 'blog': return '📝';
                        default: return '📱';
                      }
                    };
                    
                    const isSelected = formData.platforms.includes(platform);
                    return (
                      <label key={platform} className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePlatform(platform)}
                          className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-lg">{getPlatformIcon(platform)}</span>
                        <span className="text-sm font-medium text-gray-700 flex-1">{platform}</span>
                        {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                      </label>
                    );
                  })}
                </div>
                
                {/* Selected platforms preview */}
                {formData.platforms.length > 0 && (
                  <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                    <div className="text-xs font-medium text-blue-700 mb-2">Plateformes sélectionnées :</div>
                    <div className="flex flex-wrap gap-1">
                      {formData.platforms.map(platform => (
                        <span key={platform} className={`px-2 py-1 rounded-lg text-xs ${getPlatformClasses(platform as Platform)}`}>
                          {platform}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Images Section */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <Camera className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Galerie d'images</h3>
              </div>
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                  uploading 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl'
                }`}
              >
                <Upload className={`w-4 h-4 ${uploading ? '' : 'animate-bounce'}`} />
                {uploading ? 'Upload en cours...' : 'Ajouter une image'}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
            </div>
            
            {uploadError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <X className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-700">{uploadError}</p>
              </div>
            )}

            {formData.images.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">Aucune image ajoutée</p>
                <p className="text-gray-400 text-xs mt-1">Cliquez sur "Ajouter une image" pour commencer</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {formData.images.map((image, index) => (
                  <div key={image.filename} className="relative group">
                    <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer" onClick={() => setSelectedImage(image)}>
                      <img
                        src={image.url}
                        alt={`Image ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://placehold.co/400x400?text=Image+non+trouvée';
                        }}
                      />
                    </div>
                    
                    {/* Vote indicator */}
                    {image.vote && (
                      <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                        {image.vote === 'up' ? (
                          <ThumbsUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <ThumbsDown className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    )}
                    
                    {/* Hover overlay with actions */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImage(image);
                          }}
                          className="p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100 transition-all duration-200 hover:scale-110"
                          title="Voir l'image"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVoteImage(image, 'up');
                          }}
                          className={`p-2 rounded-full transition-all duration-200 hover:scale-110 ${
                            image.vote === 'up' 
                              ? 'bg-green-500 text-white' 
                              : 'bg-white text-gray-800 hover:bg-green-100'
                          }`}
                          title="J'aime"
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </button>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVoteImage(image, 'down');
                          }}
                          className={`p-2 rounded-full transition-all duration-200 hover:scale-110 ${
                            image.vote === 'down' 
                              ? 'bg-red-500 text-white' 
                              : 'bg-white text-gray-800 hover:bg-red-100'
                          }`}
                          title="Je n'aime pas"
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </button>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteImage(image);
                          }}
                          className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200 hover:scale-110"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Image number indicator */}
                    <div className="absolute bottom-3 left-3 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
                      {index + 1}/{formData.images.length}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Description Section */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Description et contenu</h3>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Texte de la publication</label>
              <div className="relative">
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={8}
                  placeholder="Rédigez votre post ici...\n\nVous pouvez inclure :\n• Des hashtags #exemple\n• Des mentions @utilisateur\n• Des émojis 🚀\n• Des liens https://exemple.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 resize-none"
                />
                <div className="absolute bottom-3 right-3 text-xs text-gray-400">
                  {formData.description.length} caractères
                </div>
              </div>
              
              {formData.description.length > 0 && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                  <div className="text-xs font-medium text-gray-700 mb-2">Aperçu :</div>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-20 overflow-y-auto">
                    {formData.description.substring(0, 200)}
                    {formData.description.length > 200 && '...'}
                  </div>
                  
                  {/* Quick stats about the description */}
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span>📝 {formData.description.split('\n').length} ligne{formData.description.split('\n').length > 1 ? 's' : ''}</span>
                    <span>🔤 {formData.description.split(' ').filter(word => word.length > 0).length} mots</span>
                    <span>🏷️ {(formData.description.match(/#\w+/g) || []).length} hashtags</span>
                    <span>👤 {(formData.description.match(/@\w+/g) || []).length} mentions</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata and Summary Section */}
          {item.id && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Résumé de la publication</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-3 rounded-lg border border-blue-100">
                  <div className="text-xs font-medium text-gray-500 mb-1">Statut</div>
                  <div className="text-sm font-semibold text-gray-800">{formData.status}</div>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-blue-100">
                  <div className="text-xs font-medium text-gray-500 mb-1">Plateformes</div>
                  <div className="text-sm font-semibold text-gray-800">{formData.platforms.length || 'Aucune'}</div>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-blue-100">
                  <div className="text-xs font-medium text-gray-500 mb-1">Images</div>
                  <div className="text-sm font-semibold text-gray-800">{formData.images.length}</div>
                </div>
                
                <div className="bg-white p-3 rounded-lg border border-blue-100">
                  <div className="text-xs font-medium text-gray-500 mb-1">Caractères</div>
                  <div className="text-sm font-semibold text-gray-800">{formData.description.length}</div>
                </div>
              </div>
              
              {formData.status === 'Planifiée' && formData.date_brute && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-700">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Publication programmée pour le {new Date(formData.date_brute).toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })} à 9h00
                    </span>
                  </div>
                </div>
              )}
              
              {formData.platforms.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-medium text-gray-600 mb-2">Cette publication sera diffusée sur :</div>
                  <div className="flex flex-wrap gap-2">
                    {formData.platforms.map(platform => {
                      const getPlatformInfo = (p: string) => {
                        switch(p.toLowerCase()) {
                          case 'instagram': return { icon: '📷', color: 'from-purple-500 to-pink-500' };
                          case 'facebook': return { icon: '👥', color: 'from-blue-600 to-blue-700' };
                          case 'twitter': return { icon: '🐦', color: 'from-sky-400 to-sky-500' };
                          case 'linkedin': return { icon: '💼', color: 'from-blue-800 to-blue-900' };
                          case 'tiktok': return { icon: '🎵', color: 'from-black to-gray-800' };
                          case 'youtube': return { icon: '📺', color: 'from-red-600 to-red-700' };
                          case 'blog': return { icon: '📝', color: 'from-green-600 to-green-700' };
                          default: return { icon: '📱', color: 'from-gray-500 to-gray-600' };
                        }
                      };
                      
                      const info = getPlatformInfo(platform);
                      return (
                        <div key={platform} className={`px-3 py-1 bg-gradient-to-r ${info.color} text-white rounded-full text-xs flex items-center gap-1`}>
                          <span>{info.icon}</span>
                          <span>{platform}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 pt-6 border-t border-gray-200">
            {item.id && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className={`px-6 py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
                  isDeleting
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'text-white bg-red-500 hover:bg-red-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? 'Suppression en cours...' : 'Supprimer la publication'}
              </button>
            )}
            
            <div className="flex gap-3 sm:ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all duration-200 hover:shadow-md"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                {item.id ? '✨ Enregistrer les modifications' : '🚀 Créer la publication'}
              </button>
            </div>
          </div>
        </form>
        </div>
      </div>

      {selectedImage && (
        <ImagePreview
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </div>
  );
}