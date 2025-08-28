import React from 'react';
import { Instagram, Facebook, Linkedin, TrendingUp, Users, Heart, ArrowUpRight } from 'lucide-react';
import { SocialStats } from '../types';
import { handleSocialLinkClick } from '../utils/socialLinks';

interface StatsCardsProps {
  stats: SocialStats | null;
  getCurrentMonthInstagramLikes: () => number;
  getCurrentMonthFacebookLikes: () => number;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  stats,
  getCurrentMonthInstagramLikes,
  getCurrentMonthFacebookLikes
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Instagram Card */}
      <div className="group relative bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-2xl p-8 text-white overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-2">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full"></div>
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Instagram className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Instagram</h3>
                <p className="text-pink-100 text-sm">Réseau visuel</p>
              </div>
            </div>
            <button
              onClick={() => handleSocialLinkClick('instagram')}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all duration-200 backdrop-blur-sm group"
              title="Visiter la page Instagram"
            >
              <ArrowUpRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-3xl font-bold">
                  {stats?.follow_insta?.toLocaleString() ?? '---'}
                </div>
                <div className="text-pink-100 font-medium">Abonnés</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {getCurrentMonthInstagramLikes().toLocaleString()}
                </div>
                <div className="text-pink-100 font-medium">Likes ce mois</div>
              </div>
            </div>
          </div>
          
          {/* Growth indicator */}
          <div className="mt-6 flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-300" />
            <span className="text-pink-100">En croissance</span>
          </div>
        </div>
      </div>

      {/* Facebook Card */}
      <div className="group relative bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 rounded-2xl p-8 text-white overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-2">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full"></div>
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Facebook className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Facebook</h3>
                <p className="text-blue-100 text-sm">Réseau social</p>
              </div>
            </div>
            <button
              onClick={() => handleSocialLinkClick('facebook')}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all duration-200 backdrop-blur-sm group"
              title="Visiter la page Facebook"
            >
              <ArrowUpRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-3xl font-bold">
                  {stats?.follow_facebook?.toLocaleString() ?? '---'}
                </div>
                <div className="text-blue-100 font-medium">Fans</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {getCurrentMonthFacebookLikes().toLocaleString()}
                </div>
                <div className="text-blue-100 font-medium">Réactions ce mois</div>
              </div>
            </div>
          </div>
          
          {/* Growth indicator */}
          <div className="mt-6 flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-300" />
            <span className="text-blue-100">Performance stable</span>
          </div>
        </div>
      </div>

      {/* LinkedIn Card */}
      <div className="group relative bg-gradient-to-br from-blue-800 via-indigo-700 to-purple-700 rounded-2xl p-8 text-white overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-2">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full"></div>
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Linkedin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">LinkedIn</h3>
                <p className="text-indigo-100 text-sm">Réseau pro</p>
              </div>
            </div>
            <button
              onClick={() => handleSocialLinkClick('linkedin')}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all duration-200 backdrop-blur-sm group"
              title="Visiter la page LinkedIn"
            >
              <ArrowUpRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-3xl font-bold">
                  {stats?.follow_linkedin?.toLocaleString() ?? '---'}
                </div>
                <div className="text-indigo-100 font-medium">Abonnés</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold">
                    {stats?.follow_gain_linkedin?.toLocaleString() ?? '---'}
                  </div>
                  <div className="text-indigo-100 text-sm font-medium">Nouveaux</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xl font-bold">
                    {stats?.like_linkedin?.toLocaleString() ?? '---'}
                  </div>
                  <div className="text-indigo-100 text-sm font-medium">Likes</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Growth indicator */}
          <div className="mt-6 flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-green-300" />
            <span className="text-indigo-100">Engagement élevé</span>
          </div>
        </div>
      </div>
    </div>
  );
};