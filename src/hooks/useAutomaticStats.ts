import { useState, useEffect, useCallback } from 'react';
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

interface CurrentStats {
  follow_insta: number;
  publication_instagram: Array<{ 
    like_count: number; 
    timestamp: string;
  }>;
  follow_facebook: number;
  publication_facebook: Array<{ 
    totalCount: number; 
    created_time: string;
  }>;
  follow_linkedin: number;
  like_linkedin: number;
  publication_linkedin: Array<{
    stats?: { like?: number };
    posted_at: { date: string };
  }>;
}

export const useAutomaticStats = () => {
  const [data, setData] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculer les likes du mois courant pour Instagram
  const getCurrentMonthInstagramLikes = useCallback((posts: any[], targetMonth?: number, targetYear?: number) => {
    if (!posts || !Array.isArray(posts)) return 0;
    
    const now = new Date();
    const month = targetMonth !== undefined ? targetMonth : now.getMonth();
    const year = targetYear !== undefined ? targetYear : now.getFullYear();
    
    return posts
      .filter(post => {
        if (!post.timestamp) return false;
        const postDate = new Date(post.timestamp);
        return postDate.getMonth() === month && postDate.getFullYear() === year;
      })
      .reduce((total, post) => total + (post.like_count || 0), 0);
  }, []);

  // Calculer les likes du mois courant pour Facebook
  const getCurrentMonthFacebookLikes = useCallback((posts: any[], targetMonth?: number, targetYear?: number) => {
    if (!posts || !Array.isArray(posts)) return 0;
    
    const now = new Date();
    const month = targetMonth !== undefined ? targetMonth : now.getMonth();
    const year = targetYear !== undefined ? targetYear : now.getFullYear();
    
    return posts
      .filter(post => {
        if (!post.created_time) return false;
        const postDate = new Date(post.created_time);
        return postDate.getMonth() === month && postDate.getFullYear() === year;
      })
      .reduce((total, post) => total + (post.totalCount || 0), 0);
  }, []);

  // Calculer les likes du mois courant pour LinkedIn
  const getCurrentMonthLinkedInLikes = useCallback((posts: any[], targetMonth?: number, targetYear?: number) => {
    if (!posts || !Array.isArray(posts)) return 0;
    
    const now = new Date();
    const month = targetMonth !== undefined ? targetMonth : now.getMonth();
    const year = targetYear !== undefined ? targetYear : now.getFullYear();
    
    return posts
      .filter(post => {
        if (!post.posted_at?.date) return false;
        const postDate = new Date(post.posted_at.date);
        return postDate.getMonth() === month && postDate.getFullYear() === year;
      })
      .reduce((total, post) => total + (post.stats?.like || 0), 0);
  }, []);

  // Récupérer les statistiques actuelles depuis localStorage
  const getCurrentStats = useCallback((): CurrentStats | null => {
    try {
      const storedData = localStorage.getItem('dashboardStats');
      if (!storedData) return null;
      
      const { stats } = JSON.parse(storedData);
      return stats;
    } catch (error) {
      console.error('Error getting current stats:', error);
      return null;
    }
  }, []);

  // Sauvegarder les statistiques mensuelles en base
  const saveMonthlyStats = useCallback(async (stats: MonthlyStats, targetDate: Date) => {
    try {
      const firstDayOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      
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
        }, {
          onConflict: 'month'
        });

      if (error) throw error;
      console.log(`✅ Statistiques sauvegardées pour ${firstDayOfMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`);
    } catch (error) {
      console.error('Error saving monthly stats:', error);
    }
  }, []);

  // Mettre à jour les statistiques du mois courant automatiquement
  const updateCurrentMonthStats = useCallback(async (force = false) => {
    const currentStats = getCurrentStats();
    if (!currentStats) return;

    const now = new Date();
    const currentMonthKey = `stats_${now.getFullYear()}_${now.getMonth()}`;
    const lastSavedKey = `last_saved_${now.getFullYear()}_${now.getMonth()}`;
    
    // Vérifier si on a déjà sauvegardé aujourd'hui
    const lastSaved = localStorage.getItem(lastSavedKey);
    const today = now.toISOString().split('T')[0];
    
    if (!force && lastSaved === today) {
      return; // Déjà sauvegardé aujourd'hui
    }

    try {
      const monthlyStats: MonthlyStats = {
        month: now.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        instagram_followers: currentStats.follow_insta || 0,
        instagram_likes: getCurrentMonthInstagramLikes(currentStats.publication_instagram),
        facebook_followers: currentStats.follow_facebook || 0,
        facebook_likes: getCurrentMonthFacebookLikes(currentStats.publication_facebook),
        linkedin_followers: currentStats.follow_linkedin || 0,
        linkedin_likes: getCurrentMonthLinkedInLikes(currentStats.publication_linkedin)
      };

      // Sauvegarder en base de données
      await saveMonthlyStats(monthlyStats, now);
      
      // Marquer comme sauvegardé aujourd'hui
      localStorage.setItem(lastSavedKey, today);
      
      console.log(`📊 Statistiques mises à jour pour ${monthlyStats.month}:`, {
        instagram: `${monthlyStats.instagram_followers} followers, ${monthlyStats.instagram_likes} likes`,
        facebook: `${monthlyStats.facebook_followers} followers, ${monthlyStats.facebook_likes} likes`,
        linkedin: `${monthlyStats.linkedin_followers} followers, ${monthlyStats.linkedin_likes} likes`
      });

    } catch (error) {
      console.error('Error updating current month stats:', error);
    }
  }, [getCurrentStats, getCurrentMonthInstagramLikes, getCurrentMonthFacebookLikes, getCurrentMonthLinkedInLikes, saveMonthlyStats]);

  // Charger et construire les données pour les graphiques
  const fetchAndBuildData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer les statistiques historiques
      const { data: historicalStats, error: dbError } = await supabase
        .from('social_media_stats')
        .select('*')
        .order('month', { ascending: true });

      if (dbError) throw dbError;

      const currentYear = new Date().getFullYear();
      const monthNames = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
      
      // Construire les données pour tous les mois de l'année
      const allMonthsData: MonthlyStats[] = [];
      
      for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
        const monthDisplay = `${monthNames[monthIndex]} ${currentYear}`;
        
        // Chercher les données existantes pour ce mois
        const existingData = historicalStats?.find(stat => {
          const statDate = new Date(stat.month);
          return statDate.getMonth() === monthIndex && statDate.getFullYear() === currentYear;
        });

        if (existingData) {
          // Utiliser les données historiques
          allMonthsData.push({
            month: monthDisplay,
            instagram_followers: existingData.instagram_followers || 0,
            instagram_likes: existingData.instagram_likes || 0,
            facebook_followers: existingData.facebook_followers || 0,
            facebook_likes: existingData.facebook_likes || 0,
            linkedin_followers: existingData.linkedin_followers || 0,
            linkedin_likes: existingData.linkedin_likes || 0
          });
        } else {
          // Pour le mois courant, utiliser les données en temps réel
          const now = new Date();
          const currentStats = getCurrentStats();
          
          if (monthIndex === now.getMonth() && currentStats) {
            allMonthsData.push({
              month: monthDisplay,
              instagram_followers: currentStats.follow_insta || 0,
              instagram_likes: getCurrentMonthInstagramLikes(currentStats.publication_instagram, monthIndex, currentYear),
              facebook_followers: currentStats.follow_facebook || 0,
              facebook_likes: getCurrentMonthFacebookLikes(currentStats.publication_facebook, monthIndex, currentYear),
              linkedin_followers: currentStats.follow_linkedin || 0,
              linkedin_likes: getCurrentMonthLinkedInLikes(currentStats.publication_linkedin, monthIndex, currentYear)
            });
          } else {
            // Mois futur ou sans données
            allMonthsData.push({
              month: monthDisplay,
              instagram_followers: 0,
              instagram_likes: 0,
              facebook_followers: 0,
              facebook_likes: 0,
              linkedin_followers: 0,
              linkedin_likes: 0
            });
          }
        }
      }

      setData(allMonthsData);

      // Mettre à jour les stats du mois courant
      await updateCurrentMonthStats();

    } catch (error) {
      console.error('Error fetching stats:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de la récupération des statistiques');
    } finally {
      setLoading(false);
    }
  }, [getCurrentStats, getCurrentMonthInstagramLikes, getCurrentMonthFacebookLikes, getCurrentMonthLinkedInLikes, updateCurrentMonthStats]);

  // Forcer la mise à jour des stats
  const forceUpdate = useCallback(async () => {
    await updateCurrentMonthStats(true);
    await fetchAndBuildData();
  }, [updateCurrentMonthStats, fetchAndBuildData]);

  useEffect(() => {
    fetchAndBuildData();

    // Mise à jour automatique toutes les heures
    const interval = setInterval(() => {
      updateCurrentMonthStats();
      fetchAndBuildData();
    }, 60 * 60 * 1000); // 1 heure

    // Vérification quotidienne pour sauvegarder en fin de mois
    const dailyCheck = setInterval(async () => {
      const now = new Date();
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Si c'est le dernier jour du mois, forcer la sauvegarde
      if (now.getDate() === lastDayOfMonth.getDate()) {
        console.log('📅 Dernier jour du mois détecté, sauvegarde des statistiques...');
        await updateCurrentMonthStats(true);
      }
    }, 24 * 60 * 60 * 1000); // 24 heures

    return () => {
      clearInterval(interval);
      clearInterval(dailyCheck);
    };
  }, [fetchAndBuildData, updateCurrentMonthStats]);

  return {
    data,
    loading,
    error,
    forceUpdate,
    updateCurrentMonthStats
  };
};