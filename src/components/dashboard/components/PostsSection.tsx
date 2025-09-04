import React from 'react';
import { Instagram, Facebook, Linkedin, ThumbsUp, MessageSquare, Calendar, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { SocialStats } from '../types';
import { handleSocialLinkClick, handlePostClick } from '../utils/socialLinks';
import { formatDate } from '../utils/dateUtils';
import { LinkedInMediaPreview } from './LinkedInMediaPreview';

interface PostsSectionProps {
  stats: SocialStats | null;
}

export const PostsSection: React.FC<PostsSectionProps> = ({ stats }) => {
  const sortedInstagramPosts = stats?.publication_instagram?.slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || [];
    
  const sortedFacebookPosts = stats?.publication_facebook?.slice()
    .sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime()) || [];

  const sortedLinkedInPosts = stats?.publication_linkedin?.slice()
    .filter(post => post && post.text && post.posted_at?.date)
    .sort((a, b) => new Date(b.posted_at.date).getTime() - new Date(a.posted_at.date).getTime()) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Instagram Posts */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Instagram className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Instagram</h3>
                <p className="text-purple-100 text-sm">Publications récentes</p>
              </div>
            </div>
            <button
              onClick={() => handleSocialLinkClick('instagram')}
              className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all duration-200"
              title="Visiter la page Instagram"
            >
              <ExternalLink className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {sortedInstagramPosts.map((post, idx) => (
            <div 
              key={idx} 
              className={`p-6 border-b border-gray-100 last:border-b-0 group ${post.permalink ? 'cursor-pointer hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-200' : ''}`}
              onClick={() => post.permalink && handlePostClick(post.permalink)}
            >
              <div className="flex gap-4">
                {post.media_url && (
                  <div className="flex-shrink-0 relative">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 group-hover:shadow-lg transition-all duration-200">
                      <img
                        src={post.media_url}
                        alt={`Post Instagram ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://placehold.co/80x80?text=?';
                        }}
                      />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                      <ImageIcon className="w-3 h-3 text-white" />
                    </div>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 line-clamp-2 mb-3 group-hover:text-gray-900 transition-colors">
                    {post.caption || "📷 Publication Instagram"}
                  </p>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-lg">
                      <ThumbsUp className="w-3 h-3" />
                      <span className="font-medium">{post.like_count?.toLocaleString() ?? '0'}</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg">
                      <MessageSquare className="w-3 h-3" />
                      <span className="font-medium">{post.comments_count?.toLocaleString() ?? '0'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(new Date(post.timestamp))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {(!stats?.publication_instagram || stats.publication_instagram.length === 0) && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Instagram className="w-8 h-8 text-purple-500" />
              </div>
              <p className="text-gray-500 font-medium">Aucune publication récente</p>
              <p className="text-gray-400 text-sm mt-1">Les dernières publications apparaîtront ici</p>
            </div>
          )}
        </div>
      </div>

      {/* Facebook Posts */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Facebook className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Facebook</h3>
                <p className="text-blue-100 text-sm">Publications récentes</p>
              </div>
            </div>
            <button
              onClick={() => handleSocialLinkClick('facebook')}
              className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all duration-200"
              title="Visiter la page Facebook"
            >
              <ExternalLink className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {sortedFacebookPosts.map((post, idx) => (
            <div 
              key={idx} 
              className={`p-6 border-b border-gray-100 last:border-b-0 group ${post.permalink_url ? 'cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200' : ''}`}
              onClick={() => post.permalink_url && handlePostClick(post.permalink_url)}
            >
              <div className="flex gap-4">
                {post.full_picture && (
                  <div className="flex-shrink-0 relative">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 group-hover:shadow-lg transition-all duration-200">
                      <img
                        src={post.full_picture}
                        alt={`Post Facebook ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://placehold.co/80x80?text=?';
                        }}
                      />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <ImageIcon className="w-3 h-3 text-white" />
                    </div>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 line-clamp-2 mb-3 group-hover:text-gray-900 transition-colors">
                    {post.message || "👥 Publication Facebook"}
                  </p>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg">
                      <ThumbsUp className="w-3 h-3" />
                      <span className="font-medium">{post.totalCount?.toLocaleString() ?? '0'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(new Date(post.created_time))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {(!stats?.publication_facebook || stats.publication_facebook.length === 0) && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Facebook className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-gray-500 font-medium">Aucune publication récente</p>
              <p className="text-gray-400 text-sm mt-1">Les dernières publications apparaîtront ici</p>
            </div>
          )}
        </div>
      </div>

      {/* LinkedIn Posts */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300">
        <div className="bg-gradient-to-r from-blue-800 to-indigo-700 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Linkedin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">LinkedIn</h3>
                <p className="text-blue-100 text-sm">Publications récentes</p>
              </div>
            </div>
            <button
              onClick={() => handleSocialLinkClick('linkedin')}
              className="w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all duration-200"
              title="Visiter la page LinkedIn"
            >
              <ExternalLink className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {sortedLinkedInPosts.map((post, idx) => (
            <div 
              key={idx} 
              className={`p-6 border-b border-gray-100 last:border-b-0 group ${post.post_url ? 'cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200' : ''}`}
              onClick={() => post.post_url && handlePostClick(post.post_url)}
            >
              <div className="flex gap-4">
                {/* Utiliser le composant LinkedInMediaPreview pour gérer tous les types de médias */}
                <LinkedInMediaPreview post={post} index={idx} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 line-clamp-2 mb-3 group-hover:text-gray-900 transition-colors">
                    {post.text || "💼 Publication LinkedIn"}
                  </p>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg">
                      <ThumbsUp className="w-3 h-3" />
                      <span className="font-medium">{post.stats?.like?.toLocaleString() ?? '0'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(new Date(post.posted_at.date))}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {(!stats?.publication_linkedin || stats.publication_linkedin.length === 0) && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Linkedin className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-gray-500 font-medium">Aucune publication récente</p>
              <p className="text-gray-400 text-sm mt-1">Les dernières publications apparaîtront ici</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};