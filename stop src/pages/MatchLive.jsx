import React, { useState, useEffect, useRef } from 'react';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns';
import {
  Play, Pause, Clock, Users, Bell, BellOff, Share2, Goal,
  CircleDot, AlertTriangle, RefreshCw, ChevronRight, Loader2,
  Square, Trophy, Zap, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MatchCard from '@/components/match/MatchCard';
import LiveTimeline from '@/components/match/LiveTimeline';
import LiveScoreboard from '@/components/match/LiveScoreboard';

export default function MatchLive() {
  const { currentClub, isClubAdmin, isCoach } = useClub();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifyFans, setNotifyFans] = useState(false);
  const [showScorerModal, setShowScorerModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [scorerName, setScorerName] = useState('');
  const [showMatchCard, setShowMatchCard] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);

  const isGAA = match?.sport_type === 'hurling' || match?.sport_type === 'gaelic_football';
  const canControl = isClubAdmin || isCoach;

  useEffect(() => {
    loadMatch();
  }, []);

  useEffect(() => {
    if (match?.status === 'first_half' || match?.status === 'second_half') {
      startTimer();
    } else {
      stopTimer();
    }
    return () => stopTimer();
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
      const eventId = urlParams.get('event');

      if (matchId) {
        const matches = await base44.entities.MatchLive.filter({ id: matchId });
        if (matches.length > 0) {
          setMatch(matches[0]);
          setNotifyFans(matches[0].notify_fans || false);
          await loadTeamMembers(matches[0].team_id);
        }
      } else if (eventId) {
        // Create new match from event
        const events = await base44.entities.Event.filter({ id: eventId });
        if (events.length > 0) {
          const event = events[0];
          const newMatch = await base44.entities.MatchLive.create({
            club_id: currentClub.id,
            event_id: eventId,
            team_id: event.team_id,
            team_name: event.team_name || currentClub.name,
            opponent_name: event.opponent || 'Opponent',
            is_home: event.is_home ?? true,
            sport_type: currentClub.sport_type || 'football',
            home_score: 0,
            away_score: 0,
            home_points: 0,
            away_points: 0,
            status: 'not_started',
            kick_off_time: event.start_datetime,
            venue: event.venue,
            competition: event.competition,
            timeline: [],
            lineup: [],
            notify_fans: false,
            is_public: true
          });
          setMatch(newMatch);
          await loadTeamMembers(event.team_id);
        }
      }
    } catch (error) {
      console.error('Error loading match:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async (teamId) => {
    if (!teamId) return;
    try {
      const members = await base44.entities.Member.filter({
        club_id: currentClub.id,
        teams: teamId
      });
      setTeamMembers(members);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const updateMatch = async (updates) => {
    try {
      await base44.entities.MatchLive.update(match.id, updates);
      setMatch({ ...match, ...updates });
    } catch (error) {
      console.error('Error updating match:', error);
    }
  };

  const addTimelineEvent = async (type, team, playerName = '') => {
    const timeline = [...(match.timeline || [])];
    const minute = elapsedTime || 0;
    
    let description = '';
    switch (type) {
      case 'goal':
        description = playerName 
          ? `${minute}' - GOAL! ${playerName} scores for ${team === 'home' ? match.team_name : match.opponent_name}`
          : `${minute}' - GOAL! ${team === 'home' ? match.team_name : match.opponent_name}`;
        break;
      case 'point':
        description = `${minute}' - POINT! ${team === 'home' ? match.team_name : match.opponent_name}`;
        break;
      case 'kick_off':
        description = "The match has kicked off!";
        break;
      case 'half_time':
        description = `Half Time: ${match.team_name} ${match.home_score} - ${match.away_score} ${match.opponent_name}`;
        break;
      case 'second_half':
        description = "Second half underway!";
        break;
      case 'full_time':
        description = `Full Time: ${match.team_name} ${match.home_score} - ${match.away_score} ${match.opponent_name}`;
        break;
      default:
        description = `${minute}' - ${type}`;
    }

    timeline.push({
      id: Date.now().toString(),
      minute,
      type,
      team,
      player_name: playerName,
      description,
      timestamp: new Date().toISOString()
    });

    await updateMatch({ timeline });

    // Send notification if enabled
    if (notifyFans && ['goal', 'point', 'half_time', 'full_time'].includes(type)) {
      await sendNotification(description);
    }
  };

  const sendNotification = async (message) => {
    try {
      await base44.integrations.Core.SendEmail({
        to: 'fans@club.com', // In real app, this would be a list of subscribers
        subject: `${match.team_name} Match Update`,
        body: message
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const handleKickOff = async () => {
    await updateMatch({
      status: 'first_half',
      started_at: new Date().toISOString()
    });
    await addTimelineEvent('kick_off', 'home');
    setElapsedTime(0);
  };

  const handleHalfTime = async () => {
    await updateMatch({
      status: 'half_time',
      half_time_at: new Date().toISOString()
    });
    await addTimelineEvent('half_time', 'home');
  };

  const handleSecondHalf = async () => {
    await updateMatch({
      status: 'second_half',
      second_half_at: new Date().toISOString()
    });
    await addTimelineEvent('second_half', 'home');
    setElapsedTime(45);
  };

  const handleFullTime = async () => {
    await updateMatch({
      status: 'full_time',
      ended_at: new Date().toISOString()
    });
    await addTimelineEvent('full_time', 'home');
    setShowMatchCard(true);
  };

  const handleGoal = (team) => {
    setPendingAction({ type: 'goal', team });
    setShowScorerModal(true);
  };

  const handlePoint = async (team) => {
    const updates = team === 'home' 
      ? { home_points: (match.home_points || 0) + 1 }
      : { away_points: (match.away_points || 0) + 1 };
    await updateMatch(updates);
    await addTimelineEvent('point', team);
  };

  const confirmGoal = async () => {
    const { type, team } = pendingAction;
    const updates = team === 'home' 
      ? { home_score: match.home_score + 1 }
      : { away_score: match.away_score + 1 };
    await updateMatch(updates);
    await addTimelineEvent(type, team, scorerName);
    setShowScorerModal(false);
    setScorerName('');
    setPendingAction(null);
  };

  const toggleNotifications = async () => {
    const newValue = !notifyFans;
    setNotifyFans(newValue);
    await updateMatch({ notify_fans: newValue });
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
      <div className="p-8 text-center">
        <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Match not found</h2>
        <p className="text-gray-500">The requested match could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Live Scoreboard */}
      <LiveScoreboard 
        match={match} 
        elapsedTime={elapsedTime}
        isGAA={isGAA}
      />

      {/* Control Panel - Coaches/Admins Only */}
      {canControl && (
        <GlassCard className="mb-6">
          <GlassCardContent className="p-6">
            {/* Notification Toggle */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <div className="flex items-center gap-3">
                {notifyFans ? (
                  <Bell className="w-5 h-5 text-green-600" />
                ) : (
                  <BellOff className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <p className="font-medium text-gray-900">Notify Fans</p>
                  <p className="text-sm text-gray-500">Push updates to all club members</p>
                </div>
              </div>
              <Switch checked={notifyFans} onCheckedChange={toggleNotifications} />
            </div>

            {/* Match Controls */}
            {match.status === 'not_started' && (
              <div className="text-center">
                <Button 
                  size="lg" 
                  onClick={handleKickOff}
                  className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6"
                >
                  <Play className="w-6 h-6 mr-2" />
                  Kick Off
                </Button>
              </div>
            )}

            {(match.status === 'first_half' || match.status === 'second_half') && (
              <div className="space-y-6">
                {/* Score Buttons */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Home Team */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-center text-gray-900">{match.team_name}</h3>
                    <Button 
                      size="lg" 
                      onClick={() => handleGoal('home')}
                      className="w-full h-16 text-lg bg-blue-600 hover:bg-blue-700"
                    >
                      <Goal className="w-6 h-6 mr-2" />
                      GOAL
                    </Button>
                    {isGAA && (
                      <Button 
                        size="lg" 
                        variant="outline"
                        onClick={() => handlePoint('home')}
                        className="w-full h-12"
                      >
                        <Target className="w-5 h-5 mr-2" />
                        Point
                      </Button>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-center text-gray-900">{match.opponent_name}</h3>
                    <Button 
                      size="lg" 
                      onClick={() => handleGoal('away')}
                      className="w-full h-16 text-lg bg-red-600 hover:bg-red-700"
                    >
                      <Goal className="w-6 h-6 mr-2" />
                      GOAL
                    </Button>
                    {isGAA && (
                      <Button 
                        size="lg" 
                        variant="outline"
                        onClick={() => handlePoint('away')}
                        className="w-full h-12"
                      >
                        <Target className="w-5 h-5 mr-2" />
                        Point
                      </Button>
                    )}
                  </div>
                </div>

                {/* Period Controls */}
                <div className="flex justify-center gap-4 pt-4 border-t">
                  {match.status === 'first_half' && (
                    <Button onClick={handleHalfTime} variant="outline" size="lg">
                      <Pause className="w-5 h-5 mr-2" />
                      Half Time
                    </Button>
                  )}
                  {match.status === 'second_half' && (
                    <Button onClick={handleFullTime} className="bg-gray-800 hover:bg-gray-900" size="lg">
                      <Square className="w-5 h-5 mr-2" />
                      Full Time
                    </Button>
                  )}
                </div>
              </div>
            )}

            {match.status === 'half_time' && (
              <div className="text-center">
                <p className="text-gray-500 mb-4">Half Time Break</p>
                <Button 
                  size="lg" 
                  onClick={handleSecondHalf}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Second Half
                </Button>
              </div>
            )}

            {match.status === 'full_time' && (
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 mb-4">Match Complete!</p>
                <Button onClick={() => setShowMatchCard(true)} className="bg-gradient-to-r from-blue-500 to-indigo-600">
                  <Share2 className="w-5 h-5 mr-2" />
                  Generate & Share Match Card
                </Button>
              </div>
            )}
          </GlassCardContent>
        </GlassCard>
      )}

      {/* Timeline Feed */}
      <LiveTimeline timeline={match.timeline || []} />

      {/* Scorer Modal */}
      <Dialog open={showScorerModal} onOpenChange={setShowScorerModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Who Scored?</DialogTitle>
            <DialogDescription>
              Enter the scorer's name for the timeline
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Scorer Name</Label>
              <Input
                value={scorerName}
                onChange={(e) => setScorerName(e.target.value)}
                placeholder="e.g., Sarah O'Brien"
              />
            </div>
            {teamMembers.length > 0 && pendingAction?.team === 'home' && (
              <div>
                <Label>Or select from roster:</Label>
                <Select onValueChange={setScorerName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select player" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map(m => (
                      <SelectItem key={m.id} value={`${m.first_name} ${m.last_name}`}>
                        {m.jersey_number && `#${m.jersey_number} `}{m.first_name} {m.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScorerModal(false)}>Skip</Button>
            <Button onClick={confirmGoal}>Confirm Goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Match Card Modal */}
      <Dialog open={showMatchCard} onOpenChange={setShowMatchCard}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Match Card</DialogTitle>
            <DialogDescription>Share this result on social media</DialogDescription>
          </DialogHeader>
          <MatchCard match={match} club={currentClub} />
        </DialogContent>
      </Dialog>
    </div>
  );
}