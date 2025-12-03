import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import {
  Trophy, Calendar, MapPin, Users, Play, CheckCircle,
  Clock, ArrowRight, RefreshCw, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function TournamentLive() {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scores, setScores] = useState({ home: 0, away: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTournament();
    // Poll for updates every 30 seconds
    const interval = setInterval(loadTournament, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadTournament = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get('id');
      
      if (id) {
        const tournaments = await base44.entities.Tournament.filter({ id });
        if (tournaments.length > 0) {
          setTournament(tournaments[0]);
        }
      }
    } catch (error) {
      console.error('Error loading tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  const openScoreModal = (fixture) => {
    setSelectedFixture(fixture);
    setScores({
      home: fixture.home_score || 0,
      away: fixture.away_score || 0
    });
    setShowScoreModal(true);
  };

  const updateScore = async () => {
    if (!tournament || !selectedFixture) return;
    
    setSaving(true);
    try {
      const updatedFixtures = tournament.fixtures.map(f => {
        if (f.id === selectedFixture.id) {
          return {
            ...f,
            home_score: scores.home,
            away_score: scores.away,
            status: 'completed'
          };
        }
        return f;
      });

      // Update standings based on results
      const updatedStandings = calculateStandings(tournament.teams || [], updatedFixtures);

      await base44.entities.Tournament.update(tournament.id, {
        fixtures: updatedFixtures,
        standings: updatedStandings
      });

      await loadTournament();
      setShowScoreModal(false);
    } catch (error) {
      console.error('Error updating score:', error);
    } finally {
      setSaving(false);
    }
  };

  const calculateStandings = (teams, fixtures) => {
    const standings = {};
    
    // Initialize standings for all teams
    teams.forEach(team => {
      standings[team.id] = {
        team_id: team.id,
        team_name: team.name,
        group: team.group,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goals_for: 0,
        goals_against: 0,
        goal_difference: 0,
        points: 0
      };
    });

    // Calculate from completed fixtures
    fixtures
      .filter(f => f.status === 'completed' && f.round === 'Group Stage')
      .forEach(fixture => {
        const homeId = fixture.home_team_id;
        const awayId = fixture.away_team_id;
        
        if (!homeId || !awayId || !standings[homeId] || !standings[awayId]) return;
        
        const homeScore = fixture.home_score || 0;
        const awayScore = fixture.away_score || 0;

        // Update home team
        standings[homeId].played++;
        standings[homeId].goals_for += homeScore;
        standings[homeId].goals_against += awayScore;
        
        // Update away team
        standings[awayId].played++;
        standings[awayId].goals_for += awayScore;
        standings[awayId].goals_against += homeScore;

        if (homeScore > awayScore) {
          standings[homeId].won++;
          standings[homeId].points += 3;
          standings[awayId].lost++;
        } else if (awayScore > homeScore) {
          standings[awayId].won++;
          standings[awayId].points += 3;
          standings[homeId].lost++;
        } else {
          standings[homeId].drawn++;
          standings[awayId].drawn++;
          standings[homeId].points += 1;
          standings[awayId].points += 1;
        }

        standings[homeId].goal_difference = standings[homeId].goals_for - standings[homeId].goals_against;
        standings[awayId].goal_difference = standings[awayId].goals_for - standings[awayId].goals_against;
      });

    return Object.values(standings).sort((a, b) => {
      if (a.group !== b.group) return (a.group || '').localeCompare(b.group || '');
      if (b.points !== a.points) return b.points - a.points;
      if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
      return b.goals_for - a.goals_for;
    });
  };

  const groupFixturesByRound = () => {
    if (!tournament?.fixtures) return {};
    return tournament.fixtures.reduce((acc, fixture) => {
      const round = fixture.round || 'TBD';
      if (!acc[round]) acc[round] = [];
      acc[round].push(fixture);
      return acc;
    }, {});
  };

  const groupStandingsByGroup = () => {
    if (!tournament?.standings) return {};
    return tournament.standings.reduce((acc, standing) => {
      const group = standing.group || 'All';
      if (!acc[group]) acc[group] = [];
      acc[group].push(standing);
      return acc;
    }, {});
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard>
          <GlassCardContent className="p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Tournament Not Found</h2>
            <p className="text-gray-500">The tournament you're looking for doesn't exist.</p>
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }

  const fixturesByRound = groupFixturesByRound();
  const standingsByGroup = groupStandingsByGroup();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Tournament Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <GlassCard>
            <GlassCardContent className="p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                {tournament.logo_url ? (
                  <img src={tournament.logo_url} alt="" className="w-20 h-20 rounded-2xl object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                    <Trophy className="w-10 h-10 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{tournament.name}</h1>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(parseISO(tournament.start_date), 'MMM d, yyyy')}
                    </span>
                    {tournament.venue && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {tournament.venue}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {tournament.teams?.length || 0} teams
                    </span>
                  </div>
                  {tournament.description && (
                    <p className="text-gray-500 mt-3">{tournament.description}</p>
                  )}
                </div>
                <Badge 
                  className={`text-sm py-1 px-3 ${
                    tournament.status === 'in_progress' 
                      ? 'bg-green-100 text-green-700' 
                      : tournament.status === 'completed'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {tournament.status === 'in_progress' && <Play className="w-3 h-3 mr-1" />}
                  {tournament.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                  {tournament.status?.replace('_', ' ').toUpperCase() || 'UPCOMING'}
                </Badge>
              </div>
            </GlassCardContent>
          </GlassCard>
        </motion.div>

        {/* Main Content */}
        <Tabs defaultValue="fixtures" className="w-full">
          <TabsList className="mb-6 bg-white/50 backdrop-blur-sm">
            <TabsTrigger value="fixtures">Fixtures & Results</TabsTrigger>
            <TabsTrigger value="standings">Standings</TabsTrigger>
            <TabsTrigger value="bracket">Bracket</TabsTrigger>
          </TabsList>

          {/* Fixtures Tab */}
          <TabsContent value="fixtures">
            <div className="space-y-6">
              {Object.entries(fixturesByRound).map(([round, fixtures]) => (
                <GlassCard key={round}>
                  <GlassCardHeader>
                    <h3 className="text-lg font-semibold text-gray-900">{round}</h3>
                  </GlassCardHeader>
                  <GlassCardContent className="p-0">
                    <div className="divide-y divide-gray-100">
                      {fixtures.map((fixture, index) => (
                        <motion.div
                          key={fixture.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => openScoreModal(fixture)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex-1 text-right">
                              <span className="font-medium text-gray-900">
                                {fixture.home_team_name || 'TBD'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 px-4">
                              {fixture.status === 'completed' ? (
                                <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1">
                                  <span className="text-xl font-bold text-gray-900">{fixture.home_score || 0}</span>
                                  <span className="text-gray-400">-</span>
                                  <span className="text-xl font-bold text-gray-900">{fixture.away_score || 0}</span>
                                </div>
                              ) : fixture.status === 'live' ? (
                                <Badge className="bg-red-100 text-red-700 animate-pulse">
                                  <Play className="w-3 h-3 mr-1" />
                                  LIVE
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {fixture.scheduled_time 
                                    ? format(parseISO(fixture.scheduled_time), 'h:mm a')
                                    : 'TBD'
                                  }
                                </Badge>
                              )}
                            </div>
                            <div className="flex-1">
                              <span className="font-medium text-gray-900">
                                {fixture.away_team_name || 'TBD'}
                              </span>
                            </div>
                          </div>
                          {fixture.venue && (
                            <p className="text-xs text-gray-500 text-center mt-2">
                              <MapPin className="w-3 h-3 inline mr-1" />
                              {fixture.venue} {fixture.pitch && `• ${fixture.pitch}`}
                            </p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </GlassCardContent>
                </GlassCard>
              ))}

              {Object.keys(fixturesByRound).length === 0 && (
                <GlassCard>
                  <GlassCardContent className="p-12 text-center">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No fixtures generated yet</p>
                  </GlassCardContent>
                </GlassCard>
              )}
            </div>
          </TabsContent>

          {/* Standings Tab */}
          <TabsContent value="standings">
            <div className="space-y-6">
              {Object.entries(standingsByGroup).map(([group, standings]) => (
                <GlassCard key={group}>
                  <GlassCardHeader>
                    <h3 className="text-lg font-semibold text-gray-900">{group}</h3>
                  </GlassCardHeader>
                  <GlassCardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead className="text-center">P</TableHead>
                            <TableHead className="text-center">W</TableHead>
                            <TableHead className="text-center">D</TableHead>
                            <TableHead className="text-center">L</TableHead>
                            <TableHead className="text-center">GF</TableHead>
                            <TableHead className="text-center">GA</TableHead>
                            <TableHead className="text-center">GD</TableHead>
                            <TableHead className="text-center font-bold">Pts</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {standings.map((standing, index) => (
                            <TableRow key={standing.team_id} className={index < 2 ? 'bg-green-50' : ''}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell className="font-medium">{standing.team_name}</TableCell>
                              <TableCell className="text-center">{standing.played}</TableCell>
                              <TableCell className="text-center text-green-600">{standing.won}</TableCell>
                              <TableCell className="text-center">{standing.drawn}</TableCell>
                              <TableCell className="text-center text-red-600">{standing.lost}</TableCell>
                              <TableCell className="text-center">{standing.goals_for}</TableCell>
                              <TableCell className="text-center">{standing.goals_against}</TableCell>
                              <TableCell className="text-center">{standing.goal_difference > 0 ? `+${standing.goal_difference}` : standing.goal_difference}</TableCell>
                              <TableCell className="text-center font-bold">{standing.points}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </GlassCardContent>
                </GlassCard>
              ))}

              {Object.keys(standingsByGroup).length === 0 && (
                <GlassCard>
                  <GlassCardContent className="p-12 text-center">
                    <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No standings available yet</p>
                  </GlassCardContent>
                </GlassCard>
              )}
            </div>
          </TabsContent>

          {/* Bracket Tab */}
          <TabsContent value="bracket">
            <GlassCard>
              <GlassCardContent className="p-8">
                <div className="flex flex-col items-center gap-8">
                  {/* Knockout Fixtures */}
                  {tournament.fixtures
                    ?.filter(f => f.round !== 'Group Stage')
                    .map((fixture) => (
                      <div 
                        key={fixture.id}
                        className="bg-white rounded-xl shadow-lg p-4 w-full max-w-md cursor-pointer hover:shadow-xl transition-shadow"
                        onClick={() => openScoreModal(fixture)}
                      >
                        <Badge className="mb-2">{fixture.round}</Badge>
                        <div className="flex items-center justify-between">
                          <div className="text-center flex-1">
                            <p className="font-semibold text-gray-900">{fixture.home_team_name}</p>
                          </div>
                          <div className="px-4">
                            {fixture.status === 'completed' ? (
                              <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold">{fixture.home_score}</span>
                                <span className="text-gray-400">-</span>
                                <span className="text-2xl font-bold">{fixture.away_score}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">vs</span>
                            )}
                          </div>
                          <div className="text-center flex-1">
                            <p className="font-semibold text-gray-900">{fixture.away_team_name}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  
                  {!tournament.fixtures?.some(f => f.round !== 'Group Stage') && (
                    <p className="text-gray-500">Knockout fixtures will appear after group stage</p>
                  )}
                </div>
              </GlassCardContent>
            </GlassCard>
          </TabsContent>
        </Tabs>

        {/* Auto-refresh indicator */}
        <div className="mt-6 text-center">
          <Badge variant="outline" className="text-gray-500">
            <RefreshCw className="w-3 h-3 mr-1" />
            Auto-refreshes every 30 seconds
          </Badge>
        </div>
      </div>

      {/* Score Update Modal */}
      <Dialog open={showScoreModal} onOpenChange={setShowScoreModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Score</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 text-center">
                <p className="font-medium text-gray-700 mb-2">{selectedFixture?.home_team_name}</p>
                <Input
                  type="number"
                  min="0"
                  value={scores.home}
                  onChange={(e) => setScores({...scores, home: parseInt(e.target.value) || 0})}
                  className="text-center text-2xl font-bold"
                />
              </div>
              <span className="text-2xl text-gray-400">-</span>
              <div className="flex-1 text-center">
                <p className="font-medium text-gray-700 mb-2">{selectedFixture?.away_team_name}</p>
                <Input
                  type="number"
                  min="0"
                  value={scores.away}
                  onChange={(e) => setScores({...scores, away: parseInt(e.target.value) || 0})}
                  className="text-center text-2xl font-bold"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScoreModal(false)}>Cancel</Button>
            <Button 
              onClick={updateScore}
              disabled={saving}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}