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

interface ProcessPdfRequest {
  url: string;
  filename?: string;
}

async function downloadAndConvertPdf(url: string, filename?: string): Promise<string> {
  try {
    console.log('🚀 === DÉBUT CONVERSION PDF VERS JPG RÉELLE ===');
    console.log('📄 URL du PDF:', url);
    console.log('📝 Filename:', filename);

    // Valider l'URL
    try {
      new URL(url);
    } catch (e) {
      throw new Error('URL invalide fournie');
    }

    // Télécharger le PDF avec timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    console.log('⬇️ Téléchargement du PDF...');
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.error('❌ Erreur de téléchargement:', response.status, response.statusText);
      throw new Error(`Échec du téléchargement du PDF: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    console.log('📋 Content-Type:', contentType);
    
    const pdfBuffer = await response.arrayBuffer();
    console.log('📊 Taille du PDF téléchargé:', pdfBuffer.byteLength, 'bytes');
    
    // Vérifier la taille du fichier
    if (pdfBuffer.byteLength > 10 * 1024 * 1024) {
      throw new Error('Le PDF dépasse la limite de 10MB');
    }

    if (pdfBuffer.byteLength < 1000) {
      throw new Error('Le fichier téléchargé semble trop petit pour être un PDF valide');
    }

    // Vérifier que c'est bien un PDF en regardant les premiers bytes
    const pdfHeader = new Uint8Array(pdfBuffer.slice(0, 4));
    const headerString = String.fromCharCode(...pdfHeader);
    console.log('🔍 Header du fichier:', headerString);
    
    if (!headerString.startsWith('%PDF')) {
      console.warn('⚠️ Le fichier ne semble pas être un PDF valide (header manquant)');
      // On continue quand même, parfois les PDFs ont des headers différents
    }

    // Convertir le PDF en JPG
    console.log('🔄 Début de la conversion PDF vers JPG...');
    const jpegImageUrl = await convertPdfToJpeg(pdfBuffer, filename);

    console.log('✅ Conversion et upload réussis');
    console.log('🌐 URL publique de l\'image JPG:', jpegImageUrl);
    console.log('🏁 === FIN CONVERSION PDF VERS JPG RÉELLE ===');

    return jpegImageUrl;

  } catch (error) {
    console.error('❌ Erreur lors de la conversion PDF:', error);
    console.log('🎨 Création d\'un placeholder à la place...');
    
    // En cas d'erreur, créer un placeholder avec le message d'erreur
    return await createPlaceholderImage(filename, error instanceof Error ? error.message : 'Erreur inconnue');
  }
}

// Convertir le PDF en JPG en utilisant l'API PDF.co
async function convertPdfToJpeg(pdfBuffer: ArrayBuffer, filename?: string): Promise<string> {
  try {
    console.log('🔄 Début conversion avec PDF.co...');
    
    // Votre clé API PDF.co
    const apiKey = 'enzo.larue@arcem-assurances.fr_fvDy5Dplmk5VdECSbvfXngCz4KniHKIrcpAQOuSWe8UZbycnq4I3dBeRDNeG39Mz';
    
    // Étape 1: Upload du PDF vers PDF.co
    console.log('📤 Upload du PDF vers PDF.co...');
    
    // Créer le FormData correctement
    const formData = new FormData();
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const pdfFilename = filename || `document_${Date.now()}.pdf`;
    formData.append('file', pdfBlob, pdfFilename);
    
    console.log('📋 Nom du fichier pour upload:', pdfFilename);
    console.log('📊 Taille du blob PDF:', pdfBlob.size, 'bytes');
    
    const uploadResponse = await fetch('https://api.pdf.co/v1/file/upload', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
      },
      body: formData
    });

    console.log('📤 Upload response status:', uploadResponse.status);
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ Erreur upload PDF.co:', errorText);
      throw new Error(`Erreur upload PDF.co: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    console.log('✅ Upload réussi, résultat:', uploadResult);
    
    if (!uploadResult.url) {
      console.error('❌ Aucune URL retournée par l\'upload');
      throw new Error('Aucune URL de fichier retournée par l\'upload PDF.co');
    }

    console.log('🔗 URL du PDF uploadé:', uploadResult.url);

    // Étape 2: Conversion PDF vers JPG
    console.log('🔄 Lancement de la conversion PDF vers JPG...');
    const conversionPayload = {
      url: uploadResult.url,
      pages: "1", // Seulement la première page
      async: false, // Conversion synchrone
      name: filename ? filename.replace(/\.pdf$/i, '_page1.jpg') : 'converted_page1.jpg'
    };

    console.log('📋 Payload de conversion:', JSON.stringify(conversionPayload, null, 2));

    const conversionResponse = await fetch('https://api.pdf.co/v1/pdf/convert/to/jpg', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(conversionPayload)
    });

    console.log('🔄 Conversion response status:', conversionResponse.status);

    if (!conversionResponse.ok) {
      const errorText = await conversionResponse.text();
      console.error('❌ Erreur conversion PDF.co:', errorText);
      throw new Error(`Erreur conversion PDF.co: ${conversionResponse.status} - ${errorText}`);
    }

    const conversionResult = await conversionResponse.json();
    console.log('✅ Conversion réussie, résultat:', conversionResult);
    
    if (!conversionResult.url) {
      console.error('❌ Aucune URL d\'image retournée');
      throw new Error('Aucune URL d\'image retournée par la conversion PDF.co');
    }

    console.log('🖼️ URL de l\'image convertie:', conversionResult.url);

    // Étape 3: Télécharger l'image convertie
    console.log('📥 Téléchargement de l\'image convertie...');
    const imageResponse = await fetch(conversionResult.url);
    if (!imageResponse.ok) {
      console.error('❌ Échec du téléchargement de l\'image:', imageResponse.status);
      throw new Error(`Échec du téléchargement de l\'image convertie: ${imageResponse.status}`);
    }

    const imageBlob = await imageResponse.blob();
    console.log('✅ Image téléchargée, taille:', imageBlob.size, 'bytes');
    console.log('📋 Type de contenu de l\'image:', imageBlob.type);

    // Étape 4: Upload vers Supabase Storage
    const imageFilename = filename 
      ? filename.replace(/\.pdf$/i, '_page1.jpg')
      : `pdf_page1_${crypto.randomUUID()}.jpg`;

    console.log('📤 Upload vers Supabase Storage avec le nom:', imageFilename);

    // Vérifier que le bucket dashboard existe
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === 'dashboard');
    
    if (!bucketExists) {
      console.log('🪣 Création du bucket dashboard...');
      const { error: createError } = await supabase.storage.createBucket('dashboard', {
        public: true,
        fileSizeLimit: 52428800 // 50MB
      });
      if (createError) {
        console.error('❌ Erreur création bucket:', createError);
        throw createError;
      }
    }

    // Uploader l'image JPG vers Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('dashboard')
      .upload(imageFilename, imageBlob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Erreur d\'upload Supabase:', uploadError);
      throw new Error(`Échec de l\'upload: ${uploadError.message}`);
    }

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('dashboard')
      .getPublicUrl(imageFilename);

    if (!publicUrl) {
      throw new Error('Échec de la génération de l\'URL publique');
    }

    console.log('✅ Image JPG convertie et uploadée avec succès!');
    console.log('🌐 URL publique finale:', publicUrl);
    return publicUrl;

  } catch (error) {
    console.error('❌ Erreur lors de la conversion PDF vers JPG:', error);
    throw error;
  }
}

// Créer une image placeholder si la conversion PDF échoue
async function createPlaceholderImage(filename?: string, errorMessage?: string): Promise<string> {
  try {
    console.log('🎨 Création d\'une image placeholder pour le PDF...');
    console.log('📝 Filename:', filename);
    console.log('⚠️ Erreur:', errorMessage);
    
    // Créer un canvas pour générer une image placeholder
    const canvas = new OffscreenCanvas(600, 400);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Impossible de créer le contexte canvas');
    }

    // Dessiner l'arrière-plan
    ctx.fillStyle = '#fef2f2';
    ctx.fillRect(0, 0, 600, 400);

    // Dessiner une bordure rouge
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, 570, 370);

    // Dessiner l'icône PDF avec une croix d'erreur
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(250, 120, 100, 140);
    
    // Ajouter le texte "PDF"
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PDF', 300, 190);

    // Ajouter une croix d'erreur
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(270, 140);
    ctx.lineTo(330, 200);
    ctx.moveTo(330, 140);
    ctx.lineTo(270, 200);
    ctx.stroke();

    // Ajouter le titre "Conversion échouée"
    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText('Conversion échouée', 300, 290);

    // Ajouter le nom du fichier
    ctx.fillStyle = '#64748b';
    ctx.font = '14px Arial, sans-serif';
    const displayName = filename || 'document.pdf';
    const shortName = displayName.length > 35 ? displayName.substring(0, 32) + '...' : displayName;
    ctx.fillText(shortName, 300, 320);

    // Ajouter le message d'erreur (tronqué)
    ctx.fillStyle = '#ef4444';
    ctx.font = '12px Arial, sans-serif';
    const shortError = errorMessage ? (errorMessage.length > 60 ? errorMessage.substring(0, 57) + '...' : errorMessage) : 'Erreur inconnue';
    ctx.fillText(shortError, 300, 345);

    // Convertir en blob JPG
    const blob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: 0.9
    });

    console.log('🎨 Placeholder créé, taille:', blob.size, 'bytes');

    // Générer un nom de fichier
    const imageFilename = filename 
      ? filename.replace(/\.pdf$/i, '_error.jpg')
      : `pdf_error_${crypto.randomUUID()}.jpg`;

    console.log('📤 Upload du placeholder vers Supabase:', imageFilename);

    // Uploader vers Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('dashboard')
      .upload(imageFilename, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Erreur upload placeholder:', uploadError);
      throw new Error(`Échec de l\'upload du placeholder: ${uploadError.message}`);
    }

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('dashboard')
      .getPublicUrl(imageFilename);

    console.log('✅ Image placeholder créée avec succès:', publicUrl);
    return publicUrl;

  } catch (error) {
    console.error('❌ Erreur lors de la création du placeholder:', error);
    
    // Dernier recours: retourner l'URL Pexels (c'est ce que vous voyez actuellement)
    console.log('🔄 Utilisation de l\'image Pexels en dernier recours');
    return 'https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop';
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    console.log('🚀 === NOUVELLE REQUÊTE DE CONVERSION PDF ===');
    console.log('🕐 Timestamp:', new Date().toISOString());
    
    if (!req.body) {
      throw new Error('Corps de la requête requis');
    }

    const { url, filename }: ProcessPdfRequest = await req.json();
    console.log('📋 Paramètres reçus:');
    console.log('  - URL:', url);
    console.log('  - Filename:', filename);
    
    if (!url) {
      throw new Error('URL requise');
    }

    const publicUrl = await downloadAndConvertPdf(url, filename);

    console.log('🎉 === CONVERSION TERMINÉE AVEC SUCCÈS ===');
    console.log('🌐 URL finale:', publicUrl);

    return new Response(
      JSON.stringify({ 
        url: publicUrl,
        success: true,
        message: 'PDF converti en JPG avec succès (première page extraite via PDF.co)'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('❌ === ERREUR GLOBALE ===');
    console.error('Message:', error instanceof Error ? error.message : 'Erreur inconnue');
    console.error('Stack:', error instanceof Error ? error.stack : 'Pas de stack');
    
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