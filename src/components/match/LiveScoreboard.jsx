import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard';

export default function LiveScoreboard({ match, elapsedTime, isGAA }) {
  const getStatusBadge = () => {
    switch (match.status) {
      case 'not_started':
        return <Badge variant="outline">Not Started</Badge>;
      case 'first_half':
        return <Badge className="bg-green-500 animate-pulse">LIVE - 1st Half</Badge>;
      case 'half_time':
        return <Badge className="bg-amber-500">Half Time</Badge>;
      case 'second_half':
        return <Badge className="bg-green-500 animate-pulse">LIVE - 2nd Half</Badge>;
      case 'full_time':
        return <Badge className="bg-gray-700">Full Time</Badge>;
      default:
        return null;
    }
  };

  const formatScore = (goals, points) => {
    if (isGAA) {
      return `${goals}-${points || 0}`;
    }
    return goals;
  };

  return (
    <GlassCard className="mb-6 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
        {/* Status & Timer */}
        <div className="flex items-center justify-center gap-4 mb-4">
          {getStatusBadge()}
          {(match.status === 'first_half' || match.status === 'second_half') && (
            <div className="flex items-center gap-2 text-white/90">
              <Clock className="w-4 h-4" />
              <span className="font-mono text-lg">{elapsedTime}'</span>
            </div>
          )}
        </div>

        {/* Scoreboard */}
        <div className="flex items-center justify-center gap-8">
          {/* Home Team */}
          <div className="text-center flex-1">
            <p className="text-lg font-semibold mb-2 truncate">{match.team_name}</p>
            <motion.div
              key={`home-${match.home_score}-${match.home_points}`}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-5xl font-bold"
            >
              {formatScore(match.home_score, match.home_points)}
            </motion.div>
            {match.is_home && (
              <Badge variant="secondary" className="mt-2 bg-white/20 text-white">HOME</Badge>
            )}
          </div>

          {/* VS */}
          <div className="text-2xl font-light opacity-50">vs</div>

          {/* Away Team */}
          <div className="text-center flex-1">
            <p className="text-lg font-semibold mb-2 truncate">{match.opponent_name}</p>
            <motion.div
              key={`away-${match.away_score}-${match.away_points}`}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-5xl font-bold"
            >
              {formatScore(match.away_score, match.away_points)}
            </motion.div>
            {!match.is_home && (
              <Badge variant="secondary" className="mt-2 bg-white/20 text-white">HOME</Badge>
            )}
          </div>
        </div>

        {/* Match Info */}
        <div className="flex items-center justify-center gap-6 mt-6 text-sm text-white/70">
          {match.competition && (
            <span className="flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              {match.competition}
            </span>
          )}
          {match.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {match.venue}
            </span>
          )}
        </div>
      </div>
    </GlassCard>
  );
}