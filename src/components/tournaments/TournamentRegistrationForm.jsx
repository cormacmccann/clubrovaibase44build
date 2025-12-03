import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import {
  Users, CreditCard, Mail, Phone, Plus, Trash2, 
  CheckCircle, Loader2, ArrowRight, ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

export default function TournamentRegistrationForm({ tournament, onSuccess, onCancel }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    team_name: '',
    team_club_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    players: [{ name: '', jersey_number: '', position: '' }],
    coaches: [{ name: '', phone: '', email: '' }],
    special_requests: '',
    notifications_enabled: true,
    notification_preferences: { email: true, sms: false }
  });

  const addPlayer = () => {
    setFormData({
      ...formData,
      players: [...formData.players, { name: '', jersey_number: '', position: '' }]
    });
  };

  const removePlayer = (index) => {
    if (formData.players.length > 1) {
      setFormData({
        ...formData,
        players: formData.players.filter((_, i) => i !== index)
      });
    }
  };

  const updatePlayer = (index, field, value) => {
    const players = [...formData.players];
    players[index] = { ...players[index], [field]: value };
    setFormData({ ...formData, players });
  };

  const addCoach = () => {
    setFormData({
      ...formData,
      coaches: [...formData.coaches, { name: '', phone: '', email: '' }]
    });
  };

  const removeCoach = (index) => {
    if (formData.coaches.length > 1) {
      setFormData({
        ...formData,
        coaches: formData.coaches.filter((_, i) => i !== index)
      });
    }
  };

  const updateCoach = (index, field, value) => {
    const coaches = [...formData.coaches];
    coaches[index] = { ...coaches[index], [field]: value };
    setFormData({ ...formData, coaches });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const registrationData = {
        tournament_id: tournament.id,
        tournament_name: tournament.name,
        club_id: tournament.club_id,
        ...formData,
        entry_fee: tournament.entry_fee || 0,
        payment_status: tournament.entry_fee > 0 ? 'pending' : 'waived',
        registration_status: 'pending'
      };

      await base44.entities.TournamentRegistration.create(registrationData);

      // Update tournament registration count
      await base44.entities.Tournament.update(tournament.id, {
        registration_count: (tournament.registration_count || 0) + 1
      });

      // Send confirmation notification
      if (tournament.notification_settings?.send_registration_confirmation) {
        await base44.entities.Notification.create({
          club_id: tournament.club_id,
          type: 'tournament_update',
          recipient_type: 'tournament_participant',
          recipient_email: formData.contact_email,
          recipient_name: formData.contact_name,
          subject: `Registration Confirmed: ${tournament.name}`,
          message: `Thank you for registering ${formData.team_name} for ${tournament.name}. Your registration is pending confirmation. ${tournament.entry_fee > 0 ? `Entry fee of €${tournament.entry_fee} is due.` : ''}`,
          related_entity_type: 'tournament',
          related_entity_id: tournament.id,
          status: 'pending'
        });
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error submitting registration:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const isStep1Valid = formData.team_name && formData.contact_name && formData.contact_email;
  const isStep2Valid = formData.players.some(p => p.name);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
              s === step 
                ? 'bg-blue-600 text-white' 
                : s < step 
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {s < step ? <CheckCircle className="w-5 h-5" /> : s}
          </div>
        ))}
      </div>

      {/* Step 1: Team Details */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Team & Contact Details</h3>
          
          <div>
            <Label htmlFor="team_name">Team Name *</Label>
            <Input
              id="team_name"
              value={formData.team_name}
              onChange={(e) => setFormData({...formData, team_name: e.target.value})}
              placeholder="Your team name"
            />
          </div>

          <div>
            <Label htmlFor="team_club_name">Club Name</Label>
            <Input
              id="team_club_name"
              value={formData.team_club_name}
              onChange={(e) => setFormData({...formData, team_club_name: e.target.value})}
              placeholder="Your club/organization"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_name">Contact Name *</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                placeholder="Primary contact"
              />
            </div>
            <div>
              <Label htmlFor="contact_phone">Phone Number</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                placeholder="+353 ..."
              />
            </div>
          </div>

          <div>
            <Label htmlFor="contact_email">Email Address *</Label>
            <Input
              id="contact_email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
              placeholder="team@example.com"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              onClick={() => setStep(2)}
              disabled={!isStep1Valid}
              className="gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step 2: Squad */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Squad Registration</h3>

          {/* Coaches */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">Coaches/Managers</Label>
              <Button type="button" variant="outline" size="sm" onClick={addCoach}>
                <Plus className="w-4 h-4 mr-1" /> Add Coach
              </Button>
            </div>
            {formData.coaches.map((coach, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  placeholder="Name"
                  value={coach.name}
                  onChange={(e) => updateCoach(index, 'name', e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Phone"
                  value={coach.phone}
                  onChange={(e) => updateCoach(index, 'phone', e.target.value)}
                  className="flex-1"
                />
                {formData.coaches.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeCoach(index)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Players */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-medium">Players</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPlayer}>
                <Plus className="w-4 h-4 mr-1" /> Add Player
              </Button>
            </div>
            <div className="space-y-2">
              {formData.players.map((player, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <span className="w-6 text-sm text-gray-500">{index + 1}.</span>
                  <Input
                    placeholder="Player name"
                    value={player.name}
                    onChange={(e) => updatePlayer(index, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="#"
                    type="number"
                    value={player.jersey_number}
                    onChange={(e) => updatePlayer(index, 'jersey_number', e.target.value)}
                    className="w-16"
                  />
                  <Input
                    placeholder="Position"
                    value={player.position}
                    onChange={(e) => updatePlayer(index, 'position', e.target.value)}
                    className="w-28"
                  />
                  {formData.players.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removePlayer(index)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button 
              onClick={() => setStep(3)}
              disabled={!isStep2Valid}
              className="gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step 3: Review & Payment */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Review & Submit</h3>

          {/* Summary */}
          <GlassCard>
            <GlassCardContent className="p-4">
              <h4 className="font-medium text-gray-900 mb-3">Registration Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Team:</span>
                  <span className="font-medium">{formData.team_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Contact:</span>
                  <span>{formData.contact_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Players:</span>
                  <span>{formData.players.filter(p => p.name).length} registered</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Coaches:</span>
                  <span>{formData.coaches.filter(c => c.name).length} registered</span>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>

          {/* Entry Fee */}
          {tournament.entry_fee > 0 && (
            <GlassCard>
              <GlassCardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <span className="font-medium">Entry Fee</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">€{tournament.entry_fee}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Payment will be collected after your registration is confirmed
                </p>
              </GlassCardContent>
            </GlassCard>
          )}

          {/* Notifications */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">Match Notifications</p>
                <p className="text-sm text-blue-700 mt-1">
                  You'll receive email notifications for fixture updates, schedule changes, and match results.
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={formData.notification_preferences.email}
                      onCheckedChange={(v) => setFormData({
                        ...formData, 
                        notification_preferences: {...formData.notification_preferences, email: v}
                      })}
                    />
                    <span className="text-sm">Email</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={formData.notification_preferences.sms}
                      onCheckedChange={(v) => setFormData({
                        ...formData, 
                        notification_preferences: {...formData.notification_preferences, sms: v}
                      })}
                    />
                    <span className="text-sm">SMS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Special Requests */}
          <div>
            <Label htmlFor="special_requests">Special Requests (Optional)</Label>
            <Textarea
              id="special_requests"
              value={formData.special_requests}
              onChange={(e) => setFormData({...formData, special_requests: e.target.value})}
              placeholder="Any special requirements or requests..."
              rows={2}
            />
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Submit Registration
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}