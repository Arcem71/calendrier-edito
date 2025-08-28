import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DeleteImageRequest {
  filename: string;
  itemId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  try {
    const { filename, itemId }: DeleteImageRequest = await req.json();
    
    if (!filename) {
      throw new Error('Filename is required');
    }

    console.log('=== DÉBUT SUPPRESSION IMAGE (EDGE FUNCTION) ===');
    console.log('Filename:', filename);
    console.log('Item ID:', itemId);

    // Étape 1: Supprimer l'image du bucket editorial-images
    console.log('Étape 1: Suppression du bucket editorial-images...');
    const { error: storageError } = await supabase.storage
      .from('editorial-images')
      .remove([filename]);

    if (storageError) {
      console.error('Erreur lors de la suppression du stockage:', storageError);
      throw new Error(`Erreur de stockage: ${storageError.message}`);
    }

    console.log('✅ Image supprimée du stockage avec succès');

    // Étape 2: Si itemId est fourni, mettre à jour la base de données
    if (itemId) {
      console.log('Étape 2: Mise à jour de la base de données...');
      
      // Récupérer l'item actuel
      const { data: item, error: fetchError } = await supabase
        .from('editorial_calendar')
        .select('images')
        .eq('id', itemId)
        .single();

      if (fetchError) {
        console.error('Erreur lors de la récupération de l\'item:', fetchError);
        throw new Error(`Erreur de récupération: ${fetchError.message}`);
      }

      if (!item) {
        throw new Error('Item non trouvé');
      }

      // Filtrer les images pour supprimer celle avec le filename donné
      const currentImages = Array.isArray(item.images) ? item.images : [];
      const updatedImages = currentImages.filter(
        (img: any) => img.filename !== filename
      );

      console.log('Images avant suppression:', currentImages.length);
      console.log('Images après suppression:', updatedImages.length);

      // Mettre à jour la base de données
      const { error: updateError } = await supabase
        .from('editorial_calendar')
        .update({ images: updatedImages })
        .eq('id', itemId);

      if (updateError) {
        console.error('Erreur lors de la mise à jour de la base de données:', updateError);
        throw new Error(`Erreur de base de données: ${updateError.message}`);
      }

      console.log('✅ Base de données mise à jour avec succès');
    }

    console.log('✅ SUPPRESSION COMPLÈTE RÉUSSIE (EDGE FUNCTION)');
    console.log('=== FIN SUPPRESSION IMAGE (EDGE FUNCTION) ===');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Image supprimée avec succès',
        filename,
        itemId 
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('❌ ERREUR LORS DE LA SUPPRESSION (EDGE FUNCTION):', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Une erreur inconnue est survenue',
        success: false
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});