
import React from 'react';
import { ClubProvider, useClub } from '@/components/ClubContext';
import Sidebar from '@/components/navigation/Sidebar';
import BottomNav from '@/components/navigation/BottomNav';
import { Loader2 } from 'lucide-react';

function LayoutContent({ children, currentPageName }) {
  const { loading, currentClub, user } = useClub();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-white">CR</span>
            </div>
            <div className="absolute -bottom-1 -right-1">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">ClubRovia</h2>
            <p className="text-sm text-gray-500">Loading your clubs...</p>
          </div>
        </div>
      </div>
    );
  }

  // Public pages that don't need club context
  const publicPages = ['JoinTeam', 'TournamentLive', 'Onboarding'];
  const isPublicPage = publicPages.includes(currentPageName);

  if (isPublicPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50">
        {children}
      </div>
    );
  }

  // No clubs - show onboarding
  if (!currentClub && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 flex">
      <Sidebar currentPage={currentPageName} />
      
      <main className="flex-1 min-h-screen lg:h-screen lg:overflow-y-auto">
        <div className="pt-16 lg:pt-0 pb-20 lg:pb-0">
          {children}
        </div>
      </main>

      <BottomNav currentPage={currentPageName} />
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <ClubProvider>
      <style>{`
        :root {
          --background: 0 0% 98%;
          --foreground: 222.2 84% 4.9%;
          --card: 0 0% 100%;
          --card-foreground: 222.2 84% 4.9%;
          --primary: 221.2 83.2% 53.3%;
          --primary-foreground: 210 40% 98%;
          --secondary: 210 40% 96.1%;
          --secondary-foreground: 222.2 47.4% 11.2%;
          --muted: 210 40% 96.1%;
          --muted-foreground: 215.4 16.3% 46.9%;
          --accent: 210 40% 96.1%;
          --accent-foreground: 222.2 47.4% 11.2%;
          --destructive: 0 84.2% 60.2%;
          --destructive-foreground: 210 40% 98%;
          --border: 214.3 31.8% 91.4%;
          --input: 214.3 31.8% 91.4%;
          --ring: 221.2 83.2% 53.3%;
          --radius: 0.75rem;
        }
        
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
        
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
      <LayoutContent currentPageName={currentPageName}>
        {children}
      </LayoutContent>
    </ClubProvider>
  );
}
