import React from 'react';
import { ContentItem, Status } from '../../types';

interface StatusCellProps {
  item: ContentItem;
  isEditing: boolean;
  onStartEdit: (itemId: string) => void;
  onUpdate: (item: ContentItem, status: Status) => void;
}

const statusOptions: Status[] = ['Publiée', 'En Attente de Validation', 'Planifiée'];

const getStatusClasses = (status: string | null | undefined): string => {
  if (!status) {
    return 'bg-yellow-100 text-yellow-800'; // Default styling for null/undefined status
  }
  
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '');
  switch (normalizedStatus) {
    case 'publiée':
      return 'bg-green-100 text-green-800';
    case 'enattentedevalidation':
      return 'bg-yellow-100 text-yellow-800';
    case 'planifiée':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const StatusCell: React.FC<StatusCellProps> = ({
  item,
  isEditing,
  onStartEdit,
  onUpdate
}) => {
  const currentStatus = item.status || 'En Attente de Validation';
  
  if (isEditing) {
    return (
      <div className="relative">
        <select
          value={currentStatus}
          onChange={(e) => onUpdate(item, e.target.value as Status)}
          className="w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          autoFocus
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div
      onClick={() => onStartEdit(item.id)}
      className="cursor-pointer"
    >
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          getStatusClasses(currentStatus)
        }`}
      >
        {currentStatus}
      </span>
    </div>
  );
};