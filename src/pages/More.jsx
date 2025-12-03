import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useClub } from '@/components/ClubContext';
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import {
  Users, Shield, Package, Trophy, Megaphone, Newspaper,
  Settings, HelpCircle, LogOut, ChevronRight, Building2
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function More() {
  const { user, currentClub, currentMembership, isClubAdmin, isCoach } = useClub();

  const handleLogout = () => {
    base44.auth.logout();
  };

  const adminMenuItems = [
    { icon: Users, label: 'Members', page: 'Members', description: 'Manage club members' },
    { icon: Shield, label: 'Teams', page: 'Teams', description: 'Team management' },
    { icon: Package, label: 'Inventory', page: 'Inventory', description: 'Equipment tracking' },
    { icon: Trophy, label: 'Tournaments', page: 'Tournaments', description: 'Host tournaments' },
    { icon: Megaphone, label: 'Sponsors', page: 'Sponsors', description: 'Sponsor CRM' },
    { icon: Newspaper, label: 'News', page: 'News', description: 'Club news & updates' },
  ];

  const generalMenuItems = [
    { icon: Settings, label: 'Settings', page: 'Settings', description: 'App preferences' },
    { icon: HelpCircle, label: 'Help & Support', page: 'Settings', description: 'Get assistance' },
  ];

  const filteredAdminItems = adminMenuItems.filter(item => {
    if (item.page === 'Inventory' || item.page === 'Sponsors' || item.page === 'Tournaments') {
      return isClubAdmin;
    }
    if (item.page === 'Members' || item.page === 'Teams' || item.page === 'News') {
      return isClubAdmin || isCoach;
    }
    return true;
  });

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      {/* User Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <GlassCard>
          <GlassCardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl">
                  {user?.full_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{user?.full_name || 'User'}</h2>
                <p className="text-gray-500">{user?.email}</p>
                <Badge variant="secondary" className="mt-2 capitalize">
                  {currentMembership?.role?.replace('_', ' ') || 'Member'}
                </Badge>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      </motion.div>

      {/* Club Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <GlassCard>
          <GlassCardContent className="p-4">
            <div className="flex items-center gap-4">
              {currentClub?.logo_url ? (
                <img src={currentClub.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-gray-900">{currentClub?.name || 'No Club Selected'}</h3>
                <p className="text-sm text-gray-500 capitalize">{currentClub?.sport_type || 'Sports Club'}</p>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>
      </motion.div>

      {/* Admin Menu Items */}
      {filteredAdminItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 px-1">
            Management
          </h3>
          <GlassCard>
            <GlassCardContent className="p-0 divide-y divide-gray-100">
              {filteredAdminItems.map((item, index) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </Link>
              ))}
            </GlassCardContent>
          </GlassCard>
        </motion.div>
      )}

      {/* General Menu Items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 px-1">
          General
        </h3>
        <GlassCard>
          <GlassCardContent className="p-0 divide-y divide-gray-100">
            {generalMenuItems.map((item) => (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            ))}
          </GlassCardContent>
        </GlassCard>
      </motion.div>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <GlassCard>
          <GlassCardContent className="p-0">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 p-4 hover:bg-red-50 transition-colors text-red-600"
            >
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Sign Out</p>
                <p className="text-sm text-red-400">Log out of your account</p>
              </div>
            </button>
          </GlassCardContent>
        </GlassCard>
      </motion.div>

      {/* Version */}
      <p className="text-center text-xs text-gray-400 mt-8">
        ClubRovia v1.0.0
      </p>
    </div>
  );
}