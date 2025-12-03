import React, { useRef, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Share2, Download, Loader2, Instagram, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MatchCard({ match, club }) {
  const canvasRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [sponsor, setSponsor] = useState(null);
  const [generating, setGenerating] = useState(true);

  useEffect(() => {
    loadSponsorAndGenerate();
  }, [match]);

  const loadSponsorAndGenerate = async () => {
    try {
      // Get display sponsor
      const sponsors = await base44.entities.Sponsor.filter({
        club_id: club.id,
        status: 'active',
        display_on_match_graphics: true
      });
      if (sponsors.length > 0) {
        setSponsor(sponsors[0]);
      }
    } catch (error) {
      console.error('Error loading sponsor:', error);
    }
    
    // Generate after a brief delay to ensure state is set
    setTimeout(() => generateCard(), 100);
  };

  const generateCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    // Background gradient (club colors)
    const primaryColor = club.primary_color || '#3B82F6';
    const secondaryColor = club.secondary_color || '#6366F1';
    
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, primaryColor);
    gradient.addColorStop(1, secondaryColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add subtle pattern overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < width; i += 40) {
      ctx.fillRect(i, 0, 1, height);
    }

    // Competition/League name
    if (match.competition) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '28px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(match.competition.toUpperCase(), width / 2, 100);
    }

    // Match Result Banner
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 180, width, 60);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px system-ui, sans-serif';
    ctx.fillText('FULL TIME', width / 2, 220);

    // Team Names
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.textAlign = 'center';
    
    // Home team
    ctx.fillText(match.team_name.toUpperCase(), width / 2, 350);
    
    // Score
    ctx.font = 'bold 180px system-ui, sans-serif';
    const isGAA = match.sport_type === 'hurling' || match.sport_type === 'gaelic_football';
    const homeScore = isGAA ? `${match.home_score}-${match.home_points || 0}` : match.home_score;
    const awayScore = isGAA ? `${match.away_score}-${match.away_points || 0}` : match.away_score;
    ctx.fillText(`${homeScore}`, width / 2 - 150, 550);
    
    ctx.font = '80px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('-', width / 2, 520);
    
    ctx.font = 'bold 180px system-ui, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${awayScore}`, width / 2 + 150, 550);

    // Away team
    ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.fillText(match.opponent_name.toUpperCase(), width / 2, 650);

    // Venue
    if (match.venue) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '24px system-ui, sans-serif';
      ctx.fillText(match.venue, width / 2, 750);
    }

    // Club branding
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 36px system-ui, sans-serif';
    ctx.fillText(club.name, width / 2, 900);

    // Sponsor area (bottom)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(0, height - 120, width, 120);
    
    if (sponsor?.name) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText('Proudly sponsored by', width / 2, height - 80);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.fillText(sponsor.name, width / 2, height - 40);
    }

    // Generate image URL
    const url = canvas.toDataURL('image/png');
    setImageUrl(url);
    setGenerating(false);
  };

  const handleShare = async () => {
    if (!imageUrl) return;

    // Convert data URL to blob
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const file = new File([blob], 'match-result.png', { type: 'image/png' });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `${match.team_name} vs ${match.opponent_name}`,
          text: `Final Score: ${match.home_score} - ${match.away_score}`,
          files: [file]
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: download
      handleDownload();
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.download = `${match.team_name}-vs-${match.opponent_name}-result.png`;
    link.href = imageUrl;
    link.click();
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-gray-100 rounded-xl overflow-hidden">
        <canvas 
          ref={canvasRef} 
          className="w-full h-auto"
          style={{ display: generating ? 'none' : 'block' }}
        />
        {generating && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button 
          onClick={handleShare} 
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600"
          disabled={generating}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
        <Button 
          onClick={handleDownload} 
          variant="outline"
          disabled={generating}
        >
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>

      <div className="flex gap-2 justify-center">
        <Button variant="ghost" size="sm" className="text-green-600">
          <MessageCircle className="w-4 h-4 mr-1" />
          WhatsApp
        </Button>
        <Button variant="ghost" size="sm" className="text-pink-600">
          <Instagram className="w-4 h-4 mr-1" />
          Instagram
        </Button>
      </div>
    </div>
  );
}