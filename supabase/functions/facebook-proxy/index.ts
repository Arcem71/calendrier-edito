import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function downloadAndStoreImage(url: string): Promise<string> {
  try {
    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      throw new Error('Invalid URL provided');
    }

    // Generate a unique filename from the URL
    const filename = `facebook_${crypto.randomUUID()}.jpg`;
    
    // Fetch the image with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      throw new Error('URL does not point to an image');
    }
    
    const blob = await response.blob();
    
    // Check file size (5MB limit)
    if (blob.size > 5 * 1024 * 1024) {
      throw new Error('Image size exceeds 5MB limit');
    }
    
    // Upload to Supabase Storage
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === 'dashboard');
    
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket('dashboard', {
        public: true,
        fileSizeLimit: 5242880 // 5MB in bytes
      });
      if (createError) throw createError;
    }
    
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('dashboard')
      .upload(filename, blob, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('dashboard')
      .getPublicUrl(filename);

    if (!publicUrl) {
      throw new Error('Failed to generate public URL');
    }

    return publicUrl;
  } catch (error) {
    console.error('Error in downloadAndStoreImage:', error);
    throw error;
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
    if (!req.body) {
      throw new Error('Request body is required');
    }

    const { url } = await req.json();
    
    if (!url) {
      throw new Error('URL is required');
    }

    const publicUrl = await downloadAndStoreImage(url);

    return new Response(
      JSON.stringify({ url: publicUrl }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
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