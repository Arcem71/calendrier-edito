import React from 'react';
import { RefreshCw, BarChart3, Sparkles, Clock } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

interface DashboardHeaderProps {
  lastUpdate: Date | null;
  loading: boolean;
  onRefresh: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  lastUpdate,
  loading,
  onRefresh
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
          <BarChart3 className="w-8 h-8 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-white">Tableau de bord</h1>
            <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
          </div>
          <p className="text-blue-100 text-lg">Vue d'ensemble de vos performances sociales</p>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        {lastUpdate && (
          <div className="flex items-center gap-2 text-blue-100">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              Mis à jour {formatDate(lastUpdate)}
            </span>
          </div>
        )}
        
        <button
          onClick={onRefresh}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 font-medium ${
            loading 
              ? 'bg-white bg-opacity-10 text-blue-200 cursor-not-allowed'
              : 'bg-white bg-opacity-20 hover:bg-opacity-30 text-white shadow-lg hover:shadow-xl backdrop-blur-sm'
          }`}
          title="Actualiser les données (supprime toutes les images du bucket dashboard, récupère de nouvelles données et convertit les PDF en JPG)"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="text-sm">
            {loading ? 'Actualisation...' : 'Actualiser'}
          </span>
        </button>
      </div>
    </div>
  );
};