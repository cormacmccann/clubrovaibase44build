import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import { differenceInMinutes } from 'date-fns';
import {
  Users, Clock, RefreshCw, Trophy, MapPin, Loader2, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LiveScoreboard from '@/components/match/LiveScoreboard';
import LiveTimeline from '@/components/match/LiveTimeline';

export default function MatchCenter() {
  const [match, setMatch] = useState(null);
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);
  const pollRef = useRef(null);

  const isGAA = match?.sport_type === 'hurling' || match?.sport_type === 'gaelic_football';

  useEffect(() => {
    loadMatch();
    // Poll for updates every 10 seconds
    pollRef.current = setInterval(loadMatch, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (match?.status === 'first_half' || match?.status === 'second_half') {
      startTimer();
    } else {
      stopTimer();
    }
  }, [match?.status]);

  const startTimer = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      if (!match) return;
      
      let baseTime = 0;
      let startFrom = match.started_at;
      
      if (match.status === 'second_half') {
        baseTime = 45;
        startFrom = match.second_half_at;
      }
      
      if (startFrom) {
        const elapsed = differenceInMinutes(new Date(), new Date(startFrom));
        setElapsedTime(baseTime + elapsed);
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const loadMatch = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const matchId = urlParams.get('id');

      if (matchId) {
        const matches = await base44.entities.MatchLive.filter({ id: matchId });
        if (matches.length > 0) {
          setMatch(matches[0]);
          
          // Load club info
          if (!club) {
            const clubs = await base44.entities.Club.filter({ id: matches[0].club_id });
            if (clubs.length > 0) setClub(clubs[0]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading match:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard>
          <GlassCardContent className="p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900">Match not found</h2>
            <p className="text-gray-500">This match link may have expired.</p>
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50">
      <div className="max-w-3xl mx-auto p-4 lg:p-8">
        {/* Club Header */}
        {club && (
          <div className="flex items-center justify-center gap-3 mb-6">
            {club.logo_url ? (
              <img src={club.logo_url} alt="" className="w-10 h-10 rounded-xl" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                {club.name?.[0]}
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-900">{club.name}</h1>
          </div>
        )}

        {/* Live Scoreboard */}
        <LiveScoreboard 
          match={match} 
          elapsedTime={elapsedTime}
          isGAA={isGAA}
        />

        {/* Auto-refresh indicator */}
        <div className="flex items-center justify-center gap-2 mb-6 text-sm text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>Auto-updating every 10 seconds</span>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="commentary" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="commentary" className="flex-1">Commentary</TabsTrigger>
            <TabsTrigger value="lineup" className="flex-1">Lineup</TabsTrigger>
          </TabsList>

          <TabsContent value="commentary">
            <LiveTimeline timeline={match.timeline || []} />
          </TabsContent>

          <TabsContent value="lineup">
            <GlassCard>
              <GlassCardHeader>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-500" />
                  {match.team_name} Lineup
                </h3>
              </GlassCardHeader>
              <GlassCardContent>
                {match.lineup?.length > 0 ? (
                  <div className="space-y-3">
                    {/* Starters */}
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">Starting XI</p>
                      <div className="grid grid-cols-2 gap-2">
                        {match.lineup.filter(p => p.is_starter).map((player, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                {player.jersey_number || idx + 1}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{player.name}</p>
                              {player.position && (
                                <p className="text-xs text-gray-500">{player.position}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Subs */}
                    {match.lineup.filter(p => !p.is_starter).length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Substitutes</p>
                        <div className="flex flex-wrap gap-2">
                          {match.lineup.filter(p => !p.is_starter).map((player, idx) => (
                            <Badge key={idx} variant="secondary">
                              #{player.jersey_number || '-'} {player.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Lineup not yet announced</p>
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}