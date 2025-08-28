import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

export const getStatusIcon = (etat: string) => {
  switch (etat?.toLowerCase()) {
    case 'connecté':
    case 'publié':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'en attente d\'acceptation':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case 'non connecté':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'refusé':
      return <XCircle className="w-4 h-4 text-red-600" />;
    default:
      return <Clock className="w-4 h-4 text-gray-500" />;
  }
};

export const getStatusClasses = (etat: string) => {
  switch (etat?.toLowerCase()) {
    case 'connecté':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'publié':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'en attente d\'acceptation':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'non connecté':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'refusé':
      return 'bg-red-200 text-red-900 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};