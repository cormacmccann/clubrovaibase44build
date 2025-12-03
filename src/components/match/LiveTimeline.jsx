import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import {
  Goal, Target, Clock, Play, Pause, Square, AlertTriangle
} from 'lucide-react';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';

const EVENT_ICONS = {
  goal: { icon: Goal, color: 'bg-green-500 text-white' },
  point: { icon: Target, color: 'bg-blue-500 text-white' },
  kick_off: { icon: Play, color: 'bg-green-500 text-white' },
  half_time: { icon: Pause, color: 'bg-amber-500 text-white' },
  second_half: { icon: Play, color: 'bg-green-500 text-white' },
  full_time: { icon: Square, color: 'bg-gray-700 text-white' },
  yellow_card: { icon: AlertTriangle, color: 'bg-yellow-400 text-black' },
  red_card: { icon: AlertTriangle, color: 'bg-red-500 text-white' }
};

export default function LiveTimeline({ timeline }) {
  const reversedTimeline = [...timeline].reverse();

  return (
    <GlassCard>
      <GlassCardHeader>
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-500" />
          Match Commentary
        </h3>
      </GlassCardHeader>
      <GlassCardContent className="p-0">
        {timeline.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Match updates will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            <AnimatePresence>
              {reversedTimeline.map((event, index) => {
                const config = EVENT_ICONS[event.type] || EVENT_ICONS.goal;
                const Icon = config.icon;

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-full ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{event.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {event.timestamp && format(parseISO(event.timestamp), 'h:mm a')}
                        </p>
                      </div>
                      {event.minute !== undefined && (
                        <span className="text-sm font-mono text-gray-400">
                          {event.minute}'
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}