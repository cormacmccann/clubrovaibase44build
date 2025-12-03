import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Settings, Copy, Share2, Mail, Loader2, Check, Link as LinkIcon,
  Users, Calendar, MapPin, Phone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function TeamSettingsPanel({ team, onUpdate }) {
  const [settings, setSettings] = useState(team.settings || {
    allow_public_join: false,
    require_approval: true,
    max_players: 25
  });
  const [contactPerson, setContactPerson] = useState(team.contact_person || {
    name: '',
    email: '',
    phone: '',
    role: 'Manager'
  });
  const [feeStructure, setFeeStructure] = useState(team.fee_structure || {
    registration_fee: 0,
    monthly_fee: 0,
    match_fee: 0
  });
  const [trainingSchedule, setTrainingSchedule] = useState(team.training_schedule || []);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Team.update(team.id, {
        settings,
        contact_person: contactPerson,
        fee_structure: feeStructure,
        training_schedule: trainingSchedule
      });
      onUpdate();
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const copyJoinLink = () => {
    const link = `${window.location.origin}/JoinTeam?code=${team.join_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addTrainingSlot = () => {
    setTrainingSchedule([
      ...trainingSchedule,
      { day: 'Monday', start_time: '18:00', end_time: '19:30', venue: '' }
    ]);
  };

  const updateTrainingSlot = (index, field, value) => {
    const updated = [...trainingSchedule];
    updated[index] = { ...updated[index], [field]: value };
    setTrainingSchedule(updated);
  };

  const removeTrainingSlot = (index) => {
    setTrainingSchedule(trainingSchedule.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Join Link */}
      <GlassCard>
        <GlassCardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold text-gray-900">Team Join Link</h4>
              <p className="text-sm text-gray-500">Share this link for new members to request to join</p>
            </div>
            <Badge variant="outline" className="font-mono">{team.join_code}</Badge>
          </div>
          <div className="flex gap-2">
            <Input
              readOnly
              value={`${window.location.origin}/JoinTeam?code=${team.join_code}`}
              className="font-mono text-sm"
            />
            <Button variant="outline" onClick={copyJoinLink}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Contact Person */}
      <GlassCard>
        <GlassCardContent className="p-4">
          <h4 className="font-semibold text-gray-900 mb-4">Team Contact Person</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={contactPerson.name}
                onChange={(e) => setContactPerson({...contactPerson, name: e.target.value})}
                placeholder="Contact name"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={contactPerson.role} onValueChange={(v) => setContactPerson({...contactPerson, role: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Head Coach">Head Coach</SelectItem>
                  <SelectItem value="Assistant Coach">Assistant Coach</SelectItem>
                  <SelectItem value="Team Admin">Team Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={contactPerson.email}
                onChange={(e) => setContactPerson({...contactPerson, email: e.target.value})}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={contactPerson.phone}
                onChange={(e) => setContactPerson({...contactPerson, phone: e.target.value})}
                placeholder="+353..."
              />
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Fee Structure */}
      <GlassCard>
        <GlassCardContent className="p-4">
          <h4 className="font-semibold text-gray-900 mb-4">Fee Structure</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Registration Fee (€)</Label>
              <Input
                type="number"
                min="0"
                value={feeStructure.registration_fee}
                onChange={(e) => setFeeStructure({...feeStructure, registration_fee: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Monthly Fee (€)</Label>
              <Input
                type="number"
                min="0"
                value={feeStructure.monthly_fee}
                onChange={(e) => setFeeStructure({...feeStructure, monthly_fee: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div>
              <Label>Match Fee (€)</Label>
              <Input
                type="number"
                min="0"
                value={feeStructure.match_fee}
                onChange={(e) => setFeeStructure({...feeStructure, match_fee: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Training Schedule */}
      <GlassCard>
        <GlassCardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Training Schedule</h4>
            <Button variant="outline" size="sm" onClick={addTrainingSlot}>
              Add Session
            </Button>
          </div>
          {trainingSchedule.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No training sessions scheduled</p>
          ) : (
            <div className="space-y-3">
              {trainingSchedule.map((slot, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Select value={slot.day} onValueChange={(v) => updateTrainingSlot(index, 'day', v)}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="time"
                    value={slot.start_time}
                    onChange={(e) => updateTrainingSlot(index, 'start_time', e.target.value)}
                    className="w-24"
                  />
                  <span className="text-gray-400">-</span>
                  <Input
                    type="time"
                    value={slot.end_time}
                    onChange={(e) => updateTrainingSlot(index, 'end_time', e.target.value)}
                    className="w-24"
                  />
                  <Input
                    value={slot.venue}
                    onChange={(e) => updateTrainingSlot(index, 'venue', e.target.value)}
                    placeholder="Venue"
                    className="flex-1"
                  />
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeTrainingSlot(index)}>
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
        </GlassCardContent>
      </GlassCard>

      {/* General Settings */}
      <GlassCard>
        <GlassCardContent className="p-4">
          <h4 className="font-semibold text-gray-900 mb-4">Team Settings</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Public Join Requests</Label>
                <p className="text-xs text-gray-500">Allow anyone with the link to request to join</p>
              </div>
              <Switch
                checked={settings.allow_public_join}
                onCheckedChange={(v) => setSettings({...settings, allow_public_join: v})}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Approval</Label>
                <p className="text-xs text-gray-500">Join requests need admin approval</p>
              </div>
              <Switch
                checked={settings.require_approval}
                onCheckedChange={(v) => setSettings({...settings, require_approval: v})}
              />
            </div>
            <div>
              <Label>Max Players</Label>
              <Input
                type="number"
                min="1"
                value={settings.max_players}
                onChange={(e) => setSettings({...settings, max_players: parseInt(e.target.value) || 25})}
                className="w-24"
              />
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-500 to-indigo-600">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}