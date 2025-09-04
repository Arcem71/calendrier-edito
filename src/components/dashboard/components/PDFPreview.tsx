import React, { useState, useEffect } from 'react';
import { FileText, AlertCircle } from 'lucide-react';

interface PDFPreviewProps {
  url: string;
  alt?: string;
  className?: string;
  onError?: () => void;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({ 
  url, 
  alt = "PDF Document", 
  className = "w-full h-full object-cover",
  onError 
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const generatePDFPreview = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        // Vérifier si c'est bien un PDF
        if (!url.toLowerCase().includes('.pdf')) {
          setHasError(true);
          return;
        }

        // Utiliser l'edge function pour convertir le PDF en image
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-pdf-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: url,
            filename: `pdf_preview_${Date.now()}.pdf`
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success && result.url) {
          setPreviewUrl(result.url);
        } else {
          throw new Error(result.error || 'Failed to generate preview');
        }

      } catch (error) {
        console.error('Erreur lors de la génération de l\'aperçu PDF:', error);
        setHasError(true);
        onError?.();
      } finally {
        setIsLoading(false);
      }
    };

    if (url) {
      generatePDFPreview();
    }
  }, [url, onError]);

  if (isLoading) {
    return (
      <div className={`${className} bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-xs text-blue-600 font-medium">Chargement...</div>
        </div>
      </div>
    );
  }

  if (hasError || !previewUrl) {
    return (
      <div className={`${className} bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center`}>
        <div className="text-center">
          <FileText className="w-6 h-6 text-gray-500 mx-auto mb-1" />
          <div className="text-xs text-gray-600 font-medium">PDF</div>
          {hasError && (
            <AlertCircle className="w-3 h-3 text-red-500 mx-auto mt-1" />
          )}
        </div>
      </div>
    );
  }

  return (
    <img
      src={previewUrl}
      alt={alt}
      className={className}
      onError={() => {
        setHasError(true);
        onError?.();
      }}
    />
  );
};