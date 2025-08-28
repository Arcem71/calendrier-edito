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
    console.log('=== DÉBUT SUPPRESSION COMPLÈTE BUCKET DASHBOARD ===');

    // Étape 1: Vérifier que le bucket existe
    console.log('Étape 1: Vérification de l\'existence du bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Erreur lors de la récupération des buckets:', bucketsError);
      throw new Error(`Erreur de récupération des buckets: ${bucketsError.message}`);
    }

    const dashboardBucket = buckets?.find(bucket => bucket.name === 'dashboard');
    if (!dashboardBucket) {
      console.log('Le bucket dashboard n\'existe pas');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Le bucket dashboard n\'existe pas',
          deletedCount: 0
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    console.log('✅ Bucket dashboard trouvé');

    // Étape 2: Lister tous les fichiers dans le bucket dashboard
    console.log('Étape 2: Récupération de la liste des fichiers...');
    const { data: files, error: listError } = await supabase.storage
      .from('dashboard')
      .list('', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (listError) {
      console.error('Erreur lors de la récupération des fichiers:', listError);
      throw new Error(`Erreur de listage: ${listError.message}`);
    }

    if (!files || files.length === 0) {
      console.log('Aucun fichier trouvé dans le bucket dashboard');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Aucun fichier à supprimer dans le bucket dashboard',
          deletedCount: 0
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    console.log(`Nombre de fichiers trouvés: ${files.length}`);
    console.log('Fichiers à supprimer:', files.map(f => f.name));

    // Étape 3: Supprimer tous les fichiers un par un pour plus de fiabilité
    console.log('Étape 3: Suppression de tous les fichiers...');
    let deletedCount = 0;
    const deletedFiles: string[] = [];
    const failedFiles: string[] = [];

    for (const file of files) {
      try {
        console.log(`Suppression du fichier: ${file.name}`);
        const { error: deleteError } = await supabase.storage
          .from('dashboard')
          .remove([file.name]);

        if (deleteError) {
          console.error(`Erreur lors de la suppression de ${file.name}:`, deleteError);
          failedFiles.push(file.name);
        } else {
          console.log(`✅ Fichier supprimé: ${file.name}`);
          deletedFiles.push(file.name);
          deletedCount++;
        }
      } catch (error) {
        console.error(`Erreur lors de la suppression de ${file.name}:`, error);
        failedFiles.push(file.name);
      }
    }

    // Étape 4: Vérification finale
    console.log('Étape 4: Vérification finale...');
    const { data: remainingFiles, error: finalListError } = await supabase.storage
      .from('dashboard')
      .list('', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (finalListError) {
      console.warn('Erreur lors de la vérification finale:', finalListError);
    } else {
      console.log(`Fichiers restants après suppression: ${remainingFiles?.length || 0}`);
      if (remainingFiles && remainingFiles.length > 0) {
        console.log('Fichiers restants:', remainingFiles.map(f => f.name));
      }
    }

    console.log(`✅ ${deletedCount} fichier(s) supprimé(s) avec succès`);
    if (failedFiles.length > 0) {
      console.log(`❌ ${failedFiles.length} fichier(s) ont échoué:`, failedFiles);
    }
    console.log('✅ SUPPRESSION COMPLÈTE BUCKET DASHBOARD TERMINÉE');
    console.log('=== FIN SUPPRESSION COMPLÈTE BUCKET DASHBOARD ===');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${deletedCount} fichier(s) supprimé(s) du bucket dashboard (limite 50MB par fichier)`,
        deletedCount,
        deletedFiles,
        failedFiles,
        totalFiles: files.length
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('❌ ERREUR LORS DE LA SUPPRESSION DU BUCKET DASHBOARD:', error);
    
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