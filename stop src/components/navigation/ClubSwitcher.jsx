import React from 'react';
import { useClub } from '@/components/ClubContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Settings, Crown, Building2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function ClubSwitcher({ collapsed = false }) {
  const { clubs, currentClub, switchClub, isSiteAdmin } = useClub();

  const getInitials = (name) => {
    return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'CL';
  };

  const getClubColor = (index) => {
    const colors = [
      'from-blue-500 to-indigo-600',
      'from-emerald-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-purple-500 to-pink-600',
      'from-cyan-500 to-blue-600',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="flex flex-col items-center py-4 space-y-3">
      <TooltipProvider delayDuration={0}>
        {/* Site Admin Badge */}
        {isSiteAdmin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg cursor-pointer mb-2"
              >
                <Crown className="w-6 h-6 text-white" />
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              Site Admin Console
            </TooltipContent>
          </Tooltip>
        )}

        {/* Divider */}
        {isSiteAdmin && <div className="w-8 h-px bg-gray-200" />}

        {/* Club List */}
        <AnimatePresence>
          {clubs.map((club, index) => (
            <Tooltip key={club.id}>
              <TooltipTrigger asChild>
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => switchClub(club.id)}
                  className={cn(
                    "relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200",
                    "hover:rounded-xl",
                    currentClub?.id === club.id 
                      ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-100" 
                      : "hover:ring-2 hover:ring-gray-300 hover:ring-offset-2"
                  )}
                >
                  {club.logo_url ? (
                    <img 
                      src={club.logo_url} 
                      alt={club.name}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    <div className={cn(
                      "w-full h-full rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shadow-lg",
                      getClubColor(index)
                    )}>
                      {getInitials(club.name)}
                    </div>
                  )}
                  
                  {/* Active Indicator */}
                  {currentClub?.id === club.id && (
                    <motion.div
                      layoutId="activeClub"
                      className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-full"
                    />
                  )}
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {club.name}
              </TooltipContent>
            </Tooltip>
          ))}
        </AnimatePresence>

        {/* Divider */}
        <div className="w-8 h-px bg-gray-200" />

        {/* Add Club Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-12 h-12 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            Create or Join Club
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}