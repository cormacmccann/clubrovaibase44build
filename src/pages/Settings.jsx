import React, { useState } from 'react';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon, User, Bell, Shield, Palette,
  Globe, Lock, Mail, Phone, Save, Loader2, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';

export default function Settings() {
  const { user, currentClub, isClubAdmin, refreshData } = useClub();
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState({
    email_events: true,
    email_payments: true,
    email_news: true,
    push_messages: true,
    push_events: true
  });
  const [clubSettings, setClubSettings] = useState({
    timezone: currentClub?.settings?.timezone || 'Europe/Dublin',
    currency: currentClub?.settings?.currency || 'EUR',
    enable_lotto: currentClub?.settings?.enable_lotto || false,
    enable_public_fixtures: currentClub?.settings?.enable_public_fixtures || true
  });

  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    phone: '',
    address: ''
  });

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        full_name: profileData.full_name,
        phone: profileData.phone,
        address: profileData.address
      });
      await refreshData();
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClubSettings = async () => {
    if (!currentClub || !isClubAdmin) return;
    
    setSaving(true);
    try {
      await base44.entities.Club.update(currentClub.id, {
        settings: {
          ...currentClub.settings,
          ...clubSettings
        }
      });
      await refreshData();
    } catch (error) {
      console.error('Error saving club settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
      </motion.div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6 flex flex-wrap">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          {isClubAdmin && (
            <TabsTrigger value="club" className="gap-2">
              <Building2 className="w-4 h-4" />
              Club Settings
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <GlassCard>
            <GlassCardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="flex items-start gap-6 mb-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={user?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl">
                    {user?.full_name?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{user?.full_name}</h3>
                  <p className="text-gray-500">{user?.email}</p>
                  <Button variant="outline" size="sm" className="mt-3">
                    Change Photo
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue={user?.email}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      placeholder="+353 12 345 6789"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={profileData.address}
                    onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                    placeholder="Your address"
                    rows={2}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600"
                  >
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <GlassCard>
            <GlassCardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-gray-500" />
                    Email Notifications
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-700">Events & Schedule</p>
                        <p className="text-sm text-gray-500">Reminders for upcoming matches and training</p>
                      </div>
                      <Switch
                        checked={notifications.email_events}
                        onCheckedChange={(v) => setNotifications({...notifications, email_events: v})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-700">Payment Reminders</p>
                        <p className="text-sm text-gray-500">Due dates and payment confirmations</p>
                      </div>
                      <Switch
                        checked={notifications.email_payments}
                        onCheckedChange={(v) => setNotifications({...notifications, email_payments: v})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-700">News & Updates</p>
                        <p className="text-sm text-gray-500">Club announcements and match reports</p>
                      </div>
                      <Switch
                        checked={notifications.email_news}
                        onCheckedChange={(v) => setNotifications({...notifications, email_news: v})}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-gray-500" />
                    Push Notifications
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-700">Chat Messages</p>
                        <p className="text-sm text-gray-500">New messages from team chats</p>
                      </div>
                      <Switch
                        checked={notifications.push_messages}
                        onCheckedChange={(v) => setNotifications({...notifications, push_messages: v})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-700">Event Updates</p>
                        <p className="text-sm text-gray-500">Changes to scheduled events</p>
                      </div>
                      <Switch
                        checked={notifications.push_events}
                        onCheckedChange={(v) => setNotifications({...notifications, push_events: v})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </GlassCardContent>
          </GlassCard>
        </TabsContent>

        {/* Club Settings Tab - Admin Only */}
        {isClubAdmin && (
          <TabsContent value="club">
            <div className="space-y-6">
              <GlassCard>
                <GlassCardHeader>
                  <h2 className="text-lg font-semibold text-gray-900">Club Information</h2>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="flex items-start gap-6 mb-6">
                    {currentClub?.logo_url ? (
                      <img src={currentClub.logo_url} alt="" className="w-20 h-20 rounded-2xl object-cover" />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                        {currentClub?.name?.[0]}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{currentClub?.name}</h3>
                      <p className="text-gray-500 capitalize">{currentClub?.sport_type} Club</p>
                      <Button variant="outline" size="sm" className="mt-3">
                        Change Logo
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="club_name">Club Name</Label>
                      <Input
                        id="club_name"
                        defaultValue={currentClub?.name}
                      />
                    </div>
                    <div>
                      <Label htmlFor="sport_type">Sport</Label>
                      <Select defaultValue={currentClub?.sport_type}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="football">Football</SelectItem>
                          <SelectItem value="rugby">Rugby</SelectItem>
                          <SelectItem value="hurling">Hurling</SelectItem>
                          <SelectItem value="gaelic_football">Gaelic Football</SelectItem>
                          <SelectItem value="basketball">Basketball</SelectItem>
                          <SelectItem value="hockey">Hockey</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </GlassCardContent>
              </GlassCard>

              <GlassCard>
                <GlassCardHeader>
                  <h2 className="text-lg font-semibold text-gray-900">Regional Settings</h2>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select 
                        value={clubSettings.timezone} 
                        onValueChange={(v) => setClubSettings({...clubSettings, timezone: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Europe/Dublin">Europe/Dublin (GMT)</SelectItem>
                          <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                          <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                          <SelectItem value="America/Los_Angeles">America/Los Angeles (PST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select 
                        value={clubSettings.currency} 
                        onValueChange={(v) => setClubSettings({...clubSettings, currency: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">Euro (€)</SelectItem>
                          <SelectItem value="GBP">British Pound (£)</SelectItem>
                          <SelectItem value="USD">US Dollar ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </GlassCardContent>
              </GlassCard>

              <GlassCard>
                <GlassCardHeader>
                  <h2 className="text-lg font-semibold text-gray-900">Features</h2>
                </GlassCardHeader>
                <GlassCardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-700">Enable Lotto</p>
                        <p className="text-sm text-gray-500">Allow members to participate in club lotto</p>
                      </div>
                      <Switch
                        checked={clubSettings.enable_lotto}
                        onCheckedChange={(v) => setClubSettings({...clubSettings, enable_lotto: v})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-700">Public Fixtures</p>
                        <p className="text-sm text-gray-500">Show fixtures on public website</p>
                      </div>
                      <Switch
                        checked={clubSettings.enable_public_fixtures}
                        onCheckedChange={(v) => setClubSettings({...clubSettings, enable_public_fixtures: v})}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t mt-6">
                    <Button 
                      onClick={handleSaveClubSettings}
                      disabled={saving}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600"
                    >
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Club Settings
                    </Button>
                  </div>
                </GlassCardContent>
              </GlassCard>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}