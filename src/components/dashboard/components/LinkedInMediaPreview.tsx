import React from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';
import { PDFPreview } from './PDFPreview';

interface LinkedInMediaPreviewProps {
  post: any;
  index: number;
  className?: string;
}

export const LinkedInMediaPreview: React.FC<LinkedInMediaPreviewProps> = ({ 
  post, 
  index, 
  className = "w-20 h-20 rounded-xl overflow-hidden bg-gray-100 group-hover:shadow-lg transition-all duration-200" 
}) => {
  // Si on a une image dans media.items (image convertie depuis PDF ou image normale)
  if (post.media?.items?.[0]?.url) {
    const mediaUrl = post.media.items[0].url;
    
    return (
      <div className="flex-shrink-0 relative">
        <div className={className}>
          <img
            src={mediaUrl}
            alt={`Post LinkedIn ${index + 1}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://placehold.co/80x80?text=?';
            }}
          />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
          <ImageIcon className="w-3 h-3 text-white" />
        </div>
      </div>
    );
  }

  // Si on a un document PDF, essayer de générer un aperçu
  if (post.document?.url) {
    const documentUrl = post.document.url;
    const isPDF = documentUrl.toLowerCase().includes('.pdf');

    if (isPDF) {
      return (
        <div className="flex-shrink-0 relative">
          <div className={className}>
            <PDFPreview
              url={documentUrl}
              alt={`Document LinkedIn ${index + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              onError={() => {
                console.log('Erreur lors du chargement de l\'aperçu PDF');
              }}
            />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
            <FileText className="w-3 h-3 text-white" />
          </div>
        </div>
      );
    } else {
      // Autre type de document
      return (
        <div className="flex-shrink-0 relative">
          <div className={`${className} bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center`}>
            <div className="text-center">
              <FileText className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <div className="text-xs text-blue-600 font-medium">DOC</div>
            </div>
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
            <FileText className="w-3 h-3 text-white" />
          </div>
        </div>
      );
    }
  }

  // Aucun média trouvé
  return null;
};