import React, { useState } from 'react';
import { X, Edit2, CheckCircle } from 'lucide-react';
import { SearchRequestItem } from './types';

interface EditModalProps {
  item: SearchRequestItem;
  onClose: () => void;
  onUpdate: (item: SearchRequestItem) => void;
}

export const EditModal: React.FC<EditModalProps> = ({ item, onClose, onUpdate }) => {
  const [editingItem, setEditingItem] = useState<SearchRequestItem>(item);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(editingItem);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Edit2 className="w-5 h-5" />
          Modifier l'entrée - {editingItem.nom || 'Sans nom'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                type="text"
                value={editingItem.nom}
                onChange={(e) => setEditingItem({...editingItem, nom: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secteur</label>
              <input
                type="text"
                value={editingItem.secteur}
                onChange={(e) => setEditingItem({...editingItem, secteur: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise</label>
              <input
                type="text"
                value={editingItem.entreprise}
                onChange={(e) => setEditingItem({...editingItem, entreprise: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profil LinkedIn</label>
              <input
                type="url"
                value={editingItem.profil_link}
                onChange={(e) => setEditingItem({...editingItem, profil_link: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://fr.linkedin.com/in/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">État</label>
              <select
                value={editingItem.etat}
                onChange={(e) => setEditingItem({...editingItem, etat: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="connecté">connecté</option>
                <option value="non connecté">non connecté</option>
                <option value="en attente d'acceptation">en attente d'acceptation</option>
                <option value="publié">publié</option>
                <option value="refusé">refusé</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recherche originale</label>
              <input
                type="text"
                value={editingItem.search_request}
                onChange={(e) => setEditingItem({...editingItem, search_request: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">MBTI</label>
            <textarea
              value={editingItem.mbti}
              onChange={(e) => setEditingItem({...editingItem, mbti: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Analyse MBTI du prospect..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={editingItem.bio}
              onChange={(e) => setEditingItem({...editingItem, bio: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Biographie du prospect..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message généré</label>
            <textarea
              value={editingItem.message}
              onChange={(e) => setEditingItem({...editingItem, message: e.target.value})}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Message de prospection généré..."
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Sauvegarder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};