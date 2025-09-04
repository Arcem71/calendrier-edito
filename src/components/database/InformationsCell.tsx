import React, { useState } from 'react';
import { ContentItem } from '../../types';
import { ChevronDown, ChevronUp, Edit3 } from 'lucide-react';

interface InformationsCellProps {
  item: ContentItem;
  isEditing: boolean;
  editingValue: string;
  onStartEdit: (item: ContentItem, field: keyof ContentItem) => void;
  onValueChange: (value: string) => void;
  onSaveEdit: () => void;
}

export function InformationsCell({
  item,
  isEditing,
  editingValue,
  onStartEdit,
  onValueChange,
  onSaveEdit,
}: InformationsCellProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const informations = item.informations || '';
  const maxLength = 100; // Nombre de caractères à afficher en mode compact
  const shouldTruncate = informations.length > maxLength;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      onSaveEdit();
    } else if (e.key === 'Escape') {
      onSaveEdit();
    }
  };

  if (isEditing) {
    return (
      <div className="min-w-0">
        <textarea
          value={editingValue}
          onChange={(e) => onValueChange(e.target.value)}
          onBlur={onSaveEdit}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={4}
          placeholder="Ajoutez des informations complémentaires..."
          autoFocus
        />
        <div className="mt-1 text-xs text-gray-500">
          Ctrl+Entrée pour sauvegarder • Échap pour annuler
        </div>
      </div>
    );
  }

  if (!informations) {
    return (
      <button
        onClick={() => onStartEdit(item, 'informations')}
        className="w-full min-h-[2rem] px-3 py-2 text-left text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 hover:border-gray-300 transition-all duration-200 flex items-center gap-2"
      >
        <Edit3 className="w-3 h-3" />
        <span className="text-sm">Ajouter des informations...</span>
      </button>
    );
  }

  return (
    <div className="min-w-0">
      <div className="group relative">
        {/* Contenu principal */}
        <div
          className={`text-sm text-gray-700 leading-relaxed cursor-pointer transition-all duration-200 ${
            isExpanded ? '' : 'line-clamp-3'
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {shouldTruncate && !isExpanded ? (
            <>
              {informations.substring(0, maxLength)}
              <span className="text-blue-600 font-medium">... voir plus</span>
            </>
          ) : (
            informations
          )}
        </div>

        {/* Boutons d'action (apparaissent au hover ou si développé) */}
        <div
          className={`flex items-center gap-2 mt-2 transition-opacity duration-200 ${
            isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-all duration-200"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Réduire
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Développer
                </>
              )}
            </button>
          )}

          <button
            onClick={() => onStartEdit(item, 'informations')}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-all duration-200"
          >
            <Edit3 className="w-3 h-3" />
            Modifier
          </button>
        </div>
      </div>

      {/* Indicateur de longueur */}
      {informations.length > 50 && (
        <div className="mt-1 text-xs text-gray-400">
          {informations.length} caractères
        </div>
      )}
    </div>
  );
}