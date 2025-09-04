import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { ChevronDown, RefreshCw } from 'lucide-react';
import { useAutomaticStats } from '../hooks/useAutomaticStats';

interface MonthlyStats {
  month: string;
  instagram_followers: number;
  instagram_likes: number;
  facebook_followers: number;
  facebook_likes: number;
  linkedin_followers: number;
  linkedin_likes: number;
}

interface Platform {
  name: string;
  color: string;
  followersKey: keyof MonthlyStats;
  likesKey: keyof MonthlyStats;
}


const platforms: Platform[] = [
  {
    name: 'Instagram',
    color: '#E1306C',
    followersKey: 'instagram_followers',
    likesKey: 'instagram_likes'
  },
  {
    name: 'Facebook',
    color: '#4267B2',
    followersKey: 'facebook_followers',
    likesKey: 'facebook_likes'
  },
  {
    name: 'LinkedIn',
    color: '#0077B5',
    followersKey: 'linkedin_followers',
    likesKey: 'linkedin_likes'
  }
];

export function StatsGraphs() {
  const { data, loading, error, forceUpdate } = useAutomaticStats();
  const [selectedPlatform, setSelectedPlatform] = useState<string>('Tous');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleForceUpdate = async () => {
    setUpdating(true);
    try {
      await forceUpdate();
    } finally {
      setUpdating(false);
    }
  };

  const getSelectedPlatforms = () => {
    if (selectedPlatform === 'Tous') {
      return platforms;
    }
    return platforms.filter(p => p.name === selectedPlatform);
  };

  const getPlatformColor = (platformName: string) => {
    switch (platformName) {
      case 'Instagram':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'Facebook':
        return 'bg-blue-600 text-white';
      case 'LinkedIn':
        return 'bg-blue-800 text-white';
      default:
        return 'bg-gray-800 text-white';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Chargement des statistiques...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <div className="text-center">
          <p className="mb-4">Erreur lors du chargement des statistiques:</p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleForceUpdate}
            disabled={updating}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {updating ? 'Mise à jour...' : 'Réessayer'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex items-center justify-between">
        {/* Platform Selection Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`${getPlatformColor(selectedPlatform)} px-4 py-2 rounded-lg flex items-center gap-2`}
          >
            <span>{selectedPlatform}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        
          {isDropdownOpen && (
            <div className="absolute z-10 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
              <button
                onClick={() => {
                  setSelectedPlatform('Tous');
                  setIsDropdownOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
              >
                Tous
              </button>
              {platforms.map(platform => (
                <button
                  key={platform.name}
                  onClick={() => {
                    setSelectedPlatform(platform.name);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                    selectedPlatform === platform.name ? 'bg-gray-50' : ''
                  }`}
                >
                  {platform.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Update Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleForceUpdate}
            disabled={updating}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2 transition-all duration-200"
            title="Mettre à jour les statistiques maintenant"
          >
            <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{updating ? 'Mise à jour...' : 'Actualiser'}</span>
          </button>
          
          <div className="text-xs text-gray-500 text-right">
            <div>Mise à jour automatique</div>
            <div>toutes les heures</div>
          </div>
        </div>
      </div>

      {/* Graphs Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Followers Graph */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Évolution des abonnés</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                {getSelectedPlatforms().map(platform => (
                  <Line
                    key={platform.name}
                    type="monotone"
                    dataKey={platform.followersKey}
                    name={`${platform.name} Abonnés`}
                    stroke={platform.color}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Likes Graph */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Évolution des likes/réactions</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                {getSelectedPlatforms().map(platform => (
                  <Line
                    key={platform.name}
                    type="monotone"
                    dataKey={platform.likesKey}
                    name={`${platform.name} Likes`}
                    stroke={platform.color}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}