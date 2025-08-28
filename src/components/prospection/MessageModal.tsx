import React from 'react';
import { X, FileText } from 'lucide-react';

interface MessageModalProps {
  message: string;
  nom: string;
  onClose: () => void;
}

export const MessageModal: React.FC<MessageModalProps> = ({ message, nom, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Message pour {nom || 'Prospect'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
            {message || 'Aucun message disponible'}
          </div>
        </div>
      </div>
    </div>
  );
};