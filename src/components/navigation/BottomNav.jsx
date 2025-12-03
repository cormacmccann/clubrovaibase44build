import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  MessageCircle,
  CreditCard,
  MoreHorizontal
} from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Home', page: 'Dashboard' },
  { icon: Calendar, label: 'Schedule', page: 'Schedule' },
  { icon: MessageCircle, label: 'Chat', page: 'Chat' },
  { icon: CreditCard, label: 'Payments', page: 'Payments' },
  { icon: MoreHorizontal, label: 'More', page: 'More' },
];

export default function BottomNav({ currentPage }) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200/50 z-40 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = currentPage === item.page;
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors min-w-[60px]",
                isActive ? "text-blue-600" : "text-gray-500"
              )}
            >
              <div className="relative">
                <item.icon className="w-6 h-6" />
                {isActive && (
                  <motion.div
                    layoutId="activeBottomNav"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500"
                  />
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}