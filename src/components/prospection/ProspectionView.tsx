import React, { useState, useEffect } from 'react';
import { Target, Lightbulb, Database, Loader2, Clock, Play, ChevronDown, ChevronUp, Users, TrendingUp, Activity, Zap, Settings, BarChart3 } from 'lucide-react';
import { SearchRequestItem } from './types';
import { supabase } from '../../lib/supabase';
import { SearchForm } from './SearchForm';
import { FullHistoryTable } from './FullHistoryTable';
import { MessageModal } from './MessageModal';
import { MessageModificationModal } from './MessageModificationModal';
import { EditModal } from './EditModal';
import { parseWebhookTextResponse } from './utils/webhookParser';
import { 
  prospectionScheduler, 
  executeProspectionTaskNow, 
  getNextScheduledRun, 
  isSchedulerRunning 
} from '../../utils/scheduler';
import toast from 'react-hot-toast';

export function ProspectionView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchRequestItem[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [editingItem, setEditingItem] = useState<SearchRequestItem | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<{ message: string; nom: string } | null>(null);
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isStateFilterDropdownOpen, setIsStateFilterDropdownOpen] = useState(false);
  const [dateSortOrder, setDateSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [modifyingItem, setModifyingItem] = useState<SearchRequestItem | null>(null);
  const [bulkConnecting, setBulkConnecting] = useState(false);
  const [bulkPublishing, setBulkPublishing] = useState(false);
  const [nextScheduledRun, setNextScheduledRun] = useState<Date | null>(null);
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [isSchedulerExpanded, setIsSchedulerExpanded] = useState(false);

  // Charger les résultats de recherche depuis Supabase
  const fetchSearchResults = async () => {
    try {
      setLoadingResults(true);
      const { data, error } = await supabase
        .from('search_request')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSearchResults(data || []);
    } catch (error) {
      console.error('Error fetching search results:', error);
      toast.error('Erreur lors du chargement des résultats');
    } finally {
      setLoadingResults(false);
    }
  };

  // Mettre à jour les informations du planificateur
  const updateSchedulerInfo = () => {
    setNextScheduledRun(getNextScheduledRun());
    setSchedulerRunning(isSchedulerRunning());
  };

  useEffect(() => {
    fetchSearchResults();
    updateSchedulerInfo();

    // Mettre à jour les informations du planificateur toutes les minutes
    const interval = setInterval(updateSchedulerInfo, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || loading) return;

    setLoading(true);
    
    try {
      console.log('Sending request to webhook...');
      const response = await fetch('https://n8n.arcem-assurances.fr/webhook/prospection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: searchQuery.trim(),
          nom: 'webhook',
          action: 'creation'
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
      }

      // Clone the response to avoid "body stream already read" error
      const clonedResponse = response.clone();

      // Récupérer la réponse - essayer JSON d'abord, puis texte si ça échoue
      let responseData;
      let parsedProfiles: any[] = [];
      
      try {
        responseData = await response.json();
        console.log('Raw webhook JSON response:', responseData);
        
        // Si c'est un array JSON, traiter comme avant
        if (Array.isArray(responseData)) {
          for (let i = 0; i < responseData.length; i++) {
            const item = responseData[i];
            
            // Extraire le contenu du message depuis message.content
            const messageContent = item?.message?.content || '';
            
            if (messageContent) {
              parsedProfiles.push({
                nom: `Prospect ${i + 1}`,
                secteur: '',
                entreprise: '',
                profil_link: '',
                mbti: '',
                message: messageContent,
                etat: 'en attente d\'acceptation',
                bio: '',
                search_request: searchQuery.trim()
              });
            }
          }
        } else {
          // Si c'est un objet JSON unique
          const messageContent = responseData?.message?.content || responseData?.content || '';
          
          if (messageContent) {
            parsedProfiles.push({
              nom: 'Prospect 1',
              secteur: '',
              entreprise: '',
              profil_link: '',
              mbti: '',
              message: messageContent,
              etat: 'en attente d\'acceptation',
              bio: '',
              search_request: searchQuery.trim()
            });
          }
        }
      } catch (jsonError) {
        console.log('Failed to parse as JSON, trying as text...');
        const responseText = await clonedResponse.text();
        console.log('Raw webhook text response:', responseText);
        
        // Parser le texte structuré
        parsedProfiles = parseWebhookTextResponse(responseText, searchQuery.trim());
      }

      console.log('Final parsed profiles:', parsedProfiles);

      if (parsedProfiles.length === 0) {
        toast.error('Aucun profil trouvé dans la réponse du webhook', { duration: 4000 });
        return;
      }

      // Insérer tous les profils dans la base de données
      const { error: insertError } = await supabase
        .from('search_request')
        .insert(parsedProfiles);

      if (insertError) {
        console.error('Error inserting search request:', insertError);
        toast.error('Erreur lors de la sauvegarde des résultats');
      } else {
        // Rafraîchir les résultats
        await fetchSearchResults();
        
        // Message de succès avec le nombre de profils trouvés
        const count = parsedProfiles.length;
        toast.success(
          `${count} ${count > 1 ? 'profils générés et sauvegardés' : 'profil généré et sauvegardé'} !`,
          {
            duration: 4000,
            icon: '🎯'
          }
        );
      }

      // Vider le champ de recherche
      setSearchQuery('');

    } catch (error) {
      console.error('Error in prospection search:', error);
      toast.error(
        `Erreur lors de la recherche: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        { duration: 5000 }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) return;

    try {
      const { error } = await supabase
        .from('search_request')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchSearchResults();
      toast.success('Entrée supprimée avec succès');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleUpdateItem = async (item: SearchRequestItem) => {
    try {
      const { error } = await supabase
        .from('search_request')
        .update({
          nom: item.nom,
          secteur: item.secteur,
          entreprise: item.entreprise,
          profil_link: item.profil_link,
          mbti: item.mbti,
          etat: item.etat,
          bio: item.bio,
          search_request: item.search_request
        })
        .eq('id', item.id);

      if (error) throw error;

      await fetchSearchResults();
      setEditingItem(null);
      toast.success('Entrée mise à jour avec succès');
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleConnectionAction = async (item: SearchRequestItem) => {
    if (!item.profil_link) {
      toast.error('Aucun lien LinkedIn disponible');
      return;
    }

    if (item.etat?.toLowerCase() === 'refusé') {
      toast.error('Ce profil a été refusé et ne peut pas être connecté');
      return;
    }

    try {
      const response = await fetch('https://n8n.arcem-assurances.fr/webhook/prospection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'connexion',
          'lien LinkedIn': item.profil_link
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.text();
      
      // Mettre à jour l'état dans la base de données
      const { error } = await supabase
        .from('search_request')
        .update({ etat: result.trim() })
        .eq('id', item.id);

      if (error) throw error;

      await fetchSearchResults();
      toast.success(`État mis à jour: ${result.trim()}`);

    } catch (error) {
      console.error('Error in connection action:', error);
      toast.error(`Erreur lors de la connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const handlePublishAction = async (item: SearchRequestItem) => {
    if (item.etat === 'publié') {
      toast('Ce message a déjà été publié', { duration: 3000 });
      return;
    }

    if (item.etat?.toLowerCase() === 'refusé') {
      toast.error('Ce profil a été refusé et ne peut pas être publié');
      return;
    }

    if (!item.profil_link) {
      toast.error('Aucun lien LinkedIn disponible');
      return;
    }

    if (!item.message) {
      toast.error('Aucun message disponible');
      return;
    }

    try {
      const response = await fetch('https://n8n.arcem-assurances.fr/webhook/prospection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'publier',
          'lien LinkedIn': item.profil_link,
          message: item.message
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
      }

      // Mettre à jour l'état à "publié" dans la base de données
      const { error } = await supabase
        .from('search_request')
        .update({ etat: 'publié' })
        .eq('id', item.id);

      if (error) throw error;

      await fetchSearchResults();
      toast.success('Message publié avec succès !');

    } catch (error) {
      console.error('Error in publish action:', error);
      toast.error(`Erreur lors de la publication: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  // Fonction pour exécuter manuellement la tâche quotidienne
  const handleManualExecution = async () => {
    try {
      setSchedulerRunning(true);
      toast('Exécution manuelle de la vérification des profils en cours...', { duration: 3000 });
      
      await executeProspectionTaskNow();
      
      toast.success('Vérification des profils en attente terminée !', { duration: 4000 });
    } catch (error) {
      console.error('Error in manual execution:', error);
      toast.error('Erreur lors de l\'exécution manuelle', { duration: 4000 });
    } finally {
      setSchedulerRunning(false);
      updateSchedulerInfo();
    }
  };

  // Fonction pour la connexion en masse
  const handleBulkConnection = async () => {
    // Filtrer les profils éligibles selon le secteur sélectionné
    const baseResults = selectedSector 
      ? searchResults.filter(item => item.secteur === selectedSector)
      : searchResults;

    const eligibleProfiles = baseResults.filter(item => 
      item.etat?.toLowerCase() !== 'publié' && 
      item.etat?.toLowerCase() !== 'connecté' &&
      item.etat?.toLowerCase() !== 'refusé' &&
      item.profil_link
    );

    if (eligibleProfiles.length === 0) {
      toast.error('Aucun profil éligible pour la connexion');
      return;
    }

    setBulkConnecting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const connectionSectorText = selectedSector ? ` du secteur ${selectedSector}` : '';
      toast(`Début de la connexion en masse${connectionSectorText} pour ${eligibleProfiles.length} profil${eligibleProfiles.length > 1 ? 's' : ''}...`, {
        duration: 3000,
        icon: '🚀'
      });

      // Traiter chaque profil un par un
      for (let i = 0; i < eligibleProfiles.length; i++) {
        const item = eligibleProfiles[i];
        
        try {
          console.log(`Connexion ${i + 1}/${eligibleProfiles.length}: ${item.nom}`);
          
          const response = await fetch('https://n8n.arcem-assurances.fr/webhook/prospection', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'connexion',
              'lien LinkedIn': item.profil_link
            }),
          });

          if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.text();
          
          // Mettre à jour l'état dans la base de données
          const { error } = await supabase
            .from('search_request')
            .update({ etat: result.trim() })
            .eq('id', item.id);

          if (error) throw error;

          successCount++;
          console.log(`✅ Connexion réussie pour ${item.nom}: ${result.trim()}`);

          // Petite pause entre les appels pour éviter de surcharger le webhook
          if (i < eligibleProfiles.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

        } catch (error) {
          errorCount++;
          console.error(`❌ Erreur pour ${item.nom}:`, error);
        }
      }

      // Rafraîchir les résultats
      await fetchSearchResults();

      // Message de résumé
      const connectionSectorTextSummary = selectedSector ? ` du secteur ${selectedSector}` : '';
      if (successCount > 0 && errorCount === 0) {
        toast.success(
          `🎉 Connexion en masse${connectionSectorTextSummary} terminée avec succès !\n${successCount} profil${successCount > 1 ? 's' : ''} traité${successCount > 1 ? 's' : ''}`,
          { duration: 5000 }
        );
      } else if (successCount > 0 && errorCount > 0) {
        toast(
          `⚠️ Connexion en masse${connectionSectorTextSummary} terminée avec des erreurs\n✅ ${successCount} réussi${successCount > 1 ? 's' : ''}\n❌ ${errorCount} échec${errorCount > 1 ? 's' : ''}`,
          { duration: 5000 }
        );
      } else {
        toast.error(
          `❌ Échec de la connexion en masse${connectionSectorTextSummary}\nAucun profil n'a pu être traité`,
          { duration: 5000 }
        );
      }

    } catch (error) {
      console.error('Error in bulk connection:', error);
      toast.error(`Erreur lors de la connexion en masse: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setBulkConnecting(false);
    }
  };

  // Fonction pour la publication en masse
  const handleBulkPublish = async () => {
    // Filtrer les profils éligibles selon le secteur sélectionné
    const baseResults = selectedSector 
      ? searchResults.filter(item => item.secteur === selectedSector)
      : searchResults;

    const eligibleProfiles = baseResults.filter(item => 
      item.etat?.toLowerCase() === 'connecté' &&
      item.profil_link &&
      item.message
    );

    if (eligibleProfiles.length === 0) {
      toast.error('Aucun profil éligible pour la publication');
      return;
    }

    setBulkPublishing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      const publishSectorText = selectedSector ? ` du secteur ${selectedSector}` : '';
      toast(`Début de la publication en masse${publishSectorText} pour ${eligibleProfiles.length} profil${eligibleProfiles.length > 1 ? 's' : ''}...`, {
        duration: 3000,
        icon: '📤'
      });

      // Traiter chaque profil un par un
      for (let i = 0; i < eligibleProfiles.length; i++) {
        const item = eligibleProfiles[i];
        
        try {
          console.log(`Publication ${i + 1}/${eligibleProfiles.length}: ${item.nom}`);
          
          const response = await fetch('https://n8n.arcem-assurances.fr/webhook/prospection', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'publier',
              'lien LinkedIn': item.profil_link,
              message: item.message
            }),
          });

          if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
          }

          // Mettre à jour l'état à "publié" dans la base de données
          const { error } = await supabase
            .from('search_request')
            .update({ etat: 'publié' })
            .eq('id', item.id);

          if (error) throw error;

          successCount++;
          console.log(`✅ Publication réussie pour ${item.nom}`);

          // Petite pause entre les appels pour éviter de surcharger le webhook
          if (i < eligibleProfiles.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

        } catch (error) {
          errorCount++;
          console.error(`❌ Erreur pour ${item.nom}:`, error);
        }
      }

      // Rafraîchir les résultats
      await fetchSearchResults();

      // Message de résumé
      const publishSectorTextSummary = selectedSector ? ` du secteur ${selectedSector}` : '';
      if (successCount > 0 && errorCount === 0) {
        toast.success(
          `🎉 Publication en masse${publishSectorTextSummary} terminée avec succès !\n${successCount} profil${successCount > 1 ? 's' : ''} publié${successCount > 1 ? 's' : ''}`,
          { duration: 5000 }
        );
      } else if (successCount > 0 && errorCount > 0) {
        toast(
          `⚠️ Publication en masse${publishSectorTextSummary} terminée avec des erreurs\n✅ ${successCount} réussi${successCount > 1 ? 's' : ''}\n❌ ${errorCount} échec${errorCount > 1 ? 's' : ''}`,
          { duration: 5000 }
        );
      } else {
        toast.error(
          `❌ Échec de la publication en masse${publishSectorTextSummary}\nAucun profil n'a pu être traité`,
          { duration: 5000 }
        );
      }

    } catch (error) {
      console.error('Error in bulk publish:', error);
      toast.error(`Erreur lors de la publication en masse: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setBulkPublishing(false);
    }
  };

  // Obtenir tous les secteurs uniques
  const uniqueSectors = Array.from(new Set(
    searchResults
      .map(item => item.secteur)
      .filter(secteur => secteur && secteur.trim() !== '')
  )).sort();

  // Obtenir tous les états uniques
  const uniqueStates = Array.from(new Set(
    searchResults
      .map(item => item.etat)
      .filter(etat => etat && etat.trim() !== '')
  )).sort();

  // Fonction de tri par date
  const handleDateSort = () => {
    if (dateSortOrder === null || dateSortOrder === 'desc') {
      setDateSortOrder('asc');
    } else {
      setDateSortOrder('desc');
    }
  };

  // Filtrer et trier les résultats
  const filteredAndSortedResults = React.useMemo(() => {
    let filtered = searchResults;

    // Filtrer par secteur
    if (selectedSector) {
      filtered = filtered.filter(item => item.secteur === selectedSector);
    }

    // Filtrer par état
    if (selectedState) {
      filtered = filtered.filter(item => item.etat === selectedState);
    }

    // Trier par date si nécessaire
    if (dateSortOrder) {
      filtered = [...filtered].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    return filtered;
  }, [searchResults, selectedSector, selectedState, dateSortOrder]);

  // Compter les profils en attente d'acceptation
  const pendingProfilesCount = searchResults.filter(item => 
    item.etat?.toLowerCase() === 'en attente d\'acceptation' && 
    item.profil_link
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Hero Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                <Target className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-white">Prospection LinkedIn</h1>
                  <Zap className="w-6 h-6 text-yellow-300 animate-pulse" />
                </div>
                <p className="text-blue-100 text-lg">Génération automatique de prospects ciblés</p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-white" />
                  <div>
                    <div className="text-xl font-bold text-white">{searchResults.length}</div>
                    <div className="text-blue-100 text-sm">Prospects total</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-white" />
                  <div>
                    <div className="text-xl font-bold text-white">
                      {searchResults.filter(item => item.etat?.toLowerCase() === 'connecté').length}
                    </div>
                    <div className="text-blue-100 text-sm">Connectés</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-white" />
                  <div>
                    <div className="text-xl font-bold text-white">
                      {searchResults.filter(item => item.etat?.toLowerCase() === 'publié').length}
                    </div>
                    <div className="text-blue-100 text-sm">Messages envoyés</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">

        {/* Enhanced Scheduler Section */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div 
            className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-5 cursor-pointer hover:from-amber-100 hover:to-orange-100 transition-all duration-200"
            onClick={() => setIsSchedulerExpanded(!isSchedulerExpanded)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">
                    Automatisation intelligente
                  </h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-amber-700 font-medium">
                      {pendingProfilesCount} profil{pendingProfilesCount > 1 ? 's' : ''} en attente
                    </span>
                    <span className="text-gray-500">•</span>
                    <span className="text-amber-600">
                      Prochaine: {nextScheduledRun ? nextScheduledRun.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Non programmée'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                  schedulerRunning 
                    ? 'bg-orange-100 text-orange-700' 
                    : 'bg-green-100 text-green-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    schedulerRunning ? 'bg-orange-500 animate-pulse' : 'bg-green-500'
                  }`}></div>
                  {schedulerRunning ? 'En cours' : 'Actif'}
                </div>
                <div className={`p-2 rounded-lg transition-all duration-200 ${
                  isSchedulerExpanded ? 'bg-amber-200 rotate-180' : 'bg-amber-100 hover:bg-amber-200'
                }`}>
                  <ChevronDown className="w-5 h-5 text-amber-700" />
                </div>
              </div>
            </div>
          </div>

          {/* Section dépliable */}
          {isSchedulerExpanded && (
            <div className="p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="mb-6">
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Comment ça marche ?</h4>
                    <p className="text-blue-800 text-sm leading-relaxed">
                      Chaque jour à 8h00, notre IA vérifie automatiquement le statut de tous les profils en attente d'acceptation 
                      et met à jour leur état LinkedIn en temps réel.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Prochaine exécution</div>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {nextScheduledRun ? nextScheduledRun.toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Non programmée'}
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Profils en attente</div>
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {pendingProfilesCount}
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      schedulerRunning ? 'bg-orange-500' : 'bg-green-500'
                    }`}>
                      <Settings className={`w-4 h-4 text-white ${schedulerRunning ? 'animate-spin' : ''}`} />
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Statut du système</div>
                  </div>
                  <div className={`text-xl font-bold ${
                    schedulerRunning ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {schedulerRunning ? 'Analyse en cours' : 'Prêt'}
                  </div>
                </div>
              </div>

              <button
                onClick={handleManualExecution}
                disabled={schedulerRunning}
                className={`px-6 py-3 rounded-xl flex items-center gap-3 font-semibold transition-all duration-200 shadow-lg ${
                  schedulerRunning
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 hover:shadow-xl hover:-translate-y-1'
                }`}
                title="Exécuter manuellement la vérification des profils en attente"
              >
                {schedulerRunning ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Zap className="w-5 h-5" />
                )}
                {schedulerRunning ? 'Analyse en cours...' : '⚡ Lancer l\'analyse maintenant'}
              </button>
            </div>
          )}
        </div>

        {/* Enhanced Search Form */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-8 py-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Générateur de prospects</h2>
                <p className="text-sm text-gray-600 mt-1">Décrivez votre recherche et laissez notre IA trouver vos prospects idéaux</p>
              </div>
            </div>
          </div>
          <div className="p-8">
            <SearchForm
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              loading={loading}
              onSubmit={handleSubmit}
            />
          </div>
        </div>

        {/* Performance Analytics */}
        {searchResults.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Conversion Funnel */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Entonnoir de conversion</h3>
                    <p className="text-sm text-gray-600 mt-1">Performance de votre processus de prospection</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Funnel steps */}
                {[
                  { 
                    label: 'Prospects générés', 
                    count: searchResults.length, 
                    percentage: 100, 
                    color: 'bg-blue-500',
                    icon: Users
                  },
                  { 
                    label: 'En attente d\'acceptation', 
                    count: searchResults.filter(item => item.etat?.toLowerCase() === 'en attente d\'acceptation').length, 
                    percentage: Math.round((searchResults.filter(item => item.etat?.toLowerCase() === 'en attente d\'acceptation').length / Math.max(searchResults.length, 1)) * 100),
                    color: 'bg-amber-500',
                    icon: Clock
                  },
                  { 
                    label: 'Connectés', 
                    count: searchResults.filter(item => item.etat?.toLowerCase() === 'connecté').length, 
                    percentage: Math.round((searchResults.filter(item => item.etat?.toLowerCase() === 'connecté').length / Math.max(searchResults.length, 1)) * 100),
                    color: 'bg-green-500',
                    icon: Target
                  },
                  { 
                    label: 'Messages envoyés', 
                    count: searchResults.filter(item => item.etat?.toLowerCase() === 'publié').length, 
                    percentage: Math.round((searchResults.filter(item => item.etat?.toLowerCase() === 'publié').length / Math.max(searchResults.length, 1)) * 100),
                    color: 'bg-purple-500',
                    icon: Activity
                  }
                ].map((step, index) => {
                  const IconComponent = step.icon;
                  return (
                    <div key={index} className="flex items-center gap-4">
                      <div className={`w-10 h-10 ${step.color} rounded-lg flex items-center justify-center`}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-800">{step.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-gray-900">{step.count}</span>
                            <span className="text-sm text-gray-500">({step.percentage}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${step.color} transition-all duration-500`}
                            style={{ width: `${step.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Quick Actions Panel */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Actions rapides</h3>
                    <p className="text-sm text-gray-600 mt-1">Automatisez vos processus de prospection</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Bulk actions */}
                <div className="space-y-3">
                  <button
                    onClick={handleBulkConnection}
                    disabled={bulkConnecting || searchResults.filter(item => 
                      item.etat?.toLowerCase() !== 'publié' && 
                      item.etat?.toLowerCase() !== 'connecté' &&
                      item.etat?.toLowerCase() !== 'refusé' &&
                      item.profil_link
                    ).length === 0}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-200 ${
                      bulkConnecting || searchResults.filter(item => 
                        item.etat?.toLowerCase() !== 'publié' && 
                        item.etat?.toLowerCase() !== 'connecté' &&
                        item.etat?.toLowerCase() !== 'refusé' &&
                        item.profil_link
                      ).length === 0
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg hover:-translate-y-1'
                    }`}
                  >
                    {bulkConnecting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Users className="w-5 h-5" />
                    )}
                    <div className="flex-1 text-left">
                      <div className="font-medium">
                        {bulkConnecting ? 'Connexion en cours...' : 'Connexion en masse'}
                      </div>
                      <div className="text-sm opacity-75">
                        {searchResults.filter(item => 
                          item.etat?.toLowerCase() !== 'publié' && 
                          item.etat?.toLowerCase() !== 'connecté' &&
                          item.etat?.toLowerCase() !== 'refusé' &&
                          item.profil_link
                        ).length} profils éligibles
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={handleBulkPublish}
                    disabled={bulkPublishing || searchResults.filter(item => 
                      item.etat?.toLowerCase() === 'connecté' &&
                      item.profil_link &&
                      item.message
                    ).length === 0}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-200 ${
                      bulkPublishing || searchResults.filter(item => 
                        item.etat?.toLowerCase() === 'connecté' &&
                        item.profil_link &&
                        item.message
                      ).length === 0
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-500 to-teal-600 text-white hover:shadow-lg hover:-translate-y-1'
                    }`}
                  >
                    {bulkPublishing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Activity className="w-5 h-5" />
                    )}
                    <div className="flex-1 text-left">
                      <div className="font-medium">
                        {bulkPublishing ? 'Envoi en cours...' : 'Messages en masse'}
                      </div>
                      <div className="text-sm opacity-75">
                        {searchResults.filter(item => 
                          item.etat?.toLowerCase() === 'connecté' &&
                          item.profil_link &&
                          item.message
                        ).length} messages prêts
                      </div>
                    </div>
                  </button>
                </div>
                
                {/* Performance tips */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900 text-sm mb-1">Conseil d'optimisation</h4>
                      <p className="text-xs text-blue-800">
                        {searchResults.filter(item => item.etat?.toLowerCase() === 'connecté').length === 0 
                          ? "Lancez d'abord des connexions pour établir le contact avec vos prospects."
                          : searchResults.filter(item => item.etat?.toLowerCase() === 'publié').length / Math.max(searchResults.filter(item => item.etat?.toLowerCase() === 'connecté').length, 1) < 0.5
                            ? "Pensez à envoyer des messages personnalisés à vos connexions acceptées."
                            : "Excellent ! Continuez à maintenir un bon ratio de conversion."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Results Section */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-8 py-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">Base de prospects</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {filteredAndSortedResults.length} prospect{filteredAndSortedResults.length !== 1 ? 's' : ''} 
                      {selectedSector || selectedState ? ' (filtrés)' : ''}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                    {Math.round((searchResults.filter(item => item.etat?.toLowerCase() === 'connecté').length / Math.max(searchResults.length, 1)) * 100)}% de connexions
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                    {Math.round((searchResults.filter(item => item.etat?.toLowerCase() === 'publié').length / Math.max(searchResults.length, 1)) * 100)}% de messages envoyés
                  </div>
                </div>
              </div>
              
              <div className="px-8 pb-6">
                <FullHistoryTable
                  searchResults={filteredAndSortedResults}
                  uniqueSectors={uniqueSectors}
                  uniqueStates={uniqueStates}
                  selectedSector={selectedSector}
                  selectedState={selectedState}
                  dateSortOrder={dateSortOrder}
                  isFilterDropdownOpen={isFilterDropdownOpen}
                  isStateFilterDropdownOpen={isStateFilterDropdownOpen}
                  onSectorFilter={setSelectedSector}
                  onStateFilter={setSelectedState}
                  onDateSort={handleDateSort}
                  onToggleFilterDropdown={setIsFilterDropdownOpen}
                  onToggleStateFilterDropdown={setIsStateFilterDropdownOpen}
                  onEditItem={setEditingItem}
                  onDeleteItem={handleDeleteItem}
                  onShowMessage={setSelectedMessage}
                  onModifyMessage={setModifyingItem}
                  onConnectionAction={handleConnectionAction}
                  onPublishAction={handlePublishAction}
                  onBulkConnection={handleBulkConnection}
                  onBulkPublish={handleBulkPublish}
                />
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Empty State */}
        {!loadingResults && searchResults.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Target className="w-12 h-12 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">Prêt à générer vos premiers prospects ?</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Utilisez notre IA pour identifier et générer automatiquement des prospects qualifiés selon vos critères.
            </p>
            <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">1</span>
                </div>
                <span>Décrivez votre recherche</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <span>L'IA génère les profils</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-bold">3</span>
                </div>
                <span>Connectez et prospectez</span>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Loading State */}
        {(loadingResults || bulkConnecting || bulkPublishing) && (
          <div className="bg-white rounded-2xl shadow-xl p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {bulkConnecting ? 'Connexion en masse active' : 
                 bulkPublishing ? 'Envoi des messages en cours' : 
                 'Chargement des données'}
              </h3>
              <p className="text-gray-600">
                {bulkConnecting ? 'Traitement des connexions LinkedIn...' : 
                 bulkPublishing ? 'Envoi des messages personnalisés...' : 
                 'Veuillez patienter pendant le chargement'}
              </p>
              
              {(bulkConnecting || bulkPublishing) && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    💪 Cette opération peut prendre quelques minutes selon le nombre de profils à traiter
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Modals */}
      {editingItem && (
        <EditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onUpdate={handleUpdateItem}
        />
      )}

      {selectedMessage && (
        <MessageModal
          message={selectedMessage.message}
          nom={selectedMessage.nom}
          onClose={() => setSelectedMessage(null)}
        />
      )}

      {modifyingItem && (
        <MessageModificationModal
          item={modifyingItem}
          onClose={() => setModifyingItem(null)}
          onUpdate={fetchSearchResults}
        />
      )}
      </div>
    </div>
  );
}