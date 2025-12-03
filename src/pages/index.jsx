import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Members from "./Members";

import Teams from "./Teams";

import Schedule from "./Schedule";

import Chat from "./Chat";

import Payments from "./Payments";

import Inventory from "./Inventory";

import Tournaments from "./Tournaments";

import TournamentLive from "./TournamentLive";

import Sponsors from "./Sponsors";

import News from "./News";

import JoinTeam from "./JoinTeam";

import More from "./More";

import Settings from "./Settings";

import TeamManagement from "./TeamManagement";

import MatchLive from "./MatchLive";

import MatchCenter from "./MatchCenter";

import RegistrarDashboard from "./RegistrarDashboard";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Members: Members,
    
    Teams: Teams,
    
    Schedule: Schedule,
    
    Chat: Chat,
    
    Payments: Payments,
    
    Inventory: Inventory,
    
    Tournaments: Tournaments,
    
    TournamentLive: TournamentLive,
    
    Sponsors: Sponsors,
    
    News: News,
    
    JoinTeam: JoinTeam,
    
    More: More,
    
    Settings: Settings,
    
    TeamManagement: TeamManagement,
    
    MatchLive: MatchLive,
    
    MatchCenter: MatchCenter,
    
    RegistrarDashboard: RegistrarDashboard,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Members" element={<Members />} />
                
                <Route path="/Teams" element={<Teams />} />
                
                <Route path="/Schedule" element={<Schedule />} />
                
                <Route path="/Chat" element={<Chat />} />
                
                <Route path="/Payments" element={<Payments />} />
                
                <Route path="/Inventory" element={<Inventory />} />
                
                <Route path="/Tournaments" element={<Tournaments />} />
                
                <Route path="/TournamentLive" element={<TournamentLive />} />
                
                <Route path="/Sponsors" element={<Sponsors />} />
                
                <Route path="/News" element={<News />} />
                
                <Route path="/JoinTeam" element={<JoinTeam />} />
                
                <Route path="/More" element={<More />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/TeamManagement" element={<TeamManagement />} />
                
                <Route path="/MatchLive" element={<MatchLive />} />
                
                <Route path="/MatchCenter" element={<MatchCenter />} />
                
                <Route path="/RegistrarDashboard" element={<RegistrarDashboard />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}