import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useClub } from '@/components/ClubContext';
import ClubSwitcher from './ClubSwitcher';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  MessageCircle,
  CreditCard,
  Users,
  Shield,
  Package,
  Trophy,
  Megaphone,
  Newspaper,
  Settings,
  ChevronRight,
  Building2,
  UserCircle,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { base44 } from '@/api/base44Client';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', page: 'Dashboard', permission: null },
  { icon: Calendar, label: 'Schedule', page: 'Schedule', permission: null },
  { icon: MessageCircle, label: 'Chat', page: 'Chat', permission: 'send_messages' },
  { icon: CreditCard, label: 'Payments', page: 'Payments', permission: null },
  { icon: Users, label: 'Members', page: 'Members', permission: 'manage_members' },
  { icon: Shield, label: 'Teams', page: 'Teams', permission: 'manage_teams' },
  { icon: Shield, label: 'Team Management', page: 'TeamManagement', permission: 'manage_teams' },
  { icon: Package, label: 'Inventory', page: 'Inventory', permission: 'manage_inventory' },
  { icon: Trophy, label: 'Tournaments', page: 'Tournaments', permission: 'manage_tournaments' },
  { icon: Megaphone, label: 'Sponsors', page: 'Sponsors', permission: 'manage_sponsors' },
  { icon: Newspaper, label: 'News', page: 'News', permission: 'manage_members' },
];

export default function Sidebar({ currentPage }) {
  const { user, currentClub, currentMembership, hasPermission, isClubAdmin } = useClub();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const filteredMenuItems = menuItems.filter(item => 
    !item.permission || hasPermission(item.permission) || isClubAdmin
  );

  const SidebarContent = () => (
    <>
      {/* Club Switcher */}
      <div className="w-[72px] bg-gray-100/80 border-r border-gray-200/50 flex flex-col items-center">
        <ClubSwitcher />
      </div>

      {/* Main Navigation */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Club Header */}
        <div className="p-4 border-b border-gray-200/50">
          <div className="flex items-center gap-3">
            {currentClub?.logo_url ? (
              <img src={currentClub.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                {currentClub?.name?.[0] || 'C'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 truncate">{currentClub?.name || 'Select Club'}</h2>
              <p className="text-xs text-gray-500 capitalize">{currentMembership?.role?.replace('_', ' ') || 'Member'}</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-blue-50 text-blue-700" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "text-blue-600")} />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-gray-200/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 transition-colors">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={user?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm">
                    {user?.full_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link to={createPageUrl('Settings')} className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[320px] h-screen bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {currentClub?.logo_url ? (
            <img src={currentClub.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              {currentClub?.name?.[0] || 'C'}
            </div>
          )}
          <span className="font-semibold text-gray-900">{currentClub?.name || 'ClubRovia'}</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-[320px] bg-white z-50 flex shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}