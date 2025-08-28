import React from 'react';
import { Database, User, Building2, Briefcase, FileText, Filter, ChevronDown, ArrowUp, ArrowDown, ArrowUpDown, Edit2, Trash2, ExternalLink, Bot, Share, Link, Users, Send } from 'lucide-react';
import { SearchRequestItem } from './types';
import { getStatusIcon, getStatusClasses, formatDate } from './utils/helpers';

interface FullHistoryTableProps {
  searchResults: SearchRequestItem[];
  uniqueSectors: string[];
  uniqueStates: string[];
  selectedSector: string;
  selectedState: string;
  dateSortOrder: 'asc' | 'desc' | null;
  isFilterDropdownOpen: boolean;
  isStateFilterDropdownOpen: boolean;
  onSectorFilter: (sector: string) => void;
  onStateFilter: (state: string) => void;
  onDateSort: () => void;
  onToggleFilterDropdown: (open: boolean) => void;
  onToggleStateFilterDropdown: (open: boolean) => void;
  onEditItem: (item: SearchRequestItem) => void;
  onDeleteItem: (id: string) => void;
  onShowMessage: (message: { message: string; nom: string }) => void;
  onModifyMessage: (item: SearchRequestItem) => void;
  onConnectionAction: (item: SearchRequestItem) => void;
  onPublishAction: (item: SearchRequestItem) => void;
  onBulkConnection: () => void;
  onBulkPublish: () => void;
}

export const FullHistoryTable: React.FC<FullHistoryTableProps> = ({
  searchResults,
  uniqueSectors,
  uniqueStates,
  selectedSector,
  selectedState,
  dateSortOrder,
  isFilterDropdownOpen,
  isStateFilterDropdownOpen,
  onSectorFilter,
  onStateFilter,
  onDateSort,
  onToggleFilterDropdown,
  onToggleStateFilterDropdown,
  onEditItem,
  onDeleteItem,
  onShowMessage,
  onModifyMessage,
  onConnectionAction,
  onPublishAction,
  onBulkConnection,
  onBulkPublish
}) => {
  // Filtrer les résultats selon le secteur sélectionné
  const filteredResults = selectedSector 
    ? searchResults.filter(item => item.secteur === selectedSector)
    : searchResults;

  // Compter les profils éligibles pour la connexion en masse (basé sur les résultats filtrés)
  const eligibleConnectionProfiles = filteredResults.filter(item => 
    item.etat?.toLowerCase() !== 'publié' && 
    item.etat?.toLowerCase() !== 'connecté' &&
    item.etat?.toLowerCase() !== 'refusé' &&
    item.profil_link
  );

  // Compter les profils éligibles pour la publication en masse (basé sur les résultats filtrés)
  const eligiblePublishProfiles = filteredResults.filter(item => 
    item.etat?.toLowerCase() === 'connecté' &&
    item.profil_link &&
    item.message
  );

  return (
    <div className="mt-8 bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Database className="w-6 h-6 text-purple-500" />
            Historique complet des recherches ({searchResults.length} résultat{searchResults.length > 1 ? 's' : ''})
            {selectedSector && (
              <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                Secteur: {selectedSector}
              </span>
            )}
          </h2>
          
          {/* Boutons d'actions en masse */}
          <div className="flex gap-3">
            <button
              onClick={onBulkConnection}
              disabled={eligibleConnectionProfiles.length === 0}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${
                eligibleConnectionProfiles.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-500 text-white hover:bg-green-600 hover:scale-105 shadow-lg'
              }`}
              title={`Connecter tous les profils non connectés/publiés/refusés${selectedSector ? ` du secteur ${selectedSector}` : ''} (${eligibleConnectionProfiles.length} profil${eligibleConnectionProfiles.length > 1 ? 's' : ''})`}
            >
              <Users className="w-5 h-5" />
              Connexion ({eligibleConnectionProfiles.length})
            </button>
            
            <button
              onClick={onBulkPublish}
              disabled={eligiblePublishProfiles.length === 0}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${
                eligiblePublishProfiles.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-500 text-white hover:bg-purple-600 hover:scale-105 shadow-lg'
              }`}
              title={`Publier tous les profils connectés${selectedSector ? ` du secteur ${selectedSector}` : ''} (${eligiblePublishProfiles.length} profil${eligiblePublishProfiles.length > 1 ? 's' : ''})`}
            >
              <Send className="w-5 h-5" />
              Publier ({eligiblePublishProfiles.length})
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nom
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Secteur
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => onToggleFilterDropdown(!isFilterDropdownOpen)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Filter className="w-3 h-3" />
                      <ChevronDown className={`w-3 h-3 transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isFilterDropdownOpen && (
                      <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <div className="p-2">
                          <button
                            onClick={() => {
                              onSectorFilter('');
                              onToggleFilterDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                              !selectedSector ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                            }`}
                          >
                            Tous les secteurs ({searchResults.length})
                          </button>
                          {uniqueSectors.map((sector) => {
                            const count = searchResults.filter(item => item.secteur === sector).length;
                            return (
                              <button
                                key={sector}
                                onClick={() => {
                                  onSectorFilter(sector);
                                  onToggleFilterDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                  selectedSector === sector ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                                }`}
                              >
                                {sector} ({count})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Entreprise
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Message
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center justify-between">
                  <span>État</span>
                  <div className="relative">
                    <button
                      onClick={() => onToggleStateFilterDropdown(!isStateFilterDropdownOpen)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Filter className="w-3 h-3" />
                      <ChevronDown className={`w-3 h-3 transition-transform ${isStateFilterDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isStateFilterDropdownOpen && (
                      <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <div className="p-2">
                          <button
                            onClick={() => {
                              onStateFilter('');
                              onToggleStateFilterDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                              !selectedState ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                            }`}
                          >
                            Tous les états ({searchResults.length})
                          </button>
                          {uniqueStates.map((state) => {
                            const count = searchResults.filter(item => item.etat === state).length;
                            return (
                              <button
                                key={state}
                                onClick={() => {
                                  onStateFilter(state);
                                  onToggleStateFilterDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                  selectedState === state ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                                }`}
                              >
                                {state} ({count})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center justify-between">
                  <span>Date</span>
                  <button
                    onClick={onDateSort}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    {dateSortOrder === null && <ArrowUpDown className="w-3 h-3" />}
                    {dateSortOrder === 'asc' && <ArrowUp className="w-3 h-3" />}
                    {dateSortOrder === 'desc' && <ArrowDown className="w-3 h-3" />}
                  </button>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {searchResults.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-gray-900">{item.nom || '-'}</div>
                    {item.profil_link && (
                      <a
                        href={item.profil_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Voir profil LinkedIn
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.secteur || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.entreprise || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                  <div className="max-h-20 overflow-y-auto relative group">
                    <button
                      onClick={() => onShowMessage({ message: item.message, nom: item.nom })}
                      className="text-left hover:text-blue-600 transition-colors cursor-pointer w-full"
                    >
                      <div className="whitespace-pre-wrap text-xs" title="Cliquer pour voir le message complet">
                        {item.message ? (item.message.length > 150 ? item.message.substring(0, 150) + '...' : item.message) : '-'}
                      </div>
                    </button>
                    
                    {/* Robot icon for message modification */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onModifyMessage(item);
                      }}
                      className="absolute top-1 right-1 p-1 bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-blue-600 hover:scale-110"
                      title="Modifier ce message avec l'IA"
                    >
                      <Bot className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusClasses(item.etat)}`}>
                    {getStatusIcon(item.etat)}
                    {item.etat || 'Non défini'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(item.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditItem(item)}
                      className="text-blue-600 hover:text-blue-900 transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onConnectionAction(item)}
                      disabled={!item.profil_link || item.etat?.toLowerCase() === 'refusé'}
                      className={`transition-colors ${
                        !item.profil_link || item.etat?.toLowerCase() === 'refusé'
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-green-600 hover:text-green-900'
                      }`}
                      title={item.etat?.toLowerCase() === 'refusé' ? 'Profil refusé' : 'Connexion LinkedIn'}
                    >
                      <Link className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onPublishAction(item)}
                      disabled={!item.profil_link || !item.message || item.etat === 'publié' || item.etat?.toLowerCase() === 'refusé'}
                      className={`transition-colors ${
                        !item.profil_link || !item.message || item.etat?.toLowerCase() === 'refusé'
                          ? 'text-gray-400 cursor-not-allowed'
                          : item.etat === 'publié'
                          ? 'text-blue-400'
                          : 'text-purple-600 hover:text-purple-900'
                      }`}
                      title={
                        item.etat?.toLowerCase() === 'refusé' 
                          ? 'Profil refusé' 
                          : item.etat === 'publié' 
                          ? 'Déjà publié' 
                          : 'Publier le message'
                      }
                    >
                      <Share className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};