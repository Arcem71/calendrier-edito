import React, { useEffect, useState } from 'react';
import { CalendarView } from './components/CalendarView';
import { DatabaseView } from './components/DatabaseView';
import { DashboardView } from './components/DashboardView';
import { AIAssistantView } from './components/AIAssistantView';
import { ProspectionView } from './components/prospection/ProspectionView';
import { LoginForm } from './components/auth/LoginForm';
import { ContentItem, ViewMode } from './types';
import { supabase } from './lib/supabase';
import { useAuth } from './hooks/useAuth';
import { CalendarDays, Database, BarChart3, Bot, Target, LogOut } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

// Importer le planificateur pour l'initialiser
import './utils/scheduler';
import './utils/publicationScheduler';

function App() {
  const { user, loading: authLoading, signOut, isAuthenticated } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchItems = async (showLoading = false) => {
    try {
      setError(null);
      if (showLoading) setLoading(true);

      const { error: connectionError } = await supabase.from('editorial_calendar').select('count');
      if (connectionError) {
        throw new Error('Erreur de connexion à Supabase. Veuillez cliquer sur le bouton "Connect to Supabase" en haut à droite pour établir la connexion.');
      }

      const { data, error } = await supabase
        .from('editorial_calendar')
        .select('*')
        .order('date_brute', { ascending: false });

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Aucune donnée reçue de Supabase');
      }

      const formattedData = data.map(item => ({
        id: item.id,
        name: item.nom,
        status: item.statut,
        date_brute: item.date_brute,
        platforms: item.platformes?.split(',').filter(Boolean) || [],
        description: item.description,
        images: item.images || [],
        informations: item.informations
      }));

      setItems(formattedData);
    } catch (error) {
      console.error('Error fetching items:', error);
      setError(error instanceof Error ? error.message : 'Une erreur est survenue lors de la connexion à Supabase');
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchItems(true);
    }
  }, [isAuthenticated]);

  const handleViewChange = (newMode: ViewMode) => {
    setViewMode(newMode);
    if (newMode !== 'prospection') {
      fetchItems(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Déconnexion réussie !');
    } catch (error) {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const handleAuthSuccess = () => {
    // L'état sera automatiquement mis à jour via useAuth
  };

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />
      
      {/* Bouton de déconnexion discret en haut à droite */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleSignOut}
          className="p-2 rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-red-600 transition-all duration-200 shadow-sm hover:shadow-md"
          title="Se déconnecter"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Calendrier Éditorial</h1>
            {user && (
              <p className="text-gray-600 mt-1">Connecté en tant que {user.email}</p>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => handleViewChange('dashboard')}
              className={`
                px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200
                ${viewMode === 'dashboard'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md'}
              `}
            >
              <BarChart3 className="w-5 h-5" />
              Dashboard
            </button>
            <button
              onClick={() => handleViewChange('calendar')}
              className={`
                px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200
                ${viewMode === 'calendar'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md'}
              `}
            >
              <CalendarDays className="w-5 h-5" />
              Calendrier
            </button>
            <button
              onClick={() => handleViewChange('database')}
              className={`
                px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200
                ${viewMode === 'database'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md'}
              `}
            >
              <Database className="w-5 h-5" />
              Base de données
            </button>
            <button
              onClick={() => handleViewChange('ai')}
              className={`
                px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200
                ${viewMode === 'ai'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md'}
              `}
            >
              <Bot className="w-5 h-5" />
              Assistant IA
            </button>
            <button
              onClick={() => handleViewChange('prospection')}
              className={`
                px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200
                ${viewMode === 'prospection'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 hover:shadow-md'}
              `}
            >
              <Target className="w-5 h-5" />
              Prospection
            </button>
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Erreur de connexion
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        ) : isInitialLoad && loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : viewMode === 'calendar' ? (
          <CalendarView items={items} onUpdate={() => fetchItems(false)} />
        ) : viewMode === 'database' ? (
          <DatabaseView items={items} onUpdate={() => fetchItems(false)} />
        ) : viewMode === 'ai' ? (
          <AIAssistantView />
        ) : viewMode === 'prospection' ? (
          <ProspectionView />
        ) : (
          <DashboardView />
        )}
      </div>
    </div>
  );
}

export default App;