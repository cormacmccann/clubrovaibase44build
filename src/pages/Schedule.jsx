import React, { useState, useEffect } from 'react';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, isToday } from 'date-fns';
import {
  Calendar, Plus, ChevronLeft, ChevronRight, Clock, MapPin,
  Users, Trophy, Filter, List, Grid3X3, Loader2, Sparkles, Check, X as XIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

export default function Schedule() {
  const { currentClub, currentMembership, isClubAdmin, isCoach, user } = useClub();
  const [events, setEvents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAIScheduler, setShowAIScheduler] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    event_type: 'training',
    team_id: '',
    start_datetime: '',
    end_datetime: '',
    venue: '',
    venue_address: '',
    description: '',
    opponent: '',
    competition: '',
    is_home: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentClub?.id) {
      loadData();
    }
  }, [currentClub?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsData, teamsData] = await Promise.all([
        base44.entities.Event.filter({ club_id: currentClub.id }),
        base44.entities.Team.filter({ club_id: currentClub.id, is_active: true })
      ]);
      setEvents(eventsData);
      setTeams(teamsData);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const filteredEvents = events.filter(event => {
    if (selectedTeam !== 'all' && event.team_id !== selectedTeam) return false;
    return true;
  });

  const getEventsForDay = (date) => {
    return filteredEvents.filter(event => 
      isSameDay(parseISO(event.start_datetime), date)
    ).sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
  };

  const handleSaveEvent = async () => {
    setSaving(true);
    try {
      const team = teams.find(t => t.id === formData.team_id);
      const eventData = {
        ...formData,
        club_id: currentClub.id,
        team_name: team?.name
      };

      if (selectedEvent) {
        await base44.entities.Event.update(selectedEvent.id, eventData);
      } else {
        await base44.entities.Event.create(eventData);
      }

      await loadData();
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving event:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      event_type: 'training',
      team_id: '',
      start_datetime: '',
      end_datetime: '',
      venue: '',
      venue_address: '',
      description: '',
      opponent: '',
      competition: '',
      is_home: true
    });
    setSelectedEvent(null);
  };

  const openEventModal = (event) => {
    if (event) {
      setSelectedEvent(event);
      setFormData({
        title: event.title || '',
        event_type: event.event_type || 'training',
        team_id: event.team_id || '',
        start_datetime: event.start_datetime?.slice(0, 16) || '',
        end_datetime: event.end_datetime?.slice(0, 16) || '',
        venue: event.venue || '',
        venue_address: event.venue_address || '',
        description: event.description || '',
        opponent: event.opponent || '',
        competition: event.competition || '',
        is_home: event.is_home ?? true
      });
    } else {
      resetForm();
    }
    setShowAddModal(true);
  };

  const getEventTypeConfig = (type) => {
    const configs = {
      match: { color: 'bg-blue-500', label: 'Match', icon: Trophy },
      training: { color: 'bg-green-500', label: 'Training', icon: Users },
      meeting: { color: 'bg-purple-500', label: 'Meeting', icon: Users },
      social: { color: 'bg-pink-500', label: 'Social', icon: Users },
      fundraiser: { color: 'bg-amber-500', label: 'Fundraiser', icon: Users },
      tournament: { color: 'bg-red-500', label: 'Tournament', icon: Trophy },
    };
    return configs[type] || { color: 'bg-gray-500', label: type, icon: Calendar };
  };

  const respondToEvent = async (event, status) => {
    const attendance = event.attendance || [];
    const existingIndex = attendance.findIndex(a => a.member_id === user.email);
    
    const newResponse = {
      member_id: user.email,
      name: user.full_name,
      status,
      responded_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      attendance[existingIndex] = newResponse;
    } else {
      attendance.push(newResponse);
    }

    await base44.entities.Event.update(event.id, { attendance });
    await loadData();
  };

  const getUserResponse = (event) => {
    return event.attendance?.find(a => a.member_id === user.email)?.status;
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-500 mt-1">Manage events, training, and matches</p>
        </div>
        <div className="flex gap-3">
          {isCoach && (
            <Button variant="outline" onClick={() => setShowAIScheduler(true)} className="gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Smart Schedule</span>
            </Button>
          )}
          {(isClubAdmin || isCoach) && (
            <Button 
              onClick={() => openEventModal(null)}
              className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </Button>
          )}
        </div>
      </div>

      {/* Filters & Navigation */}
      <GlassCard className="mb-6">
        <GlassCardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Today</Button>
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Tabs value={viewMode} onValueChange={setViewMode}>
                <TabsList>
                  <TabsTrigger value="week" className="gap-1">
                    <Grid3X3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Week</span>
                  </TabsTrigger>
                  <TabsTrigger value="list" className="gap-1">
                    <List className="w-4 h-4" />
                    <span className="hidden sm:inline">List</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Calendar View */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : viewMode === 'week' ? (
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day, index) => (
            <motion.div
              key={day.toISOString()}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="min-h-[200px]"
            >
              <GlassCard className={`h-full ${isToday(day) ? 'ring-2 ring-blue-500' : ''}`}>
                <div className={`p-3 border-b ${isToday(day) ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <div className="text-xs text-gray-500 font-medium">{format(day, 'EEE')}</div>
                  <div className={`text-lg font-bold ${isToday(day) ? 'text-blue-600' : 'text-gray-900'}`}>
                    {format(day, 'd')}
                  </div>
                </div>
                <div className="p-2 space-y-2 max-h-[300px] overflow-y-auto">
                  {getEventsForDay(day).map((event) => {
                    const config = getEventTypeConfig(event.event_type);
                    const userResponse = getUserResponse(event);
                    return (
                      <motion.div
                        key={event.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => openEventModal(event)}
                        className={`p-2 rounded-lg cursor-pointer transition-all ${config.color} bg-opacity-10 hover:bg-opacity-20 border-l-3`}
                        style={{ borderLeftColor: config.color.replace('bg-', '') }}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${config.color}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">{event.title}</p>
                            <p className="text-xs text-gray-500">
                              {format(parseISO(event.start_datetime), 'h:mm a')}
                            </p>
                            {event.team_name && (
                              <Badge variant="outline" className="mt-1 text-xs h-5">
                                {event.team_name}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {/* Quick RSVP buttons */}
                        <div className="flex gap-1 mt-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); respondToEvent(event, 'attending'); }}
                            className={`flex-1 p-1 rounded text-xs ${userResponse === 'attending' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-green-100'}`}
                          >
                            <Check className="w-3 h-3 mx-auto" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); respondToEvent(event, 'not_attending'); }}
                            className={`flex-1 p-1 rounded text-xs ${userResponse === 'not_attending' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-100'}`}
                          >
                            <XIcon className="w-3 h-3 mx-auto" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                  {getEventsForDay(day).length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">No events</p>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {weekDays.map((day) => {
            const dayEvents = getEventsForDay(day);
            if (dayEvents.length === 0) return null;
            
            return (
              <GlassCard key={day.toISOString()}>
                <GlassCardHeader className="py-3">
                  <h3 className={`font-semibold ${isToday(day) ? 'text-blue-600' : 'text-gray-900'}`}>
                    {format(day, 'EEEE, MMMM d')}
                    {isToday(day) && <Badge className="ml-2 bg-blue-500">Today</Badge>}
                  </h3>
                </GlassCardHeader>
                <GlassCardContent className="p-0 divide-y">
                  {dayEvents.map((event) => {
                    const config = getEventTypeConfig(event.event_type);
                    const attendingCount = event.attendance?.filter(a => a.status === 'attending').length || 0;
                    return (
                      <div 
                        key={event.id} 
                        className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => openEventModal(event)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl ${config.color} bg-opacity-20 flex items-center justify-center`}>
                            <config.icon className={`w-6 h-6 ${config.color.replace('bg-', 'text-')}`} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{event.title}</h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {format(parseISO(event.start_datetime), 'h:mm a')}
                                {event.end_datetime && ` - ${format(parseISO(event.end_datetime), 'h:mm a')}`}
                              </span>
                              {event.venue && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {event.venue}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                {attendingCount} attending
                              </span>
                            </div>
                          </div>
                          {event.team_name && (
                            <Badge variant="secondary">{event.team_name}</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </GlassCardContent>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Add/Edit Event Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEvent ? 'Edit Event' : 'Create Event'}</DialogTitle>
            <DialogDescription>
              {selectedEvent ? 'Update event details' : 'Schedule a new event for your club'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., Weekly Training Session"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event_type">Event Type</Label>
                <Select value={formData.event_type} onValueChange={(v) => setFormData({...formData, event_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="match">Match</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="fundraiser">Fundraiser</SelectItem>
                    <SelectItem value="tournament">Tournament</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="team_id">Team</Label>
                <Select value={formData.team_id} onValueChange={(v) => setFormData({...formData, team_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_datetime">Start Date & Time *</Label>
                <Input
                  id="start_datetime"
                  type="datetime-local"
                  value={formData.start_datetime}
                  onChange={(e) => setFormData({...formData, start_datetime: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="end_datetime">End Date & Time</Label>
                <Input
                  id="end_datetime"
                  type="datetime-local"
                  value={formData.end_datetime}
                  onChange={(e) => setFormData({...formData, end_datetime: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                value={formData.venue}
                onChange={(e) => setFormData({...formData, venue: e.target.value})}
                placeholder="Venue name"
              />
            </div>

            {formData.event_type === 'match' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="opponent">Opponent</Label>
                    <Input
                      id="opponent"
                      value={formData.opponent}
                      onChange={(e) => setFormData({...formData, opponent: e.target.value})}
                      placeholder="Opposition team"
                    />
                  </div>
                  <div>
                    <Label htmlFor="competition">Competition</Label>
                    <Input
                      id="competition"
                      value={formData.competition}
                      onChange={(e) => setFormData({...formData, competition: e.target.value})}
                      placeholder="League, Cup, etc."
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="is_home"
                    checked={formData.is_home}
                    onCheckedChange={(v) => setFormData({...formData, is_home: v})}
                  />
                  <Label htmlFor="is_home">Home Game</Label>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Additional details..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveEvent} 
              disabled={saving || !formData.title || !formData.start_datetime}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedEvent ? 'Update Event' : 'Create Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Scheduler Modal */}
      <Dialog open={showAIScheduler} onOpenChange={setShowAIScheduler}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Smart Scheduling
            </DialogTitle>
            <DialogDescription>
              AI-powered pitch booking suggestions based on historical usage and sunset times
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
              <h4 className="font-medium text-amber-900 mb-2">Best Available Slots</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Tuesday 6:30 PM</p>
                    <p className="text-xs text-gray-500">Main Pitch • Low usage</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Recommended</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Thursday 7:00 PM</p>
                    <p className="text-xs text-gray-500">Training Ground • Before sunset</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">Available</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Saturday 10:00 AM</p>
                    <p className="text-xs text-gray-500">Main Pitch • Good weather</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">Available</Badge>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Suggestions based on team preferences and historical booking patterns
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAIScheduler(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}