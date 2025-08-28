import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, CalendarIcon } from 'lucide-react';
import { Platform, Status } from '../../types';

interface TableHeaderProps {
  sortField: string;
  sortDirection: 'asc' | 'desc';
  selectedStatus: Status | null;
  selectedPlatform: Platform | null;
  compactView?: boolean;
  onSort: (field: string) => void;
  onStatusFilter: (status: Status | null) => void;
  onPlatformFilter: (platform: Platform | null) => void;
}

const platformOptions: Platform[] = ['Instagram', 'Facebook', 'Twitter', 'LinkedIn', 'TikTok', 'YouTube', 'Blog'];
const statusOptions: Status[] = ['Publiée', 'En Attente de Validation', 'Planifiée'];

export const TableHeader: React.FC<TableHeaderProps> = ({
  sortField,
  sortDirection,
  selectedStatus,
  selectedPlatform,
  compactView = false,
  onSort,
  onStatusFilter,
  onPlatformFilter
}) => {
  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return (
        <button
          onClick={() => onSort(field)}
          className="ml-1 text-gray-400 hover:text-gray-600"
        >
          <ArrowUpDown className="w-4 h-4" />
        </button>
      );
    }

    return (
      <button
        onClick={() => onSort(field)}
        className="ml-1 text-blue-500"
      >
        {sortDirection === 'asc' ? (
          <ArrowUp className="w-4 h-4" />
        ) : (
          <ArrowDown className="w-4 h-4" />
        )}
      </button>
    );
  };

  const renderStatusHeader = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Statut
        </span>
        {renderSortIcon('status')}
      </div>
      <div className="relative">
        <select
          value={selectedStatus || ''}
          onChange={(e) => onStatusFilter(e.target.value as Status | null)}
          className="text-xs border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">Tous</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const renderPlatformsHeader = () => (
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Plateformes
        </span>
        {renderSortIcon('platforms')}
      </div>
      <div className="relative">
        <select
          value={selectedPlatform || ''}
          onChange={(e) => onPlatformFilter(e.target.value as Platform | null)}
          className="text-xs border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">Toutes</option>
          {platformOptions.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <thead>
      <tr className="bg-gray-50 border-b border-gray-200">
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
          Nom {renderSortIcon('name')}
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
          {renderStatusHeader()}
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
          <CalendarIcon className="w-4 h-4 inline mr-1" />
          Date {renderSortIcon('date_brute')}
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
          {renderPlatformsHeader()}
        </th>
        {!compactView && (
          <>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
              Images
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
              Description {renderSortIcon('description')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
              Informations {renderSortIcon('informations')}
            </th>
          </>
        )}
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Actions
        </th>
      </tr>
    </thead>
  );
};