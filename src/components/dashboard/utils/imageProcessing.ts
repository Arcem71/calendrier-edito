import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

// FONCTION POUR SUPPRIMER TOUTES LES IMAGES DU BUCKET DASHBOARD
export const clearDashboardBucket = async () => {
  try {
    console.log('=== DÉBUT SUPPRESSION BUCKET DASHBOARD (CLIENT) ===');
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clear-dashboard-bucket`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('Réponse de l\'edge function:', result);

    if (!result.success) {
      throw new Error(result.error || 'Échec de la suppression du bucket');
    }

    console.log(`✅ ${result.deletedCount} fichier(s) supprimé(s) du bucket dashboard`);
    
    if (result.failedFiles && result.failedFiles.length > 0) {
      console.warn(`⚠️ ${result.failedFiles.length} fichier(s) ont échoué:`, result.failedFiles);
      toast(
        `Bucket partiellement nettoyé: ${result.deletedCount}/${result.totalFiles} fichiers supprimés`,
        { duration: 5000 }
      );
    } else {
      toast.success(
        `Bucket dashboard nettoyé avec succès !\n${result.deletedCount} fichier(s) supprimé(s).`,
        { duration: 4000 }
      );
    }

    console.log('✅ SUPPRESSION BUCKET DASHBOARD RÉUSSIE (CLIENT)');
    console.log('=== FIN SUPPRESSION BUCKET DASHBOARD (CLIENT) ===');

  } catch (error) {
    console.error('❌ ERREUR LORS DE LA SUPPRESSION DU BUCKET DASHBOARD (CLIENT):', error);
    toast.error(
      `Erreur lors du nettoyage du bucket: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      { duration: 5000 }
    );
    throw error;
  }
};

// FONCTION POUR DÉTECTER ET CONVERTIR LES PDF
export const processPdfImage = async (url: string): Promise<string> => {
  try {
    console.log('Vérification si l\'URL est un PDF:', url);
    
    // Vérifier si l'URL semble être un PDF
    const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf');
    
    if (!isPdf) {
      // Vérifier le content-type via une requête HEAD
      try {
        const headResponse = await fetch(url, { method: 'HEAD' });
        const contentType = headResponse.headers.get('content-type');
        if (!contentType?.includes('application/pdf')) {
          return url; // Ce n'est pas un PDF, retourner l'URL originale
        }
      } catch {
        return url; // En cas d'erreur, retourner l'URL originale
      }
    }

    console.log('PDF détecté, conversion en cours...');
    toast('PDF détecté, conversion en JPG en cours...', { duration: 3000 });

    // Appeler l'edge function pour convertir le PDF
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-pdf-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        filename: url.split('/').pop()
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Échec de la conversion PDF');
    }

    console.log('✅ PDF converti avec succès:', result.url);
    toast.success('PDF converti en JPG avec succès !', { duration: 3000 });
    
    return result.url;

  } catch (error) {
    console.error('Erreur lors de la conversion PDF:', error);
    toast('Impossible de convertir le PDF, affichage de l\'URL originale', { duration: 4000 });
    return url; // En cas d'erreur, retourner l'URL originale
  }
};

export const proxyInstagramImage = async (url: string): Promise<string> => {
  if (!url) return 'https://placehold.co/600x400?text=Image+non+trouvée';
  
  try {
    new URL(url);
    
    // Vérifier si c'est un PDF et le convertir si nécessaire
    const processedUrl = await processPdfImage(url);
    if (processedUrl !== url) {
      return processedUrl; // PDF converti
    }
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instagram-proxy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Proxy response error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Failed to proxy image: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.url) {
      throw new Error('No URL returned from proxy');
    }
    
    return data.url;
  } catch (error) {
    console.error('Error proxying Instagram image:', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return url;
  }
};

export const proxyFacebookImage = async (url: string): Promise<string> => {
  if (!url) return 'https://placehold.co/600x400?text=Image+non+trouvée';
  
  try {
    new URL(url);
    
    // Vérifier si c'est un PDF et le convertir si nécessaire
    const processedUrl = await processPdfImage(url);
    if (processedUrl !== url) {
      return processedUrl; // PDF converti
    }
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-proxy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Proxy response error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Failed to proxy image: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.url) {
      throw new Error('No URL returned from proxy');
    }
    
    return data.url;
  } catch (error) {
    console.error('Error proxying Facebook image:', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return url;
  }
};

export const proxyLinkedInImage = async (url: string): Promise<string> => {
  if (!url) return 'https://placehold.co/600x400?text=Image+non+trouvée';
  
  try {
    new URL(url);
    
    // Vérifier si c'est un PDF et le convertir si nécessaire
    const processedUrl = await processPdfImage(url);
    if (processedUrl !== url) {
      return processedUrl; // PDF converti
    }
    
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/linkedin-proxy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Proxy response error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Failed to proxy image: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.url) {
      throw new Error('No URL returned from proxy');
    }
    
    return data.url;
  } catch (error) {
    console.error('Error proxying LinkedIn image:', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return url;
  }
};