import React, { useState, useEffect, useRef } from 'react';
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
import { ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

interface CurrentStats {
  follow_insta: number;
  publication_instagram: Array<{ like_count: number }>;
  follow_facebook: number;
  publication_facebook: Array<{ totalCount: number }>;
  follow_linkedin: number;
  like_linkedin: number;
}

interface StoredData {
  stats: CurrentStats;
  lastUpdate: string;
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
  const [data, setData] = useState<MonthlyStats[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('Tous');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const getCurrentMonthStats = async () => {
    try {
      const storedData = localStorage.getItem('dashboardStats');
      if (!storedData) return null;

      const { stats } = JSON.parse(storedData);
      
      // Calculate total likes for the current month
      const instagramLikes = stats.publication_instagram?.reduce((total: number, post: any) => {
        const postDate = new Date(post.timestamp);
        const now = new Date();
        if (postDate.getMonth() === now.getMonth() && postDate.getFullYear() === now.getFullYear()) {
          return total + (post.like_count || 0);
        }
        return total;
      }, 0);

      const facebookLikes = stats.publication_facebook?.reduce((total: number, post: any) => {
        const postDate = new Date(post.created_time);
        const now = new Date();
        if (postDate.getMonth() === now.getMonth() && postDate.getFullYear() === now.getFullYear()) {
          return total + (post.totalCount || 0);
        }
        return total;
      }, 0);

      const now = new Date();
      return {
        month: new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('fr-FR', { 
          month: 'short'
        }),
        instagram_followers: stats.follow_insta || 0,
        instagram_likes: instagramLikes || 0,
        facebook_followers: stats.follow_facebook || 0,
        facebook_likes: facebookLikes || 0,
        linkedin_followers: stats.follow_linkedin || 0,
        linkedin_likes: stats.like_linkedin || 0
      };
    } catch (error) {
      console.error('Error getting current month stats:', error);
      return null;
    }
  };

  const saveMonthlyStats = async (stats: MonthlyStats) => {
    try {
      const date = new Date();
      const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      
      const { error } = await supabase
        .from('social_media_stats')
        .upsert({
          month: firstDayOfMonth.toISOString().split('T')[0],
          instagram_followers: stats.instagram_followers,
          instagram_likes: stats.instagram_likes,
          facebook_followers: stats.facebook_followers,
          facebook_likes: stats.facebook_likes,
          linkedin_followers: stats.linkedin_followers,
          linkedin_likes: stats.linkedin_likes
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving monthly stats:', error);
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch historical stats
        const { data: historicalStats, error } = await supabase
          .from('social_media_stats')
          .select('*')
          .order('month', { ascending: true });

        if (error) throw error;

        // Create a comprehensive timeline from January to December of current year
        const currentYear = new Date().getFullYear();
        const monthNames = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
        
        // Initialize all months with default data
        const allMonthsData: MonthlyStats[] = [];
        
        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
          const monthDisplay = `${monthNames[monthIndex]} ${currentYear}`;
          
          // Find existing data for this month
          const existingData = historicalStats?.find(stat => {
            const statDate = new Date(stat.month);
            return statDate.getMonth() === monthIndex && statDate.getFullYear() === currentYear;
          });
          
          allMonthsData.push({
            month: monthDisplay,
            instagram_followers: existingData?.instagram_followers || 0,
            instagram_likes: existingData?.instagram_likes || 0,
            facebook_followers: existingData?.facebook_followers || 0,
            facebook_likes: existingData?.facebook_likes || 0,
            linkedin_followers: existingData?.linkedin_followers || 0,
            linkedin_likes: existingData?.linkedin_likes || 0
          });
        }

        // Get current month stats and update the appropriate month
        const currentStats = await getCurrentMonthStats();
        if (currentStats) {
          const currentDate = new Date();
          const currentMonthIndex = currentDate.getMonth();
          
          // Update current month data
          allMonthsData[currentMonthIndex] = {
            ...allMonthsData[currentMonthIndex],
            instagram_followers: currentStats.instagram_followers,
            instagram_likes: currentStats.instagram_likes,
            facebook_followers: currentStats.facebook_followers,
            facebook_likes: currentStats.facebook_likes,
            linkedin_followers: currentStats.linkedin_followers,
            linkedin_likes: currentStats.linkedin_likes
          };
          
          // Save current month stats if it's the last day of the month
          const today = new Date();
          const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          if (today.getDate() === lastDayOfMonth.getDate()) {
            await saveMonthlyStats(currentStats);
          }
        }

        setData(allMonthsData);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Set up interval to check for end of month
    const checkEndOfMonth = setInterval(async () => {
      const now = new Date();
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      if (now.getDate() === lastDayOfMonth.getDate()) {
        const currentStats = await getCurrentMonthStats();
        if (currentStats) {
          await saveMonthlyStats(currentStats);
        }
      }
    }, 1000 * 60 * 60); // Check every hour

    return () => clearInterval(checkEndOfMonth);
  }, []);

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
      </div>
    );
  }

  return (
    <div className="space-y-6">
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