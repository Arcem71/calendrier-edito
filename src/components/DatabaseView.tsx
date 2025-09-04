import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ContentItem,
  Platform,
  Status,
  ImageInfo,
  Vote,
} from '../types';
import {
  Database,
  Plus,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import { EditModal } from './EditModal';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

// Import des nouveaux composants
import { ImageCell } from './database/ImageCell';
import { StatusCell } from './database/StatusCell';
import { PlatformsCell } from './database/PlatformsCell';
import { EditableCell } from './database/EditableCell';
import { InformationsCell } from './database/InformationsCell';
import { TableHeader } from './database/TableHeader';
import { AIAssistant } from './database/AIAssistant';
import { ImagePreview } from './database/ImagePreview';
import { PostPreview } from './database/PostPreview';
import { PlatformSelector } from './database/PlatformSelector';
import { cancelScheduledPublication, schedulePublication } from '../utils/publicationScheduler';

interface DatabaseViewProps {
  items: ContentItem[];
  onUpdate: () => void;
}

type SortField =
  | 'name'
  | 'status'
  | 'date_brute'
  | 'platforms'
  | 'description'
  | 'informations';

type SortDirection = 'asc' | 'desc';

interface EditingCell {
  id: string;
  field: keyof ContentItem;
  value: string;
}

export function DatabaseView({ items, onUpdate }: DatabaseViewProps) {
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date_brute');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [selectedImages, setSelectedImages] = useState<ImageInfo[]>([]);
  const [editingPlatformsForId, setEditingPlatformsForId] = useState<string | null>(null);
  const [editingStatusForId, setEditingStatusForId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [activeItem, setActiveItem] = useState<ContentItem | null>(null);
  const [aiEditingField, setAiEditingField] = useState<'name' | 'description'>('name');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [compactView, setCompactView] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);
  const [previewPlatform, setPreviewPlatform] = useState<Platform | null>(null);

  const handleImageUpload = async (file: File, itemId: string) => {
    const uploadPromise = (async () => {
      try {
        setUploading(true);
        setUploadError(null);

        if (file.size > 5 * 1024 * 1024) {
          throw new Error('L\'image ne doit pas dépasser 5 MB');
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
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

        const { data: item } = await supabase
          .from('editorial_calendar')
          .select('images')
          .eq('id', itemId)
          .single();

        if (!item) throw new Error('Item not found');

        const currentImages = Array.isArray(item.images) ? item.images : [];
        const updatedImages = [...currentImages, newImage];

        const { error: updateError } = await supabase
          .from('editorial_calendar')
          .update({ images: updatedImages })
          .eq('id', itemId);

        if (updateError) throw updateError;

        onUpdate();
        return 'Image téléchargée avec succès';
      } catch (error) {
        console.error('Error uploading image:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur lors du téléchargement de l\'image';
        setUploadError(errorMessage);
        throw errorMessage;
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    })();

    toast.promise(uploadPromise, {
      loading: 'Téléchargement en cours...',
      success: (message) => message,
      error: (error) => `Erreur: ${error}`
    });
  };

  const handleVoteImage = async (itemId: string, imageToVote: ImageInfo, vote: Vote) => {
    try {
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      const updatedImages = item.images.map(img =>
        img.filename === imageToVote.filename
          ? { ...img, vote: img.vote === vote ? null : vote }
          : img
      );

      setSelectedImages(prevImages =>
        prevImages.map(img =>
          img.filename === imageToVote.filename
            ? { ...img, vote: img.vote === vote ? null : vote }
            : img
        )
      );

      const { error } = await supabase
        .from('editorial_calendar')
        .update({ images: updatedImages })
        .eq('id', itemId);

      if (error) throw error;

      onUpdate();
    } catch (error) {
      console.error('Error voting on image:', error);
      setSelectedImages(prevImages =>
        prevImages.map(img =>
          img.filename === imageToVote.filename
            ? { ...img, vote: imageToVote.vote }
            : img
        )
      );
    }
  };

  const handleTogglePlatform = async (item: ContentItem, platform: Platform) => {
    try {
      const updatedPlatforms = item.platforms.includes(platform)
        ? item.platforms.filter(p => p !== platform)
        : [...item.platforms, platform];

      const { error } = await supabase
        .from('editorial_calendar')
        .update({ platformes: updatedPlatforms.join(',') })
        .eq('id', item.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error updating platforms:', error);
    }
  };

  const handleUpdateStatus = async (item: ContentItem, status: Status) => {
    try {
      // Si on change le statut d'une publication programmée, annuler la programmation
      if (item.status === 'Planifiée' && status !== 'Planifiée') {
        console.log(`🚫 Annulation de la publication programmée pour: ${item.name}`);
        cancelScheduledPublication(item.id);
        toast.success('Publication programmée annulée', { duration: 3000 });
      }
      
      // Si on passe au statut "Planifiée", programmer la publication
      if (status === 'Planifiée' && item.date_brute) {
        const scheduledDate = new Date(`${item.date_brute}T09:00:00`);
        const now = new Date();
        
        if (scheduledDate > now) {
          console.log(`⏰ Programmation de la publication pour: ${item.name}`);
          schedulePublication({
            id: item.id,
            name: item.name,
            date: item.date_brute,
            platforms: item.platforms,
            description: item.description,
            images: item.images,
            informations: item.informations,
            scheduledDate
          });
          toast.success(
            `Publication programmée pour le ${scheduledDate.toLocaleDateString('fr-FR')} à 9h00`,
            { duration: 4000, icon: '⏰' }
          );
        } else {
          toast.error('Impossible de programmer une publication pour une date passée', { duration: 4000 });
          return; // Ne pas mettre à jour le statut si la date est passée
        }
      }

      const { error } = await supabase
        .from('editorial_calendar')
        .update({ statut: status })
        .eq('id', item.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erreur lors de la mise à jour du statut', { duration: 3000 });
    } finally {
      setEditingStatusForId(null);
    }
  };

  const handleCreate = () => {
    setSelectedItem({
      id: '',
      name: '',
      status: 'En Attente de Validation',
      date_brute: new Date().toISOString().split('T')[0],
      platforms: [],
      description: '',
      images: [],
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: ContentItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  // FONCTION PRINCIPALE DE SUPPRESSION DE PUBLICATION AVEC TOUTES SES IMAGES
  const handleDelete = async (item: ContentItem) => {
    if (!item.id) return;
    
    const confirmed = window.confirm(
      `Êtes-vous sûr de vouloir supprimer cette publication "${item.name}" ?\n\n` +
      `Cette action supprimera définitivement :\n` +
      `- La publication de la base de données\n` +
      `- Toutes les images associées (${item.images.length} image(s)) du stockage Supabase\n\n` +
      `Cette action est irréversible !`
    );
    
    if (!confirmed) return;

    try {
      setIsDeleting(item.id);
      console.log('=== DÉBUT SUPPRESSION PUBLICATION COMPLÈTE ===');
      console.log('Publication à supprimer:', item.name);
      console.log('Nombre d\'images à supprimer:', item.images.length);

      const images = Array.isArray(item.images) ? item.images : [];
      
      // Étape 1: Supprimer toutes les images via l'edge function
      if (images.length > 0) {
        console.log('Étape 1: Suppression des images via Edge Function...');
        
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          console.log(`Suppression image ${i + 1}/${images.length}:`, img.filename);
          
          try {
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-image`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                filename: img.filename,
                itemId: item.id // Passer l'ID pour la mise à jour de la DB
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

            console.log(`✅ Image ${i + 1}/${images.length} supprimée:`, img.filename);
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

      // Étape 3: Rafraîchir l'interface
      console.log('Étape 3: Rafraîchissement de l\'interface...');
      onUpdate();
      
      console.log('✅ SUPPRESSION PUBLICATION COMPLÈTE RÉUSSIE');
      console.log('=== FIN SUPPRESSION PUBLICATION COMPLÈTE ===');
      
      toast.success(
        `Publication "${item.name}" supprimée avec succès !\n` +
        `${images.length} image(s) supprimée(s) du stockage Supabase.`,
        { duration: 5000 }
      );

    } catch (error) {
      console.error('❌ ERREUR LORS DE LA SUPPRESSION DE LA PUBLICATION:', error);
      toast.error(
        `Erreur lors de la suppression de la publication: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        { duration: 5000 }
      );
    } finally {
      setIsDeleting(null);
    }
  };

  const handlePublish = async (item: ContentItem) => {
    try {
      const hasUpvotes = item.images.some(img => img.vote === 'up');
      const hasDownvotes = item.images.some(img => img.vote === 'down');
      let imagesToPublish: string[];
      if (hasUpvotes) {
        imagesToPublish = item.images
          .filter(img => img.vote === 'up')
          .map(img => img.url);
      } else if (!hasDownvotes) {
        imagesToPublish = item.images.map(img => img.url);
      } else {
        imagesToPublish = item.images
          .filter(img => img.vote !== 'down')
          .map(img => img.url);
      }
      const payload = {
        nom: item.name,
        images: imagesToPublish,
        description: item.description,
        informations: item.informations,
        plateformes: item.platforms,
      };
      const res = await fetch(
        'https://hook.eu2.make.com/t9qokr1n58rbxh7asshv5xe44itw6tgd ',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error('publish fail');
      const { error } = await supabase
        .from('editorial_calendar')
        .update({ statut: 'Publiée' })
        .eq('id', item.id);
      if (error) throw error;
      onUpdate();
    } catch (err) {
      console.error('publish error', err);
    }
  };

  const handleStartEditing = (item: ContentItem, field: keyof ContentItem) => {
    setEditingCell({
      id: item.id,
      field,
      value: (item[field] as string) || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingCell) return;
    try {
      const valueToSave = editingCell.value || '';
      const { error } = await supabase
        .from('editorial_calendar')
        .update({ 
          [editingCell.field]: valueToSave.trim()
        })
        .eq('id', editingCell.id);
      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error saving edit:', error);
    } finally {
      setEditingCell(null);
    }
  };

  const handleUpdateDescription = async (itemId: string, newDescription: string) => {
    try {
      const { error } = await supabase
        .from('editorial_calendar')
        .update({ description: newDescription })
        .eq('id', itemId);
      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error updating description:', error);
    }
  };

  const handleUpdateName = async (itemId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('editorial_calendar')
        .update({ nom: newName })
        .eq('id', itemId);
      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error updating name:', error);
    }
  };

  // FONCTION PRINCIPALE DE SUPPRESSION D'IMAGE VIA EDGE FUNCTION
  const handleDeleteImage = async (imageToDelete: ImageInfo) => {
    console.log('=== DÉBUT SUPPRESSION IMAGE VIA EDGE FUNCTION ===');
    console.log('Image à supprimer:', imageToDelete);

    try {
      // Trouver l'item qui contient cette image
      const item = items.find((i) => 
        i.images.some(img => img.filename === imageToDelete.filename)
      );

      // Appeler l'edge function pour supprimer l'image
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: imageToDelete.filename,
          itemId: item?.id
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

      // Rafraîchir les données
      onUpdate();
      
      console.log('✅ SUPPRESSION COMPLÈTE RÉUSSIE VIA EDGE FUNCTION');
      console.log('=== FIN SUPPRESSION IMAGE VIA EDGE FUNCTION ===');
      
    } catch (error) {
      console.error('❌ ERREUR LORS DE LA SUPPRESSION VIA EDGE FUNCTION:', error);
      throw error; // Re-throw pour que le composant ImagePreview puisse gérer l'erreur
    }
  };

  const toggleRowExpansion = (itemId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(itemId)) {
      newExpandedRows.delete(itemId);
    } else {
      newExpandedRows.add(itemId);
    }
    setExpandedRows(newExpandedRows);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field as SortField);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    let filtered = [...items];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.informations?.toLowerCase().includes(query)
      );
    }

    if (selectedStatus) {
      filtered = filtered.filter((item) => item.status === selectedStatus);
    }

    if (selectedPlatform) {
      filtered = filtered.filter((item) =>
        item.platforms.includes(selectedPlatform)
      );
    }

    return filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (Array.isArray(aValue) && Array.isArray(bValue)) {
        const aStr = aValue.join(',');
        const bStr = bValue.join(',');
        return sortDirection === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      }

      if (sortField === 'date_brute') {
        const aDate = aValue ? new Date(aValue).getTime() : 0;
        const bDate = bValue ? new Date(bValue).getTime() : 0;
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }

      const aString = String(aValue || '');
      const bString = String(bValue || '');
      return sortDirection === 'asc'
        ? aString.localeCompare(bString)
        : bString.localeCompare(aString);
    });
  }, [items, searchQuery, selectedStatus, selectedPlatform, sortField, sortDirection]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (editingPlatformsForId && !(event.target as Element).closest('.relative')) {
        setEditingPlatformsForId(null);
      }
      if (editingStatusForId && !(event.target as Element).closest('.relative')) {
        setEditingStatusForId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingPlatformsForId, editingStatusForId]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Base de données</h2>
            <p className="text-sm text-gray-500">
              {filteredAndSortedItems.length} publication{filteredAndSortedItems.length !== 1 ? 's' : ''} • {
                items.filter(item => item.status === 'Publiée').length
              } publiée{items.filter(item => item.status === 'Publiée').length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
            <div className={`w-2 h-2 rounded-full ${uploading ? 'bg-orange-400 animate-pulse' : 'bg-green-400'}`}></div>
            <span className="text-sm text-gray-600">
              {uploading ? 'Upload en cours...' : 'Système actif'}
            </span>
          </div>
          
          <button
            onClick={() => setCompactView(!compactView)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${
              compactView
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={compactView ? 'Vue détaillée' : 'Vue compacte'}
          >
            {compactView ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span className="text-sm font-medium">Détaillé</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="text-sm font-medium">Compact</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 transition-all duration-200 shadow-lg shadow-blue-500/25"
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium">Nouvelle publication</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Section */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, description, informations..."
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200"
                type="text"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">{items.filter(item => item.status === 'Publiée').length} Publiées</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium">{items.filter(item => item.status === 'Planifiée').length} Planifiées</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm font-medium">{items.filter(item => item.status === 'En Attente de Validation').length} En attente</span>
            </div>
          </div>
        </div>
        
        {/* Results info */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div>
            {filteredAndSortedItems.length === items.length ? (
              <span>Affichage de toutes les {items.length} publications</span>
            ) : (
              <span>
                {filteredAndSortedItems.length} résultat{filteredAndSortedItems.length !== 1 ? 's' : ''} sur {items.length} publications
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>Tri par :</span>
            <span className="font-medium text-gray-700">
              {sortField === 'name' && 'Nom'}
              {sortField === 'date_brute' && 'Date'}
              {sortField === 'status' && 'Statut'}
              {sortField === 'platforms' && 'Plateformes'}
              {sortField === 'description' && 'Description'}
              {sortField === 'informations' && 'Informations'}
            </span>
            <span className="text-gray-400">({sortDirection === 'asc' ? '↑' : '↓'})</span>
          </div>
        </div>
      </div>
      {/* Content Section */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHeader
              sortField={sortField}
              sortDirection={sortDirection}
              selectedStatus={selectedStatus}
              selectedPlatform={selectedPlatform}
              compactView={compactView}
              onSort={handleSort}
              onStatusFilter={setSelectedStatus}
              onPlatformFilter={setSelectedPlatform}
            />
            <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedItems.map((it, idx) => (
              <React.Fragment key={it.id || idx}>
                {/* Ligne principale (compacte ou normale) */}
                <tr
                  className={`transition-all duration-200 hover:shadow-sm ${
                    compactView ? '' : 'h-20 hover:bg-blue-50'
                  } ${isDeleting === it.id ? 'opacity-50' : ''}`}
                >
                  {compactView ? (
                    // Vue compacte repensée - format card
                    <td colSpan={8} className="p-0">
                      <div className="p-4 border-l-4 border-blue-200 bg-gradient-to-r from-blue-50/30 to-white">
                        <div className="flex items-start gap-4">
                          {/* Expand button + Content principal */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => toggleRowExpansion(it.id)}
                                className={`mt-1 p-1.5 rounded-lg transition-all duration-200 flex-shrink-0 ${
                                  expandedRows.has(it.id) 
                                    ? 'bg-blue-100 text-blue-600 shadow-sm' 
                                    : 'hover:bg-gray-100 text-gray-500'
                                }`}
                                title={expandedRows.has(it.id) ? 'Réduire' : 'Développer'}
                              >
                                <svg
                                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                    expandedRows.has(it.id) ? 'rotate-90' : ''
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              
                              <div className="flex-1 min-w-0">
                                {/* Titre */}
                                <div className="flex items-start gap-3 mb-2">
                                  <h3 className="font-semibold text-gray-900 text-sm leading-tight" title={it.name || 'Sans titre'}>
                                    {(it.name || 'Sans titre').length > 50 
                                      ? `${(it.name || 'Sans titre').substring(0, 50)}...`
                                      : (it.name || 'Sans titre')
                                    }
                                  </h3>
                                  <StatusCell
                                    item={it}
                                    isEditing={editingStatusForId === it.id}
                                    onStartEdit={setEditingStatusForId}
                                    onUpdate={handleUpdateStatus}
                                  />
                                </div>
                                
                                {/* Description (très limitée) */}
                                {it.description && (
                                  <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                                    {it.description.length > 80 
                                      ? `${it.description.substring(0, 80)}...`
                                      : it.description
                                    }
                                  </p>
                                )}
                                
                                {/* Meta info compacte */}
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                    </svg>
                                    <span>
                                      {it.date_brute 
                                        ? new Date(it.date_brute).toLocaleDateString('fr-FR', { 
                                            day: 'numeric', 
                                            month: 'short' 
                                          })
                                        : 'Non planifié'
                                      }
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                    </svg>
                                    <span>{it.images.length} image{it.images.length !== 1 ? 's' : ''}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Plateformes compactes */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <div className="flex flex-wrap gap-1 justify-end max-w-[120px]">
                              {it.platforms.slice(0, 3).map((platform) => {
                                const normalizedPlatform = platform.toLowerCase().trim();
                                let platformClasses = '';
                                let platformIcon = '';
                                switch (normalizedPlatform) {
                                  case 'instagram':
                                    platformClasses = 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
                                    platformIcon = 'IG';
                                    break;
                                  case 'facebook':
                                    platformClasses = 'bg-blue-600 text-white';
                                    platformIcon = 'FB';
                                    break;
                                  case 'twitter':
                                    platformClasses = 'bg-sky-400 text-white';
                                    platformIcon = 'TW';
                                    break;
                                  case 'linkedin':
                                    platformClasses = 'bg-blue-800 text-white';
                                    platformIcon = 'LI';
                                    break;
                                  case 'tiktok':
                                    platformClasses = 'bg-black text-white';
                                    platformIcon = 'TT';
                                    break;
                                  case 'youtube':
                                    platformClasses = 'bg-red-600 text-white';
                                    platformIcon = 'YT';
                                    break;
                                  case 'blog':
                                    platformClasses = 'bg-green-600 text-white';
                                    platformIcon = 'BL';
                                    break;
                                  default:
                                    platformClasses = 'bg-gray-100 text-gray-800';
                                    platformIcon = platform.substring(0, 2).toUpperCase();
                                }
                                return (
                                  <span
                                    key={platform}
                                    className={`px-1.5 py-0.5 rounded text-xs font-bold ${platformClasses}`}
                                    title={platform}
                                  >
                                    {platformIcon}
                                  </span>
                                );
                              })}
                              {it.platforms.length > 3 && (
                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded">
                                  +{it.platforms.length - 3}
                                </span>
                              )}
                            </div>
                            
                            {/* Actions compactes */}
                            <div className="flex items-center gap-1">
                              <PlatformSelector
                                item={it}
                                onPreview={() => {
                                  setPreviewItem(it);
                                  setPreviewPlatform(null);
                                }}
                              />
                              <button
                                onClick={() => handlePublish(it)}
                                className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-all duration-200"
                                title="Publier"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(it)}
                                disabled={isDeleting === it.id}
                                className={`p-1.5 rounded transition-all duration-200 ${
                                  isDeleting === it.id
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                                }`}
                                title={isDeleting === it.id ? 'Suppression...' : 'Supprimer'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  ) : (
                    // Vue détaillée moderne
                    <>
                      <td className="px-6 py-5">
                        <EditableCell
                          item={it}
                          field="name"
                          isEditing={editingCell?.id === it.id && editingCell?.field === 'name'}
                          editingValue={editingCell?.value || ''}
                          onStartEdit={handleStartEditing}
                          onValueChange={(value) => setEditingCell(prev => prev ? { ...prev, value } : null)}
                          onSaveEdit={handleSaveEdit}
                          onShowAI={(item, field) => {
                            setShowAIAssistant(true);
                            setActiveItem(item);
                            setAiEditingField(field);
                          }}
                          showAIButton={true}
                        />
                      </td>
                      
                      <td className="px-6 py-5">
                        <StatusCell
                          item={it}
                          isEditing={editingStatusForId === it.id}
                          onStartEdit={setEditingStatusForId}
                          onUpdate={handleUpdateStatus}
                        />
                      </td>
                      
                      <td className="px-6 py-5">
                        <EditableCell
                          item={it}
                          field="date_brute"
                          isEditing={editingCell?.id === it.id && editingCell?.field === 'date_brute'}
                          editingValue={editingCell?.value || ''}
                          onStartEdit={handleStartEditing}
                          onValueChange={(value) => setEditingCell(prev => prev ? { ...prev, value } : null)}
                          onSaveEdit={handleSaveEdit}
                        />
                      </td>
                      
                      <td className="px-6 py-5">
                        <PlatformsCell
                          item={it}
                          isEditing={editingPlatformsForId === it.id}
                          onStartEdit={setEditingPlatformsForId}
                          onTogglePlatform={handleTogglePlatform}
                        />
                      </td>
                      
                      <td className="px-6 py-5">
                        <ImageCell
                          item={it}
                          onImageUpload={handleImageUpload}
                          onImageClick={(images, index) => {
                            setSelectedImageIndex(index);
                            setSelectedImages(images);
                          }}
                          uploading={uploading}
                        />
                      </td>
                      
                      <td className="px-6 py-5 max-w-xs">
                        <EditableCell
                          item={it}
                          field="description"
                          isEditing={editingCell?.id === it.id && editingCell?.field === 'description'}
                          editingValue={editingCell?.value || ''}
                          onStartEdit={handleStartEditing}
                          onValueChange={(value) => setEditingCell(prev => prev ? { ...prev, value } : null)}
                          onSaveEdit={handleSaveEdit}
                          onShowAI={(item, field) => {
                            setShowAIAssistant(true);
                            setActiveItem(item);
                            setAiEditingField(field);
                          }}
                          showAIButton={true}
                        />
                      </td>
                      
                      <td className="px-6 py-5 max-w-xs">
                        <InformationsCell
                          item={it}
                          isEditing={editingCell?.id === it.id && editingCell?.field === 'informations'}
                          editingValue={editingCell?.value || ''}
                          onStartEdit={handleStartEditing}
                          onValueChange={(value) => setEditingCell(prev => prev ? { ...prev, value } : null)}
                          onSaveEdit={handleSaveEdit}
                        />
                      </td>
                      
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-2">
                            <PlatformSelector
                              item={it}
                              onPreview={() => {
                                setPreviewItem(it);
                                setPreviewPlatform(null);
                              }}
                            />
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handlePublish(it)}
                                className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all duration-200 flex items-center gap-1 text-xs"
                                title="Publier"
                              >
                                <Send className="w-3 h-3" />
                                <span>Publier</span>
                              </button>
                              <button
                                onClick={() => handleDelete(it)}
                                disabled={isDeleting === it.id}
                                className={`p-2 rounded-lg transition-all duration-200 flex items-center gap-1 text-xs ${
                                  isDeleting === it.id
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                                }`}
                                title={isDeleting === it.id ? 'Suppression...' : 'Supprimer'}
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>{isDeleting === it.id ? 'Suppression...' : 'Supprimer'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
                
                {/* Ligne détaillée (seulement en vue compacte et si développée) */}
                {compactView && expandedRows.has(it.id) && (
                  <tr className="bg-blue-50/30 border-b border-blue-200">
                    <td colSpan={8} className="px-6 py-6">
                      <div className="bg-white rounded-lg p-5 border border-blue-100 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {/* Nom complet */}
                          <div className="space-y-2">
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                              Nom de la publication
                            </label>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <EditableCell
                                item={it}
                                field="name"
                                isEditing={editingCell?.id === it.id && editingCell?.field === 'name'}
                                editingValue={editingCell?.value || ''}
                                onStartEdit={handleStartEditing}
                                onValueChange={(value) => setEditingCell(prev => prev ? { ...prev, value } : null)}
                                onSaveEdit={handleSaveEdit}
                                onShowAI={(item, field) => {
                                  setShowAIAssistant(true);
                                  setActiveItem(item);
                                  setAiEditingField(field);
                                }}
                                showAIButton={true}
                              />
                            </div>
                          </div>
                          
                          {/* Date de publication */}
                          <div className="space-y-2">
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                              Date de publication
                            </label>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <EditableCell
                                item={it}
                                field="date_brute"
                                isEditing={editingCell?.id === it.id && editingCell?.field === 'date_brute'}
                                editingValue={editingCell?.value || ''}
                                onStartEdit={handleStartEditing}
                                onValueChange={(value) => setEditingCell(prev => prev ? { ...prev, value } : null)}
                                onSaveEdit={handleSaveEdit}
                              />
                            </div>
                          </div>
                          
                          {/* Plateformes */}
                          <div className="space-y-2">
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                              Plateformes cibles
                            </label>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <PlatformsCell
                                item={it}
                                isEditing={editingPlatformsForId === it.id}
                                onStartEdit={setEditingPlatformsForId}
                                onTogglePlatform={handleTogglePlatform}
                              />
                            </div>
                          </div>
                          
                          {/* Images */}
                          <div className="space-y-2">
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                              Visuels & Médias
                            </label>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <ImageCell
                                item={it}
                                onImageUpload={handleImageUpload}
                                onImageClick={(images, index) => {
                                  setSelectedImageIndex(index);
                                  setSelectedImages(images);
                                }}
                                uploading={uploading}
                              />
                            </div>
                          </div>
                          
                          {/* Description */}
                          <div className="space-y-2 md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                              Description & Contenu
                            </label>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <EditableCell
                                item={it}
                                field="description"
                                isEditing={editingCell?.id === it.id && editingCell?.field === 'description'}
                                editingValue={editingCell?.value || ''}
                                onStartEdit={handleStartEditing}
                                onValueChange={(value) => setEditingCell(prev => prev ? { ...prev, value } : null)}
                                onSaveEdit={handleSaveEdit}
                                onShowAI={(item, field) => {
                                  setShowAIAssistant(true);
                                  setActiveItem(item);
                                  setAiEditingField(field);
                                }}
                                showAIButton={true}
                              />
                            </div>
                          </div>
                          
                          {/* Informations */}
                          <div className="space-y-2">
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                              Informations
                            </label>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <InformationsCell
                                item={it}
                                isEditing={editingCell?.id === it.id && editingCell?.field === 'informations'}
                                editingValue={editingCell?.value || ''}
                                onStartEdit={handleStartEditing}
                                onValueChange={(value) => setEditingCell(prev => prev ? { ...prev, value } : null)}
                                onSaveEdit={handleSaveEdit}
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions en bas */}
                        <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                            <span className="text-sm text-gray-600">Publication #{it.id.slice(-6)}</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <PlatformSelector
                              item={it}
                              onPreview={() => {
                                setPreviewItem(it);
                                setPreviewPlatform(null);
                              }}
                            />
                            <button
                              onClick={() => handlePublish(it)}
                              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 text-sm font-medium transition-all duration-200"
                            >
                              <Send className="w-4 h-4" />
                              Publier maintenant
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
          </table>
        </div>
      </div>
      
      {/* Empty State */}
      {filteredAndSortedItems.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Database className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {items.length === 0 ? 'Aucune publication' : 'Aucun résultat trouvé'}
          </h3>
          <p className="text-gray-500 mb-6">
            {items.length === 0 
              ? 'Créez votre première publication pour commencer'
              : 'Essayez de modifier vos critères de recherche'
            }
          </p>
          {items.length === 0 && (
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Créer ma première publication
            </button>
          )}
        </div>
      )}
      
      {/* Footer with pagination info */}
      {filteredAndSortedItems.length > 0 && (
        <div className="mt-6 px-6 py-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>Total : {items.length} publications</span>
              <div className="h-4 border-l border-gray-300"></div>
              <span>Affichées : {filteredAndSortedItems.length}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>{items.filter(item => item.status === 'Publiée').length} Publiées</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>{items.filter(item => item.status === 'Planifiée').length} Planifiées</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span>{items.filter(item => item.status === 'Brouillon').length} Brouillons</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {selectedItem && (
        <EditModal
          item={selectedItem}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onUpdate={onUpdate}
        />
      )}
      {selectedImageIndex !== null && selectedImages.length > 0 && (
        <ImagePreview
          images={selectedImages}
          initialIndex={selectedImageIndex}
          onClose={() => {
            setSelectedImageIndex(null);
            setSelectedImages([]);
          }}
          onVote={(image, vote) => {
            const currentItem = items.find(item =>
              item.images.some(img => img.filename === image.filename)
            );
            if (currentItem) {
              handleVoteImage(currentItem.id, image, vote);
            }
          }}
          onDelete={handleDeleteImage}
        />
      )}
      {previewItem && (
        <PostPreview
          item={previewItem}
          platform={previewPlatform}
          onClose={() => {
            setPreviewItem(null);
            setPreviewPlatform(null);
          }}
          onPlatformChange={setPreviewPlatform}
        />
      )}
      {showAIAssistant && activeItem && (
        <AIAssistant
          item={activeItem}
          onClose={() => {
            setShowAIAssistant(false);
            setActiveItem(null);
          }}
          onUpdateName={(newName) => handleUpdateName(activeItem.id, newName)}
          onUpdateDescription={(newDescription) => handleUpdateDescription(activeItem.id, newDescription)}
          editingField={aiEditingField}
        />
      )}
    </div>
  );
}