import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import {
  Trophy, Calendar, MapPin, ExternalLink, Loader2, CheckCircle,
  Clock, AlertCircle, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard';

export default function TeamTournaments({ team }) {
  const { currentClub } = useClub();
  const [registrations, setRegistrations] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [team.id]);

  const loadData = async () => {
    try {
      // Get registrations where team name matches
      const regsData = await base44.entities.TournamentRegistration.filter({
        team_name: team.name
      });
      setRegistrations(regsData);

      // Get available tournaments
      const tournamentsData = await base44.entities.Tournament.filter({
        status: 'registration_open'
      });
      setTournaments(tournamentsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { icon: Clock, color: 'bg-amber-100 text-amber-700', label: 'Pending' },
      confirmed: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Confirmed' },
      waitlist: { icon: AlertCircle, color: 'bg-blue-100 text-blue-700', label: 'Waitlist' },
      rejected: { icon: AlertCircle, color: 'bg-red-100 text-red-700', label: 'Rejected' }
    };
    return configs[status] || configs.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Registrations */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Tournament Registrations</h3>
        {registrations.length === 0 ? (
          <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-xl">
            <Trophy className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>No tournament registrations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {registrations.map((reg) => {
              const statusConfig = getStatusConfig(reg.registration_status);
              const StatusIcon = statusConfig.icon;

              return (
                <GlassCard key={reg.id}>
                  <GlassCardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">{reg.tournament_name}</h4>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span>{reg.players?.length || 0} players</span>
                          {reg.payment_status === 'paid' ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">Paid</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700">Payment Pending</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={statusConfig.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        <Link to={createPageUrl(`TournamentLive?id=${reg.tournament_id}`)}>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </GlassCardContent>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Tournaments */}
      {tournaments.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Available Tournaments</h3>
          <div className="space-y-3">
            {tournaments.slice(0, 5).map((tournament) => (
              <GlassCard key={tournament.id}>
                <GlassCardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{tournament.name}</h4>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(parseISO(tournament.start_date), 'MMM d, yyyy')}
                        </span>
                        {tournament.venue && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {tournament.venue}
                          </span>
                        )}
                        {tournament.entry_fee > 0 && (
                          <span>€{tournament.entry_fee}</span>
                        )}
                      </div>
                    </div>
                    <Link to={createPageUrl(`Tournaments`)}>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Register
                      </Button>
                    </Link>
                  </div>
                </GlassCardContent>
              </GlassCard>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}