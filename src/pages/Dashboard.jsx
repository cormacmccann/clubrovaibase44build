import React, { useState, useEffect } from 'react';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import { format, isToday, isTomorrow, parseISO, startOfDay, addDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Users,
  CalendarDays,
  CreditCard,
  TrendingUp,
  Trophy,
  ChevronRight,
  Clock,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  MessageCircle,
  Bell,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Dashboard() {
  const { currentClub, currentMembership, isClubAdmin, user } = useClub();
  const [stats, setStats] = useState({
    members: 0,
    teams: 0,
    upcomingEvents: 0,
    revenue: 0
  });
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentNews, setRecentNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentClub?.id) {
      loadDashboardData();
    }
  }, [currentClub?.id]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [members, teams, events, payments, news] = await Promise.all([
        base44.entities.Member.filter({ club_id: currentClub.id, status: 'active' }),
        base44.entities.Team.filter({ club_id: currentClub.id, is_active: true }),
        base44.entities.Event.filter({ club_id: currentClub.id }),
        isClubAdmin ? base44.entities.Payment.filter({ club_id: currentClub.id, status: 'completed' }) : Promise.resolve([]),
        base44.entities.NewsPost.filter({ club_id: currentClub.id, status: 'published' })
      ]);

      const now = new Date();
      const upcoming = events
        .filter(e => new Date(e.start_datetime) >= now)
        .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
        .slice(0, 5);

      const monthRevenue = payments
        .filter(p => {
          const paidDate = new Date(p.paid_date || p.created_date);
          return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      setStats({
        members: members.length,
        teams: teams.length,
        upcomingEvents: upcoming.length,
        revenue: monthRevenue
      });
      setUpcomingEvents(upcoming);
      setRecentNews(news.slice(0, 3));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatEventDate = (dateStr) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
    if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
    return format(date, 'EEE d MMM, h:mm a');
  };

  const getEventTypeColor = (type) => {
    const colors = {
      match: 'bg-blue-100 text-blue-700',
      training: 'bg-green-100 text-green-700',
      meeting: 'bg-purple-100 text-purple-700',
      social: 'bg-pink-100 text-pink-700',
      fundraiser: 'bg-amber-100 text-amber-700',
      tournament: 'bg-red-100 text-red-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const statsCards = [
    { 
      title: 'Active Members', 
      value: stats.members, 
      icon: Users, 
      color: 'from-blue-500 to-indigo-600',
      change: '+12%',
      positive: true
    },
    { 
      title: 'Teams', 
      value: stats.teams, 
      icon: Trophy, 
      color: 'from-emerald-500 to-teal-600',
      change: null
    },
    { 
      title: 'Upcoming Events', 
      value: stats.upcomingEvents, 
      icon: CalendarDays, 
      color: 'from-purple-500 to-pink-600',
      change: null
    },
    ...(isClubAdmin ? [{ 
      title: 'Month Revenue', 
      value: `€${stats.revenue.toLocaleString()}`, 
      icon: CreditCard, 
      color: 'from-orange-500 to-red-600',
      change: '+8%',
      positive: true
    }] : [])
  ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Welcome back, {user?.full_name?.split(' ')[0] || 'there'}! 👋
            </h1>
            <p className="text-gray-500 mt-1">
              Here's what's happening at {currentClub?.name}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Notifications</span>
            </Button>
            {isClubAdmin && (
              <Link to={createPageUrl('Schedule')}>
                <Button size="sm" className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                  <Plus className="w-4 h-4" />
                  Add Event
                </Button>
              </Link>
            )}
          </div>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <GlassCard className="h-full">
              <GlassCardContent className="p-4 lg:p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  {stat.change && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {stat.change}
                    </div>
                  )}
                </div>
                <div className="text-2xl lg:text-3xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-1">{stat.title}</div>
              </GlassCardContent>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <div className="lg:col-span-2">
          <GlassCard>
            <GlassCardHeader className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Schedule</h2>
              <Link to={createPageUrl('Schedule')} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </GlassCardHeader>
            <GlassCardContent className="p-0">
              {upcomingEvents.length === 0 ? (
                <div className="p-8 text-center">
                  <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No upcoming events</p>
                  {isClubAdmin && (
                    <Link to={createPageUrl('Schedule')}>
                      <Button variant="link" className="mt-2">
                        <Plus className="w-4 h-4 mr-1" /> Create Event
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {upcomingEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex flex-col items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">{format(parseISO(event.start_datetime), 'MMM')}</span>
                          <span className="text-lg font-bold text-blue-700">{format(parseISO(event.start_datetime), 'd')}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium text-gray-900 truncate">{event.title}</h3>
                            <Badge variant="secondary" className={getEventTypeColor(event.event_type)}>
                              {event.event_type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {formatEventDate(event.start_datetime)}
                            </span>
                            {event.venue && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {event.venue}
                              </span>
                            )}
                          </div>
                          {event.team_name && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              {event.team_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* Recent News */}
        <div>
          <GlassCard>
            <GlassCardHeader className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Latest News</h2>
              <Link to={createPageUrl('News')} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                All news <ChevronRight className="w-4 h-4" />
              </Link>
            </GlassCardHeader>
            <GlassCardContent className="p-0">
              {recentNews.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No news yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentNews.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      {post.featured_image_url && (
                        <img 
                          src={post.featured_image_url} 
                          alt="" 
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                      )}
                      <h3 className="font-medium text-gray-900 line-clamp-2">{post.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{post.excerpt}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                        <span>{post.author_name}</span>
                        <span>•</span>
                        <span>{format(parseISO(post.published_at || post.created_date), 'MMM d')}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </GlassCardContent>
          </GlassCard>

          {/* Quick Links */}
          <GlassCard className="mt-6">
            <GlassCardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Links</h3>
              <div className="space-y-2">
                <Link 
                  to={createPageUrl('Schedule')} 
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <CalendarDays className="w-5 h-5 text-blue-500" />
                    <span className="font-medium text-gray-700">View Schedule</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
                <Link 
                  to={createPageUrl('Chat')} 
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-green-500" />
                    <span className="font-medium text-gray-700">Team Chat</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
                <Link 
                  to={createPageUrl('Payments')} 
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-purple-500" />
                    <span className="font-medium text-gray-700">My Payments</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}