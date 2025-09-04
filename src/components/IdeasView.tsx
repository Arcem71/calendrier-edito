import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  Plus,
  Search,
  Filter,
  Tag,
  Calendar,
  Star,
  Trash2,
  Edit3,
  Send,
  Brain,
  Clock,
  Target,
  TrendingUp,
  Hash,
  Users,
  Sparkles,
  Copy,
  CheckCircle,
  Archive,
  RotateCcw,
  Wand2,
  Upload,
  X,
  Image
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface IdeasViewProps {
  onOpenAI?: (prompt: string, images?: { url: string; filename: string }[]) => void;
  selectedIdeaId?: string | null;
}

interface PublicationIdea {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'idea' | 'in_progress' | 'generated' | 'published' | 'archived';
  target_platforms: string[];
  target_date?: string;
  wants_carousel?: boolean;
  wants_images?: boolean;
  uploaded_images?: { url: string; filename: string }[];
  generated_content?: {
    title: string;
    description: string;
    hashtags: string[];
    best_time?: string;
    platforms_advice?: Record<string, string>;
  };
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
}

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800'
};

const statusColors = {
  idea: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-orange-100 text-orange-800',
  generated: 'bg-purple-100 text-purple-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800'
};

export function IdeasView({ onOpenAI, selectedIdeaId }: IdeasViewProps = {}) {
  const [ideas, setIdeas] = useState<PublicationIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<PublicationIdea | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as PublicationIdea['priority'],
    target_platforms: [] as string[],
    target_date: '',
    wants_carousel: false,
    wants_images: false,
    uploaded_images: [] as { url: string; filename: string }[]
  });

  const platforms = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'Twitter', 'YouTube'];

  useEffect(() => {
    fetchIdeas();
  }, []);

  useEffect(() => {
    if (selectedIdeaId && ideas.length > 0) {
      const idea = ideas.find(i => i.id === selectedIdeaId);
      if (idea) {
        openEditModal(idea);
      }
    }
  }, [selectedIdeaId, ideas]);

  const fetchIdeas = async () => {
    try {
      const storedIdeas = localStorage.getItem('socialMediaIdeas');
      const parsedIdeas = storedIdeas ? JSON.parse(storedIdeas) : [];
      setIdeas(parsedIdeas);
    } catch (error) {
      console.error('Error fetching ideas:', error);
      toast.error('Erreur lors du chargement des idées');
    } finally {
      setLoading(false);
    }
  };

  const saveIdea = async () => {
    try {
      const ideaData = {
        ...formData,
        id: editingIdea?.id || uuidv4(),
        status: editingIdea?.status || 'idea',
        is_favorite: editingIdea?.is_favorite || false,
        created_at: editingIdea?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const storedIdeas = localStorage.getItem('socialMediaIdeas');
      const existingIdeas = storedIdeas ? JSON.parse(storedIdeas) : [];
      
      let updatedIdeas;
      if (editingIdea) {
        updatedIdeas = existingIdeas.map((idea: PublicationIdea) => 
          idea.id === editingIdea.id ? ideaData : idea
        );
      } else {
        updatedIdeas = [ideaData, ...existingIdeas];
      }
      
      localStorage.setItem('socialMediaIdeas', JSON.stringify(updatedIdeas));

      toast.success(editingIdea ? 'Idée de post mise à jour 📝' : 'Nouvelle idée de post ajoutée 🚀');
      setIsModalOpen(false);
      resetForm();
      fetchIdeas();
    } catch (error) {
      console.error('Error saving idea:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const generateWithAI = async (idea: PublicationIdea) => {
    let aiPrompt = `Je veux une publication sur ${idea.target_platforms.join(', ') || 'les réseaux sociaux'}, sur le sujet "${idea.title}"`;
    
    if (idea.description) {
      aiPrompt += ` avec comme description : ${idea.description}`;
    }
    
    if (idea.target_date) {
      const targetDate = new Date(idea.target_date);
      aiPrompt += ` et comme date cible : ${targetDate.toLocaleDateString('fr-FR')}`;
    }
    
    if (idea.uploaded_images && idea.uploaded_images.length > 0) {
      aiPrompt += `\\n\\nVoici ${idea.uploaded_images.length === 1 ? "l'image" : "les images"} que j'ai importée${idea.uploaded_images.length === 1 ? '' : 's'} en référence :`;
      idea.uploaded_images.forEach((image, index) => {
        aiPrompt += `\\n- ${image.filename}`;
      });
    } else {
      if (idea.wants_carousel && idea.wants_images) {
        aiPrompt += `. Je veux que tu crées un carousel d'images ET des images individuelles`;
      } else if (idea.wants_carousel) {
        aiPrompt += `. Je veux que tu crées un carousel d'images`;
      } else if (idea.wants_images) {
        aiPrompt += `. Je veux que tu crées des images`;
      }
    }

    if (onOpenAI) {
      onOpenAI(aiPrompt, idea.uploaded_images);
      
      const storedIdeas = localStorage.getItem('socialMediaIdeas');
      const existingIdeas = storedIdeas ? JSON.parse(storedIdeas) : [];
      
      const updatedIdeas = existingIdeas.map((storedIdea: PublicationIdea) => 
        storedIdea.id === idea.id 
          ? { 
              ...storedIdea, 
              status: 'generated',
              updated_at: new Date().toISOString()
            }
          : storedIdea
      );
      
      localStorage.setItem('socialMediaIdeas', JSON.stringify(updatedIdeas));
      fetchIdeas();
      
      toast.success("Message envoyé à l'Assistant IA ! 🤖", {
        duration: 3000,
        icon: '🚀'
      });
    } else {
      toast.error('Assistant IA non disponible');
    }
  };

  const deleteIdea = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette idée de post ?')) return;

    try {
      const storedIdeas = localStorage.getItem('socialMediaIdeas');
      const existingIdeas = storedIdeas ? JSON.parse(storedIdeas) : [];
      
      const updatedIdeas = existingIdeas.filter((idea: PublicationIdea) => idea.id !== id);
      localStorage.setItem('socialMediaIdeas', JSON.stringify(updatedIdeas));
      
      toast.success('Idée de post supprimée 🗑️');
      fetchIdeas();
    } catch (error) {
      console.error('Error deleting idea:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleFavorite = async (idea: PublicationIdea) => {
    try {
      const storedIdeas = localStorage.getItem('socialMediaIdeas');
      const existingIdeas = storedIdeas ? JSON.parse(storedIdeas) : [];
      
      const updatedIdeas = existingIdeas.map((storedIdea: PublicationIdea) => 
        storedIdea.id === idea.id 
          ? { 
              ...storedIdea, 
              is_favorite: !idea.is_favorite,
              updated_at: new Date().toISOString()
            }
          : storedIdea
      );
      
      localStorage.setItem('socialMediaIdeas', JSON.stringify(updatedIdeas));
      fetchIdeas();
    } catch (error) {
      console.error('Error updating favorite:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleImageUpload = (files: File[]) => {
    files.forEach(file => {
      if (file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageUrl = e.target?.result as string;
          const newImage = {
            url: imageUrl,
            filename: file.name
          };
          setFormData(prev => ({
            ...prev,
            uploaded_images: [...prev.uploaded_images, newImage]
          }));
        };
        reader.readAsDataURL(file);
      } else {
        toast.error(`Le fichier ${file.name} n'est pas valide (image < 10MB requis)`);
      }
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      target_platforms: [],
      target_date: '',
      wants_carousel: false,
      wants_images: false,
      uploaded_images: []
    });
    setEditingIdea(null);
  };

  const openEditModal = (idea: PublicationIdea) => {
    setEditingIdea(idea);
    setFormData({
      title: idea.title,
      description: idea.description,
      priority: idea.priority,
      target_platforms: idea.target_platforms,
      target_date: idea.target_date || '',
      wants_carousel: idea.wants_carousel || false,
      wants_images: idea.wants_images || false,
      uploaded_images: idea.uploaded_images || []
    });
    setIsModalOpen(true);
  };

  const filteredIdeas = ideas.filter(idea => {
    const matchesSearch = idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         idea.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !selectedStatus || idea.status === selectedStatus;
    const matchesPriority = !selectedPriority || idea.priority === selectedPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getIdeaStats = () => {
    return {
      total: ideas.length,
      favorites: ideas.filter(idea => idea.is_favorite).length,
      inProgress: ideas.filter(idea => idea.status === 'in_progress').length,
      generated: ideas.filter(idea => idea.status === 'generated').length,
      published: ideas.filter(idea => idea.status === 'published').length
    };
  };

  const stats = getIdeaStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Chargement des idées...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Idées de Posts</h2>
            <p className="text-sm text-gray-500">
              {filteredIdeas.length} idée{filteredIdeas.length !== 1 ? 's' : ''} de post • {stats.favorites} favorite{stats.favorites !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
            title={viewMode === 'grid' ? 'Vue liste' : 'Vue grille'}
          >
            {viewMode === 'grid' ? '☰' : '▦'}
          </button>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2 transition-all duration-200 shadow-lg shadow-yellow-500/25"
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium">Nouvelle idée de post</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Total</span>
          </div>
          <div className="text-xl font-bold text-blue-900">{stats.total}</div>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Favorites</span>
          </div>
          <div className="text-xl font-bold text-yellow-900">{stats.favorites}</div>
        </div>
        
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">En cours</span>
          </div>
          <div className="text-xl font-bold text-orange-900">{stats.inProgress}</div>
        </div>
        
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Générées</span>
          </div>
          <div className="text-xl font-bold text-purple-900">{stats.generated}</div>
        </div>
        
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Publiées</span>
          </div>
          <div className="text-xl font-bold text-green-900">{stats.published}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Rechercher des idées de posts par titre, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-lg flex items-center gap-2 transition-all ${
              showFilters ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtres
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Tous les statuts</option>
              <option value="idea">Idée</option>
              <option value="in_progress">En cours</option>
              <option value="generated">Générée</option>
              <option value="published">Publiée</option>
              <option value="archived">Archivée</option>
            </select>
            
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Toutes les priorités</option>
              <option value="high">Haute</option>
              <option value="medium">Moyenne</option>
              <option value="low">Basse</option>
            </select>
          </div>
        )}
      </div>

      {/* Ideas List/Grid */}
      <div className={viewMode === 'grid' 
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
        : "space-y-4"
      }>
        {filteredIdeas.map(idea => (
          <div
            key={idea.id}
            className={`bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 ${
              idea.is_favorite ? 'ring-2 ring-yellow-200 bg-gradient-to-br from-yellow-50 to-white' : ''
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 line-clamp-1">{idea.title}</h3>
                  {idea.is_favorite && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${statusColors[idea.status]}`}>
                    {idea.status === 'idea' && '💡 Idée'}
                    {idea.status === 'in_progress' && '⏳ En cours'}
                    {idea.status === 'generated' && '🧠 Générée'}
                    {idea.status === 'published' && '✅ Publiée'}
                    {idea.status === 'archived' && '📦 Archivée'}
                  </span>
                  
                  <span className={`px-2 py-1 text-xs rounded-full ${priorityColors[idea.priority]}`}>
                    {idea.priority === 'high' && '🔥 Haute'}
                    {idea.priority === 'medium' && '⚡ Moyenne'}
                    {idea.priority === 'low' && '🌱 Basse'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => toggleFavorite(idea)}
                  className={`p-2 rounded-lg transition-colors ${
                    idea.is_favorite 
                      ? 'text-yellow-500 hover:bg-yellow-100' 
                      : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100'
                  }`}
                  title={idea.is_favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  <Star className={`w-4 h-4 ${idea.is_favorite ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{idea.description}</p>

            {/* Platforms */}
            {idea.target_platforms.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-3 h-3 text-gray-400" />
                <div className="flex gap-1">
                  {idea.target_platforms.map(platform => (
                    <span key={platform} className="text-xs text-gray-600">
                      {platform}
                    </span>
                  )).reduce((prev, curr, index) => index === 0 ? [curr] : [...prev, ', ', curr], [])}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => generateWithAI(idea)}
                disabled={generating === idea.id}
                className="flex-1 px-3 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm rounded-lg hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              >
                {generating === idea.id ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    Génération...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3 h-3" />
                    Générer
                  </>
                )}
              </button>
              
              <button
                onClick={() => openEditModal(idea)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                title="Modifier"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => deleteIdea(idea.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
              <span>
                {new Date(idea.created_at).toLocaleDateString('fr-FR')}
              </span>
              {idea.target_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(idea.target_date).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredIdeas.length === 0 && (
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <Lightbulb className="w-10 h-10 text-yellow-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {ideas.length === 0 ? 'Aucune idée de post pour le moment' : 'Aucune idée trouvée'}
          </h3>
          <p className="text-gray-500 mb-6">
            {ideas.length === 0 
              ? 'Commencez à collecter vos meilleures idées de posts pour les réseaux sociaux'
              : 'Essayez de modifier vos critères de recherche'
            }
          </p>
          {ideas.length === 0 && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Ajouter ma première idée de post
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingIdea ? "Modifier l'idée de post" : "Nouvelle idée de post"}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titre du post *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ex: Post sur les nouveaux produits d'automne"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Décrivez votre idée de post en détail..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priorité
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as PublicationIdea['priority'] })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      <option value="low">🌱 Basse</option>
                      <option value="medium">⚡ Moyenne</option>
                      <option value="high">🔥 Haute</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date cible (optionnel)
                    </label>
                    <input
                      type="date"
                      value={formData.target_date}
                      onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plateformes cibles
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {platforms.map(platform => (
                        <label key={platform} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={formData.target_platforms.includes(platform)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ 
                                  ...formData, 
                                  target_platforms: [...formData.target_platforms, platform]
                                });
                              } else {
                                setFormData({ 
                                  ...formData, 
                                  target_platforms: formData.target_platforms.filter(p => p !== platform)
                                });
                              }
                            }}
                            className="w-4 h-4 text-yellow-500 rounded focus:ring-yellow-500"
                          />
                          <span className="text-sm">{platform}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Options visuelles
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.wants_carousel}
                          onChange={(e) => setFormData({ ...formData, wants_carousel: e.target.checked })}
                          className="w-4 h-4 text-yellow-500 rounded focus:ring-yellow-500"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">🎠 Carousel d'images</span>
                          <span className="text-xs text-gray-500">L'IA créera un carousel</span>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.wants_images}
                          onChange={(e) => setFormData({ ...formData, wants_images: e.target.checked })}
                          className="w-4 h-4 text-yellow-500 rounded focus:ring-yellow-500"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">🖼️ Images individuelles</span>
                          <span className="text-xs text-gray-500">L'IA créera des images</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Image Upload Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Importer vos propres images (optionnel)
                    </label>
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-yellow-400 transition-colors cursor-pointer"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('border-yellow-400', 'bg-yellow-50');
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-yellow-400', 'bg-yellow-50');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-yellow-400', 'bg-yellow-50');
                        const files = Array.from(e.dataTransfer.files);
                        handleImageUpload(files);
                      }}
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-1">
                        Glissez vos images ici ou cliquez pour sélectionner
                      </p>
                      <p className="text-xs text-gray-400">
                        PNG, JPG, GIF jusqu'à 10MB
                      </p>
                      <input
                        id="image-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleImageUpload(Array.from(e.target.files || []))}
                        className="hidden"
                      />
                    </div>
                    
                    {/* Display uploaded images */}
                    {formData.uploaded_images.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {formData.uploaded_images.map((image, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={image.url}
                              alt={image.filename}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              onClick={() => {
                                const newImages = formData.uploaded_images.filter((_, i) => i !== index);
                                setFormData({ ...formData, uploaded_images: newImages });
                              }}
                              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <div className="absolute bottom-1 left-1 right-1 bg-black/50 text-white text-xs p-1 rounded truncate">
                              {image.filename}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={saveIdea}
                  disabled={!formData.title || !formData.description}
                  className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  {editingIdea ? "Mettre à jour le post" : "Créer l'idée de post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}