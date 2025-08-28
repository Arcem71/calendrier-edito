import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { SocialStats, StoredData } from '../types';
import { clearDashboardBucket, proxyInstagramImage, proxyFacebookImage, proxyLinkedInImage, processPdfImage } from '../utils/imageProcessing';
import toast from 'react-hot-toast';

export const useDashboardData = () => {
  const [stats, setStats] = useState<SocialStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadStoredData = () => {
    const storedData = localStorage.getItem('dashboardStats');
    if (storedData) {
      const data: StoredData = JSON.parse(storedData);
      setStats(data.stats);
      setLastUpdate(new Date(data.lastUpdate));
    }
  };

  const saveMonthlyStats = async () => {
    if (!stats) return;

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    try {
      const { data: existingStats } = await supabase
        .from('social_media_stats')
        .select('*')
        .eq('month', firstDayOfMonth.toISOString().split('T')[0])
        .single();

      if (!existingStats) {
        const monthlyStats = {
          month: firstDayOfMonth.toISOString().split('T')[0],
          instagram_followers: stats.follow_insta || 0,
          instagram_likes: getCurrentMonthInstagramLikes(),
          facebook_followers: stats.follow_facebook || 0,
          facebook_likes: getCurrentMonthFacebookLikes(),
          linkedin_followers: stats.follow_linkedin || 0,
          linkedin_likes: stats.like_linkedin || 0
        };

        const { error } = await supabase
          .from('social_media_stats')
          .insert([monthlyStats]);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving monthly stats:', error);
    }
  };

  const checkAndSaveMonthlyStats = () => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const isLastDayOfMonth = now.getDate() === lastDayOfMonth.getDate();
    
    if (isLastDayOfMonth) {
      saveMonthlyStats();
    }
  };

  const saveData = async (stats: SocialStats) => {
    const now = new Date();
    
    try {
      // Traiter les images Instagram
      if (Array.isArray(stats.publication_instagram)) {
        const processedInstagramPosts = await Promise.all(
          stats.publication_instagram.map(async (post) => ({
            ...post,
            media_url: post.media_url ? await proxyInstagramImage(post.media_url) : null
          }))
        );
        stats = { ...stats, publication_instagram: processedInstagramPosts };
      }

      // Traiter les images Facebook
      if (Array.isArray(stats.publication_facebook)) {
        const processedFacebookPosts = await Promise.all(
          stats.publication_facebook.map(async (post) => ({
            ...post,
            full_picture: post.full_picture ? await proxyFacebookImage(post.full_picture) : null
          }))
        );
        stats = { ...stats, publication_facebook: processedFacebookPosts };
      }

      // Traiter les publications LinkedIn (images ET documents PDF)
      if (Array.isArray(stats.publication_linkedin)) {
        const processedLinkedInPosts = await Promise.all(
          stats.publication_linkedin.map(async (post) => {
            let processedPost = { ...post };

            // Traiter les images dans le champ media
            if (post.media?.items?.length > 0) {
              const firstItem = post.media.items[0];
              const processedUrl = firstItem.url ? await proxyLinkedInImage(firstItem.url) : null;
              processedPost = {
                ...processedPost,
                media: {
                  ...post.media,
                  items: [{
                    ...firstItem,
                    url: processedUrl
                  }]
                }
              };
            }

            // 🆕 NOUVEAU: Traiter les documents PDF dans le champ document
            if (post.document?.url) {
              console.log('📄 Document LinkedIn détecté:', post.document.url);
              const processedDocumentUrl = await processPdfImage(post.document.url);
              
              // Si c'était un PDF converti, on l'ajoute comme image
              if (processedDocumentUrl !== post.document.url) {
                console.log('✅ PDF LinkedIn converti, ajout comme image');
                processedPost = {
                  ...processedPost,
                  media: {
                    type: 'image',
                    items: [{
                      url: processedDocumentUrl,
                      width: 600,
                      height: 400
                    }]
                  }
                };
                // Supprimer le champ document puisqu'on l'a converti en image
                delete processedPost.document;
              } else {
                // Si ce n'était pas un PDF, on garde le document tel quel
                processedPost = {
                  ...processedPost,
                  document: {
                    url: processedDocumentUrl
                  }
                };
              }
            }

            return processedPost;
          })
        );
        stats = { ...stats, publication_linkedin: processedLinkedInPosts };
      }

      const data: StoredData = {
        stats,
        lastUpdate: now.toISOString()
      };
      
      localStorage.setItem('dashboardStats', JSON.stringify(data));
      setStats(stats);
      setLastUpdate(now);

      checkAndSaveMonthlyStats();
    } catch (error) {
      console.error('Error saving data:', error);
      throw error;
    }
  };

  const fetchStats = async (force = false) => {
    const storedData = localStorage.getItem('dashboardStats');
    if (!force && storedData) {
      const data: StoredData = JSON.parse(storedData);
      const lastUpdateTime = new Date(data.lastUpdate);
      const now = new Date();
      const hoursSinceLastUpdate = (now.getTime() - lastUpdateTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastUpdate < 24) {
        setStats(data.stats);
        setLastUpdate(lastUpdateTime);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      // Supprimer toutes les images existantes du bucket dashboard avant de récupérer de nouvelles données
      console.log('Nettoyage du bucket dashboard avant récupération des nouvelles données...');
      await clearDashboardBucket();

      console.log('Récupération des nouvelles données depuis l\'API...');
      const response = await fetch('https://hook.eu2.make.com/uoqy4o2vxto4i1iy2ny2or4p252wvhr8');
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des statistiques');
      }

      const data = await response.json();
      console.log('Données reçues, traitement en cours...');
      await saveData(data);
      
      toast.success('Statistiques mises à jour avec succès !', { duration: 3000 });
      console.log('✅ Mise à jour complète terminée avec succès');
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue lors de la connexion à Supabase');
      toast.error('Erreur lors de la mise à jour des statistiques', { duration: 4000 });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentMonthInstagramLikes = () => {
    if (!stats?.publication_instagram) return 0;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return stats.publication_instagram
      .filter(post => {
        const postDate = new Date(post.timestamp);
        return postDate.getMonth() === currentMonth && 
               postDate.getFullYear() === currentYear;
      })
      .reduce((total, post) => total + (post.like_count || 0), 0);
  };

  const getCurrentMonthFacebookLikes = () => {
    if (!stats?.publication_facebook) return 0;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return stats.publication_facebook
      .filter(post => {
        const postDate = new Date(post.created_time);
        return postDate.getMonth() === currentMonth && 
               postDate.getFullYear() === currentYear;
      })
      .reduce((total, post) => total + (post.totalCount || 0), 0);
  };

  useEffect(() => {
    loadStoredData();
    fetchStats();

    const scheduleNextUpdate = () => {
      const now = new Date();
      const next10AM = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getHours() >= 10 ? now.getDate() + 1 : now.getDate(),
        10, 0, 0
      );
      const msUntil10AM = next10AM.getTime() - now.getTime();
      return setTimeout(() => {
        fetchStats(true);
        const dailyInterval = setInterval(() => fetchStats(true), 24 * 60 * 60 * 1000);
        return () => clearInterval(dailyInterval);
      }, msUntil10AM);
    };

    const timeout = scheduleNextUpdate();
    return () => clearTimeout(timeout);
  }, []);

  return {
    stats,
    loading,
    error,
    lastUpdate,
    fetchStats,
    getCurrentMonthInstagramLikes,
    getCurrentMonthFacebookLikes
  };
};