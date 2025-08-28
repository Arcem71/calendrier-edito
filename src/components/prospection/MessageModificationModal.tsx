import React, { useState } from 'react';
import { X, Bot, Send, Loader2 } from 'lucide-react';
import { SearchRequestItem } from './types';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface MessageModificationModalProps {
  item: SearchRequestItem;
  onClose: () => void;
  onUpdate: () => void;
}

export const MessageModificationModal: React.FC<MessageModificationModalProps> = ({ item, onClose, onUpdate }) => {
  const [modificationText, setModificationText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modificationText.trim() || loading) return;

    setLoading(true);
    
    try {
      console.log('Envoi de la modification au webhook...');
      const response = await fetch('https://n8n.arcem-assurances.fr/webhook/prospection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'modification',
          modification: modificationText.trim(),
          nom: item.nom,
          entreprise: item.entreprise,
          mbti: item.mbti,
          message_original: item.message
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
      }

      // Récupérer la réponse
      let newMessage;
      try {
        const responseData = await response.json();
        newMessage = responseData?.message?.content || responseData?.content || responseData?.message || 'Message modifié';
      } catch {
        newMessage = await response.text() || 'Message modifié';
      }

      // Mettre à jour le message dans la base de données
      const { error } = await supabase
        .from('search_request')
        .update({ message: newMessage })
        .eq('id', item.id);

      if (error) throw error;

      onUpdate();
      onClose();
      
      toast.success('Message modifié avec succès !', {
        duration: 4000,
        icon: '🤖'
      });

    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      toast.error(
        `Erreur lors de la modification: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        { duration: 5000 }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-500" />
            Modifier le message pour {item.nom || 'Prospect'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="mb-4">
          <h4 className="font-medium mb-2 text-gray-700">Message actuel :</h4>
          <div className="bg-gray-50 p-3 rounded-lg border max-h-32 overflow-y-auto">
            <div className="whitespace-pre-wrap text-gray-800 text-sm leading-relaxed">
              {item.message || 'Aucun message disponible'}
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quelle modification souhaitez-vous apporter ?
            </label>
            <textarea
              value={modificationText}
              onChange={(e) => setModificationText(e.target.value)}
              className="w-full min-h-[100px] p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              placeholder="Exemple: Rends ce message plus personnel et engageant..."
              disabled={loading}
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 disabled:opacity-50 transition-colors"
              disabled={loading || !modificationText.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Modification en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Modifier le message
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};