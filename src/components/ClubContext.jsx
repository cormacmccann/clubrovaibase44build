import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const ClubContext = createContext(null);

export function ClubProvider({ children }) {
  const [user, setUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [currentClub, setCurrentClub] = useState(null);
  const [currentMembership, setCurrentMembership] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Load user's club memberships
      const userMemberships = await base44.entities.ClubMembership.filter({
        user_email: userData.email
      });
      setMemberships(userMemberships);

      if (userMemberships.length > 0) {
        // Load all clubs
        const clubIds = userMemberships.map(m => m.club_id);
        const allClubs = await base44.entities.Club.filter({});
        const userClubs = allClubs.filter(c => clubIds.includes(c.id));
        setClubs(userClubs);

        // Set current club from localStorage or first club
        const savedClubId = localStorage.getItem('currentClubId');
        const savedClub = userClubs.find(c => c.id === savedClubId);
        const activeClub = savedClub || userClubs[0];
        
        setCurrentClub(activeClub);
        setCurrentMembership(userMemberships.find(m => m.club_id === activeClub.id));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchClub = (clubId) => {
    const club = clubs.find(c => c.id === clubId);
    const membership = memberships.find(m => m.club_id === clubId);
    
    if (club && membership) {
      setCurrentClub(club);
      setCurrentMembership(membership);
      localStorage.setItem('currentClubId', clubId);
    }
  };

  const hasPermission = (permission) => {
    if (!currentMembership) return false;
    
    const rolePermissions = {
      site_admin: ['all'],
      club_admin: ['manage_members', 'manage_teams', 'manage_finances', 'manage_events', 'manage_inventory', 'manage_sponsors', 'manage_tournaments', 'send_messages', 'view_analytics'],
      coach: ['manage_team', 'manage_events', 'send_messages', 'view_team'],
      team_manager: ['manage_team', 'manage_events', 'send_messages', 'view_team'],
      guardian: ['view_schedule', 'view_payments', 'send_messages'],
      player: ['view_schedule', 'view_team', 'send_messages'],
      member: ['view_schedule', 'send_messages']
    };

    const perms = rolePermissions[currentMembership.role] || [];
    return perms.includes('all') || perms.includes(permission);
  };

  const isSiteAdmin = currentMembership?.role === 'site_admin';
  const isClubAdmin = currentMembership?.role === 'club_admin' || isSiteAdmin;
  const isCoach = ['coach', 'team_manager'].includes(currentMembership?.role) || isClubAdmin;

  return (
    <ClubContext.Provider value={{
      user,
      memberships,
      clubs,
      currentClub,
      currentMembership,
      loading,
      switchClub,
      hasPermission,
      isSiteAdmin,
      isClubAdmin,
      isCoach,
      refreshData: loadUserData
    }}>
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  const context = useContext(ClubContext);
  if (!context) {
    throw new Error('useClub must be used within a ClubProvider');
  }
  return context;
}

export default ClubContext;