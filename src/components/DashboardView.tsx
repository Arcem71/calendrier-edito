import React from 'react';
import { useDashboardData } from './dashboard/hooks/useDashboardData';
import { DashboardHeader } from './dashboard/components/DashboardHeader';
import { StatsCards } from './dashboard/components/StatsCards';
import { PostsSection } from './dashboard/components/PostsSection';
import { StatsGraphs } from './StatsGraphs';
import { getScheduledPublicationCount } from '../utils/publicationScheduler';
import { TrendingUp, Clock, AlertCircle, Activity, Instagram, Facebook, Linkedin } from 'lucide-react';
import { handleSocialLinkClick } from './dashboard/utils/socialLinks';

export function DashboardView() {
  const {
    stats,
    loading,
    error,
    lastUpdate,
    fetchStats,
    getCurrentMonthInstagramLikes,
    getCurrentMonthFacebookLikes
  } = useDashboardData();
  
  const scheduledCount = getScheduledPublicationCount();

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Erreur de chargement</h3>
              <p className="text-sm text-gray-600">Impossible de récupérer les données</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Hero Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <DashboardHeader
            lastUpdate={lastUpdate}
            loading={loading}
            onRefresh={() => fetchStats(true)}
          />
          
          {/* Quick Overview Cards */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {((stats?.follow_insta || 0) + (stats?.follow_facebook || 0) + (stats?.follow_linkedin || 0)).toLocaleString()}
                  </div>
                  <div className="text-blue-100 text-sm">Total abonnés</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {(getCurrentMonthInstagramLikes() + getCurrentMonthFacebookLikes()).toLocaleString()}
                  </div>
                  <div className="text-blue-100 text-sm">Interactions ce mois</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 border border-white border-opacity-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {scheduledCount}
                  </div>
                  <div className="text-blue-100 text-sm">Publications programmées</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Scheduled Publications Alert */}
        {scheduledCount > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-900">Publications en attente</h3>
                <p className="text-amber-700 mt-1">
                  🚀 {scheduledCount} publication{scheduledCount > 1 ? 's' : ''} programmée{scheduledCount > 1 ? 's' : ''} pour publication automatique à 9h00
                </p>
                <div className="flex items-center gap-2 mt-2 text-sm text-amber-600">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  Système de publication automatique actif
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Stats Cards */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-8 py-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Statistiques des réseaux sociaux</h2>
            </div>
          </div>
          <div className="p-8">
            <StatsCards
              stats={stats}
              getCurrentMonthInstagramLikes={getCurrentMonthInstagramLikes}
              getCurrentMonthFacebookLikes={getCurrentMonthFacebookLikes}
            />
          </div>
        </div>

        {/* Enhanced Posts Section */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-8 py-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Publications récentes</h2>
            </div>
            <p className="text-sm text-gray-600 mt-2">Aperçu des dernières publications sur vos réseaux sociaux</p>
          </div>
          <div className="p-8">
            <PostsSection stats={stats} />
          </div>
        </div>

        {/* Performance Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Performers */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Performances du mois</h3>
                  <p className="text-sm text-gray-600">Meilleures statistiques</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Best performing platform */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">Plateforme la plus active</div>
                    <div className="text-sm text-gray-600">
                      {getCurrentMonthInstagramLikes() >= getCurrentMonthFacebookLikes() ? 'Instagram' : 'Facebook'}
                    </div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {Math.max(getCurrentMonthInstagramLikes(), getCurrentMonthFacebookLikes()).toLocaleString()}
                </div>
              </div>
              
              {/* Total engagement */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">Engagement total</div>
                    <div className="text-sm text-gray-600">Toutes plateformes</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {(getCurrentMonthInstagramLikes() + getCurrentMonthFacebookLikes() + (stats?.like_linkedin || 0)).toLocaleString()}
                </div>
              </div>
              
              {/* Growth rate */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">Nouveaux abonnés LinkedIn</div>
                    <div className="text-sm text-gray-600">Ce mois</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  +{stats?.follow_gain_linkedin?.toLocaleString() || 0}
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Actions rapides</h3>
                  <p className="text-sm text-gray-600">Raccourcis utiles</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={() => handleSocialLinkClick('instagram')}
                className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
              >
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Instagram className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">Ouvrir Instagram</div>
                  <div className="text-sm text-purple-100">Voir les dernières publications</div>
                </div>
              </button>
              
              <button
                onClick={() => handleSocialLinkClick('facebook')}
                className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
              >
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Facebook className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">Ouvrir Facebook</div>
                  <div className="text-sm text-blue-100">Gérer la page</div>
                </div>
              </button>
              
              <button
                onClick={() => handleSocialLinkClick('linkedin')}
                className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-blue-800 to-indigo-700 text-white rounded-xl hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
              >
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <Linkedin className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">Ouvrir LinkedIn</div>
                  <div className="text-sm text-blue-100">Réseau professionnel</div>
                </div>
              </button>
              
              <div className="border-t border-gray-200 pt-4 mt-6">
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Prochaine actualisation</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Les données sont mises à jour automatiquement toutes les heures
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Graphs */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-8 py-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Évolution historique</h2>
            </div>
            <p className="text-sm text-gray-600 mt-2">Suivi des performances sur les 12 derniers mois</p>
          </div>
          <div className="p-8">
            <StatsGraphs />
          </div>
        </div>
      </div>
    </div>
  );
}