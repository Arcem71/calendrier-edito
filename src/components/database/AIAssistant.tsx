import React, { useState, useEffect } from 'react';
import { X, Send, Loader2, Bot } from 'lucide-react';
import { ContentItem } from '../../types';

interface AIAssistantProps {
  item: ContentItem;
  onClose: () => void;
  onUpdateName: (newName: string) => void;
  onUpdateDescription: (newDescription: string) => void;
  editingField: 'name' | 'description';
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ 
  item, 
  onClose, 
  onUpdateName, 
  onUpdateDescription, 
  editingField 
}) => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditingName = editingField === 'name';
  const currentValue = isEditingName ? item.name : item.description;
  const fieldLabel = isEditingName ? 'Nom/Titre' : 'Description';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('https://n8n.arcem-assurances.fr/webhook/edito', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nom: item.name,
          plateformes: item.platforms,
          images: Array.isArray(item.images) ? item.images.map(img => img.url) : [],
          description: item.description,
          message: message,
          action: isEditingName ? 'modification_titre' : 'modification_description'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      let newContent: string;
      const responseText = await response.text();
      try {
        const data = JSON.parse(responseText);
        if (isEditingName) {
          newContent = data.nom || data.titre || data.name || data.message;
        } else {
          newContent = data.description || data.message;
        }
        
        if (!newContent) {
          throw new Error('Réponse JSON invalide - aucun contenu trouvé');
        }
      } catch {
        newContent = responseText;
      }

      // Appeler la bonne fonction de mise à jour selon le champ
      if (isEditingName) {
        onUpdateName(newContent);
      } else {
        onUpdateDescription(newContent);
      }
      
      onClose();
    } catch (error) {
      console.error('Error in AI Assistant:', error);
      setError(error instanceof Error ? error.message : 'Une erreur est survenue lors de la communication avec l\'assistant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Assistant IA - Modification du {fieldLabel}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="mb-4">
          <h4 className="font-medium mb-2 text-blue-600">
            {fieldLabel} actuel :
          </h4>
          <div className="bg-gray-50 p-3 rounded-lg text-gray-700 border-l-4 border-blue-500">
            {currentValue || `Aucun ${fieldLabel.toLowerCase()}`}
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Votre demande de modification pour le {fieldLabel.toLowerCase()}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full min-h-[100px] p-3 border rounded-lg focus:ring focus:ring-blue-200 focus:border-blue-500"
              placeholder={
                isEditingName 
                  ? "Exemple: Rends ce titre plus accrocheur et professionnel..."
                  : "Exemple: Améliore cette description en la rendant plus engageante..."
              }
              disabled={loading}
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 disabled:opacity-50"
              disabled={loading || !message.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Modification en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Modifier le {fieldLabel}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};