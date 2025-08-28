import React, { useState } from 'react';
import { ContentItem, Platform, ImageInfo } from '../types';
import { Calendar, Edit2, ChevronLeft, ChevronRight, Plus, X, Image as ImageIcon } from 'lucide-react';
import { EditModal } from './EditModal';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { cancelScheduledPublication, schedulePublication } from '../utils/publicationScheduler';

interface CalendarViewProps {
  items: ContentItem[];
  onUpdate: () => void;
}

interface ImagePreviewProps {
  image: ImageInfo;
  onClose: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ image, onClose }) => (
  <div
    className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
    onClick={onClose}
  >
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
    </div>
  </div>
);

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

export function CalendarView({ items, onUpdate }: CalendarViewProps) {
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedImage, setSelectedImage] = useState<ImageInfo | null>(null);
  const [draggedItem, setDraggedItem] = useState<ContentItem | null>(null);
  const [dropTarget, setDropTarget] = useState<Date | null>(null);
  
  // Nouveaux états pour les améliorations
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);

  const handleEdit = (item: ContentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleAddNew = (date: Date) => {
    const newItem: ContentItem = {
      id: '',
      name: '',
      status: 'En Attente de Validation',
      date_brute: date.toISOString().split('T')[0],
      platforms: [],
      description: '',
      images: [],
    };
    setSelectedItem(newItem);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    setIsModalOpen(false);
  };

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const handleDragStart = (e: React.DragEvent, item: ContentItem) => {
    e.stopPropagation();
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(date);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const cellWidth = rect.width;
    
    // Adjust the date based on the mouse position within the cell
    const adjustedDate = new Date(date);
    if (mouseX > cellWidth / 2) {
      adjustedDate.setDate(adjustedDate.getDate() + 1);
    }

    const newDate = adjustedDate.toISOString().split('T')[0];
    const oldDate = draggedItem.date_brute;
    
    try {
      // Si c'est une publication programmée et qu'on change la date, reprogrammer
      if (draggedItem.status === 'Planifiée' && oldDate !== newDate) {
        console.log(`📅 Reprogrammation de la publication: ${draggedItem.name}`);
        
        // Annuler l'ancienne programmation
        cancelScheduledPublication(draggedItem.id);
        
        // Programmer pour la nouvelle date
        const scheduledDate = new Date(`${newDate}T09:00:00`);
        const now = new Date();
        
        if (scheduledDate > now) {
          schedulePublication({
            id: draggedItem.id,
            name: draggedItem.name,
            date: newDate,
            platforms: draggedItem.platforms,
            description: draggedItem.description,
            images: draggedItem.images,
            informations: draggedItem.informations,
            scheduledDate
          });
          toast.success(
            `Publication reprogrammée pour le ${scheduledDate.toLocaleDateString('fr-FR')} à 9h00`,
            { duration: 4000, icon: '⏰' }
          );
        } else {
          toast.error('Impossible de programmer une publication pour une date passée', { duration: 4000 });
          return; // Ne pas mettre à jour la date si elle est passée
        }
      }
      
      const { error } = await supabase
        .from('editorial_calendar')
        .update({ date_brute: newDate })
        .eq('id', draggedItem.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error updating date:', error);
      toast.error('Erreur lors de la mise à jour de la date', { duration: 3000 });
    } finally {
      setDraggedItem(null);
      setDropTarget(null);
    }
  };

  // FONCTION PRINCIPALE DE SUPPRESSION D'IMAGE POUR LE CALENDRIER VIA EDGE FUNCTION
  const handleDeleteImage = async (itemId: string, imageToDelete: ImageInfo) => {
    console.log('=== DÉBUT SUPPRESSION IMAGE (CALENDRIER) VIA EDGE FUNCTION ===');
    console.log('Image à supprimer:', imageToDelete);
    console.log('Item ID:', itemId);

    try {
      // Appeler l'edge function pour supprimer l'image
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: imageToDelete.filename,
          itemId: itemId
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
      
      // Fermer la prévisualisation si c'était l'image affichée
      if (selectedImage && selectedImage.filename === imageToDelete.filename) {
        setSelectedImage(null);
      }
      
      toast.success('Image supprimée avec succès du stockage Supabase');
      console.log('✅ SUPPRESSION COMPLÈTE RÉUSSIE (CALENDRIER) VIA EDGE FUNCTION');
      console.log('=== FIN SUPPRESSION IMAGE (CALENDRIER) VIA EDGE FUNCTION ===');
      
    } catch (error) {
      console.error('❌ ERREUR LORS DE LA SUPPRESSION (CALENDRIER) VIA EDGE FUNCTION:', error);
      toast.error(`Erreur lors de la suppression: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const firstDayWeekday = firstDayOfMonth.getDay();

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(7).fill(null);

  for (let i = 0; i < daysInMonth; i++) {
    const dayIndex = (firstDayWeekday + i) % 7;
    if (dayIndex === 0 && i !== 0) {
      weeks.push([...week]);
      week = Array(7).fill(null);
    }
    week[dayIndex] = i + 1;
  }
  if (week.some((d) => d !== null)) weeks.push(week);

  const getStatusClasses = (status: string): string => {
    switch (status) {
      case 'Publiée':
        return 'bg-green-100 text-green-800';
      case 'En Attente de Validation':
        return 'bg-yellow-100 text-yellow-800';
      case 'Planifiée':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const normaliseImages = (raw: unknown): ImageInfo[] => {
    if (!raw) return [];

    if (Array.isArray(raw)) {
      return raw.flatMap((el) => normaliseImages(el));
    }

    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return normaliseImages(parsed);
      } catch {
        return [];
      }
    }

    return [raw as ImageInfo];
  };

  // Nouvelles fonctions utiles
  const getFilteredItems = (dayItems: ContentItem[]) => {
    let filtered = dayItems;
    
    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter);
    }
    
    if (platformFilter) {
      filtered = filtered.filter(item => 
        item.platforms.some(p => p.toLowerCase().includes(platformFilter.toLowerCase()))
      );
    }
    
    return filtered;
  };

  const getMonthlyStats = () => {
    const monthItems = items.filter(item => {
      const itemDate = new Date(item.date_brute);
      return itemDate.getMonth() === currentDate.getMonth() && 
             itemDate.getFullYear() === currentDate.getFullYear();
    });

    return {
      total: monthItems.length,
      published: monthItems.filter(item => item.status === 'Publiée').length,
      scheduled: monthItems.filter(item => item.status === 'Planifiée').length,
      pending: monthItems.filter(item => item.status === 'En Attente de Validation').length,
      draft: monthItems.filter(item => item.status === 'Brouillon').length,
    };
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const jumpToDate = (date: Date) => {
    setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
    setShowMiniCalendar(false);
  };

  const monthlyStats = getMonthlyStats();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Calendrier éditorial</h2>
            <p className="text-sm text-gray-500">
              {monthlyStats.total} publication{monthlyStats.total !== 1 ? 's' : ''} ce mois • {monthlyStats.published} publiée{monthlyStats.published !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Quick Stats */}
          <div className="flex items-center gap-2">
            <div className="px-2 py-1 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm">
              <span className="font-medium">{monthlyStats.published}</span> Publiées
            </div>
            <div className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 text-sm">
              <span className="font-medium">{monthlyStats.scheduled}</span> Planifiées
            </div>
            <div className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded-lg border border-yellow-200 text-sm">
              <span className="font-medium">{monthlyStats.pending}</span> En attente
            </div>
          </div>
          
          <div className="h-6 border-l border-gray-300"></div>
          
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button 
              onClick={goToToday}
              className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
            >
              Aujourd'hui
            </button>
            <button 
              onClick={() => changeMonth(-1)} 
              className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowMiniCalendar(!showMiniCalendar)}
                className="px-4 py-2 font-semibold text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-200 min-w-[140px] text-center"
              >
                {currentDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
              </button>
              
              {/* Mini Calendar Popup */}
              {showMiniCalendar && (
                <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 p-4">
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 12 }, (_, i) => {
                      const monthDate = new Date(currentDate.getFullYear(), i, 1);
                      return (
                        <button
                          key={i}
                          onClick={() => jumpToDate(monthDate)}
                          className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                            i === currentDate.getMonth()
                              ? 'bg-blue-500 text-white'
                              : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          {monthDate.toLocaleString('fr-FR', { month: 'short' })}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => changeMonth(1)} 
              className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="mb-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Filtres :</span>
          
          {/* Status Filter */}
          <select
            value={statusFilter || ''}
            onChange={(e) => setStatusFilter(e.target.value || null)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
          >
            <option value="">Tous les statuts</option>
            <option value="Publiée">Publiées</option>
            <option value="Planifiée">Planifiées</option>
            <option value="En Attente de Validation">En attente</option>
            <option value="Brouillon">Brouillons</option>
          </select>
          
          {/* Platform Filter */}
          <select
            value={platformFilter || ''}
            onChange={(e) => setPlatformFilter(e.target.value || null)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
          >
            <option value="">Toutes plateformes</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
            <option value="twitter">Twitter</option>
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
            <option value="blog">Blog</option>
          </select>
          
          {(statusFilter || platformFilter) && (
            <button
              onClick={() => {
                setStatusFilter(null);
                setPlatformFilter(null);
              }}
              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-all duration-200"
            >
              ✕ Effacer
            </button>
          )}
        </div>
        
        <div className="flex-1"></div>
        
        <div className="text-sm text-gray-500">
          Glissez-déposez les publications pour changer leur date
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-7 bg-white border-b border-gray-200">
          {['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map((d, idx) => (
            <div key={d} className="px-4 py-3 text-center font-semibold text-gray-700 border-r border-gray-200 last:border-r-0">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d.slice(0, 3)}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 divide-x divide-gray-200">
          {weeks.map((w, wi) => (
            <React.Fragment key={wi}>
              {w.map((day, di) => {
                const date = day ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day) : null;
                const dayItems = date
                  ? getFilteredItems(items.filter((it) => new Date(it.date_brute).toDateString() === date.toDateString()))
                  : [];
                const isDropTarget = dropTarget && date && dropTarget.toDateString() === date.toDateString();
                const isToday = date?.toDateString() === new Date().toDateString();
                const isWeekend = date && (date.getDay() === 0 || date.getDay() === 6);

                return (
                  <div
                    key={`${wi}-${di}`}
                    className={`min-h-[160px] p-3 relative group cursor-pointer transition-all duration-200 ${
                      day 
                        ? isWeekend 
                          ? 'bg-gray-50 hover:bg-gray-100'
                          : 'bg-white hover:bg-blue-50'
                        : 'bg-gray-100'
                    } ${isToday ? 'bg-blue-50 ring-2 ring-blue-200' : ''}
                    ${isDropTarget ? 'bg-blue-100 ring-2 ring-blue-300' : ''}
                    ${wi > 0 ? 'border-t border-gray-200' : ''}`}
                    onClick={() => date && handleAddNew(date)}
                    onDragOver={(e) => date && handleDragOver(e, date)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => date && handleDrop(e, date)}
                  >
                    {day && (
                      <>
                        {/* Day Number */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-semibold ${
                            isToday 
                              ? 'w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs'
                              : isWeekend 
                                ? 'text-gray-500' 
                                : 'text-gray-700'
                          }`}>
                            {day}
                          </span>
                          {dayItems.length > 0 && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                              {dayItems.length}
                            </span>
                          )}
                        </div>
                        
                        {/* Publications */}
                        <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
                          {dayItems.slice(0, 3).map((item) => {
                            const images = normaliseImages(item.images);
                            return (
                              <div
                                key={item.id}
                                className={`p-2 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-sm ${getStatusClasses(item.status)}`}
                                onClick={(e) => handleEdit(item, e)}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item)}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium truncate flex-1 pr-1">
                                    {item.name || 'Sans titre'}
                                  </span>
                                  <Edit2 className="w-3 h-3 flex-shrink-0 opacity-60" />
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  {/* Platforms */}
                                  <div className="flex gap-1">
                                    {item.platforms.slice(0, 3).map((p) => {
                                      const platform = p.toLowerCase();
                                      let icon = '●';
                                      if (platform.includes('instagram')) icon = '📷';
                                      else if (platform.includes('facebook')) icon = '👥';
                                      else if (platform.includes('linkedin')) icon = '💼';
                                      else if (platform.includes('twitter')) icon = '🐦';
                                      else if (platform.includes('youtube')) icon = '📺';
                                      else if (platform.includes('tiktok')) icon = '🎵';
                                      
                                      return (
                                        <span key={p} className="text-xs" title={p}>
                                          {icon}
                                        </span>
                                      );
                                    })}
                                    {item.platforms.length > 3 && (
                                      <span className="text-xs text-gray-500">+{item.platforms.length - 3}</span>
                                    )}
                                  </div>
                                  
                                  {/* Images indicator */}
                                  {images.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      <div className="flex -space-x-1">
                                        {images.slice(0, 2).map((img, idx) => (
                                          <div
                                            key={img.filename || idx}
                                            className="w-4 h-4 rounded-full border border-white overflow-hidden cursor-pointer"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedImage(img);
                                            }}
                                          >
                                            <img
                                              src={img.url}
                                              alt=""
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = 'https://placehold.co/16x16?text=?';
                                              }}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                      {images.length > 2 && (
                                        <span className="text-xs text-gray-500">+{images.length - 2}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Show more indicator */}
                          {dayItems.length > 3 && (
                            <div className="text-xs text-gray-500 text-center py-1">
                              +{dayItems.length - 3} autre{dayItems.length - 3 > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                        
                        {/* Add button */}
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                          <button
                            className="w-6 h-6 bg-blue-500 text-white rounded-full hover:bg-blue-600 flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddNew(date);
                            }}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
          <span>Publiées</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
          <span>Planifiées</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
          <span>En attente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
          <span>Brouillons</span>
        </div>
      </div>

      {/* Modals */}
      {selectedItem && (
        <EditModal 
          item={selectedItem} 
          isOpen={isModalOpen} 
          onClose={handleCloseModal}
          onUpdate={onUpdate} 
        />
      )}
      {selectedImage && <ImagePreview image={selectedImage} onClose={() => setSelectedImage(null)} />}
    </div>
  );
}