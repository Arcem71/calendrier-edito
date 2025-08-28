import React, { useState } from 'react';
import { Search, Send, Loader2, Lightbulb, Building2, Target, MapPin, Hash, Sparkles, Zap, Brain } from 'lucide-react';

interface SearchFormProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const SearchForm: React.FC<SearchFormProps> = ({
  searchQuery,
  setSearchQuery,
  loading,
  onSubmit
}) => {
  const [wordCount, setWordCount] = useState(0);
  const [showExamples, setShowExamples] = useState(false);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setWordCount(value.trim().split(/\s+/).filter(word => word.length > 0).length);
  };
  
  const examples = [
    "Rechercher 10 dirigeants d'entreprises industrielles en Bourgogne-Franche-Comté",
    "Trouver 15 responsables marketing dans le secteur automobile à Lyon",
    "Générer 20 profils de directeurs commerciaux banque-assurance Paris",
    "Identifier 12 managers IT start-up tech Lille-Métropole"
  ];
  
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <label htmlFor="search" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-lg font-semibold text-gray-800">Description de votre recherche</span>
              <p className="text-sm text-gray-600 mt-0.5">Décrivez en langage naturel les prospects que vous cherchez</p>
            </div>
          </label>
          
          <button
            type="button"
            onClick={() => setShowExamples(!showExamples)}
            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 flex items-center gap-1"
          >
            <Lightbulb className="w-4 h-4" />
            {showExamples ? 'Masquer' : 'Exemples'}
          </button>
        </div>
        
        {/* Examples dropdown */}
        {showExamples && (
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Exemples de recherches efficaces :
            </h4>
            <div className="space-y-2">
              {examples.map((example, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setSearchQuery(example);
                    setWordCount(example.trim().split(/\s+/).length);
                    setShowExamples(false);
                  }}
                  className="block w-full text-left p-3 bg-white hover:bg-blue-50 rounded-lg border border-blue-100 hover:border-blue-300 transition-all duration-200 text-sm text-gray-700 hover:text-blue-800"
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="relative">
          <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
            <Search className="w-5 h-5 text-gray-400" />
            <span className="text-gray-400 font-medium">Votre recherche</span>
          </div>
          
          <textarea
            id="search"
            value={searchQuery}
            onChange={handleInputChange}
            placeholder="Exemple : Rechercher 15 dirigeants d'entreprises industrielles en Bourgogne-Franche-Comté spécialisées dans la mécanique de précision..."
            className="w-full pt-12 px-4 pb-16 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all duration-300 resize-none text-gray-800 placeholder-gray-400 shadow-lg hover:shadow-xl"
            rows={5}
            disabled={loading}
          />
          
          {/* Bottom bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-gray-50 to-blue-50 border-t border-gray-200 rounded-b-2xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Hash className="w-4 h-4" />
                <span>{wordCount} mots</span>
              </div>
              {searchQuery.length > 0 && (
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  wordCount >= 8 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {wordCount >= 8 ? '✓ Suffisant' : 'Trop court'}
                </div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={loading || !searchQuery.trim() || wordCount < 5}
              className={`px-6 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 font-semibold shadow-lg ${
                loading || !searchQuery.trim() || wordCount < 5
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 hover:scale-105 hover:shadow-xl'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Génération...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>Générer les prospects</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Instructions */}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-2xl p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-lg font-bold text-green-900">IA de prospection avancée</h3>
              <div className="px-2 py-1 bg-green-200 text-green-800 rounded-lg text-xs font-medium">NOUVEAU</div>
            </div>
            
            <p className="text-green-800 mb-4">
              Notre intelligence artificielle analyse votre demande et génère automatiquement des profils LinkedIn qualifiés avec messages personnalisés.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Building2 className="w-3 h-3 text-white" />
                  </div>
                  <span className="font-semibold text-gray-800">Secteur</span>
                </div>
                <p className="text-sm text-gray-600">Industriel, Tech, Finance, Santé, Automobile...</p>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Target className="w-3 h-3 text-white" />
                  </div>
                  <span className="font-semibold text-gray-800">Fonction</span>
                </div>
                <p className="text-sm text-gray-600">CEO, Directeur, Manager, Responsable...</p>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center">
                    <MapPin className="w-3 h-3 text-white" />
                  </div>
                  <span className="font-semibold text-gray-800">Zone</span>
                </div>
                <p className="text-sm text-gray-600">Bourgogne, Paris, Lyon, Marseille...</p>
              </div>
              
              <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center">
                    <Hash className="w-3 h-3 text-white" />
                  </div>
                  <span className="font-semibold text-gray-800">Quantité</span>
                </div>
                <p className="text-sm text-gray-600">10, 15, 20 profils à générer...</p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="font-medium">
                  Astuce : Plus votre description est précise, meilleurs seront les résultats générés par l'IA
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};