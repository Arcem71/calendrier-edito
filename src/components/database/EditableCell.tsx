import React from 'react';
import { Bot } from 'lucide-react';
import { ContentItem } from '../../types';

interface EditableCellProps {
  item: ContentItem;
  field: keyof ContentItem;
  isEditing: boolean;
  editingValue: string;
  onStartEdit: (item: ContentItem, field: keyof ContentItem) => void;
  onValueChange: (value: string) => void;
  onSaveEdit: () => void;
  onShowAI?: (item: ContentItem, field: 'name' | 'description') => void;
  showAIButton?: boolean;
}

export const EditableCell: React.FC<EditableCellProps> = ({
  item,
  field,
  isEditing,
  editingValue,
  onStartEdit,
  onValueChange,
  onSaveEdit,
  onShowAI,
  showAIButton = false
}) => {
  const value = item[field] as string;

  if (isEditing) {
    return (
      <div className="flex-1">
        {field === 'date_brute' ? (
          <input
            type="date"
            value={editingValue}
            onChange={(e) => onValueChange(e.target.value)}
            onBlur={onSaveEdit}
            autoFocus
            className="w-full px-2 py-1 border rounded focus:border-blue-500 focus:ring focus:ring-blue-200"
          />
        ) : field === 'name' ? (
          <textarea
            value={editingValue}
            onChange={(e) => onValueChange(e.target.value)}
            onBlur={onSaveEdit}
            autoFocus
            className="w-full px-2 py-1 border rounded focus:border-blue-500 focus:ring focus:ring-blue-200 min-h-[120px] resize-y"
            style={{ whiteSpace: 'pre-wrap' }}
          />
        ) : (
          <textarea
            value={editingValue}
            onChange={(e) => onValueChange(e.target.value)}
            onBlur={onSaveEdit}
            autoFocus
            className="w-full px-2 py-1 border rounded focus:border-blue-500 focus:ring focus:ring-blue-200 min-h-[200px] resize-y"
            style={{ whiteSpace: 'pre-wrap' }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => onStartEdit(item, field)}
      className="cursor-pointer group min-h-[40px] relative"
    >
      <div className="relative">
        <div style={{ whiteSpace: 'pre-wrap' }}>
          {field === 'date_brute' && value ? (
            new Date(value).toLocaleDateString('fr-FR')
          ) : value || <span className="text-gray-400">Cliquez pour éditer</span>}
        </div>
        {showAIButton && onShowAI && (field === 'name' || field === 'description') && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowAI(item, field as 'name' | 'description');
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-500 text-white rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-blue-600 pointer-events-none group-hover:pointer-events-auto"
            title={`Utiliser l'assistant IA pour modifier ${field === 'name' ? 'le titre' : 'la description'}`}
          >
            <Bot className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};