import React, { useState, useEffect } from 'react';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import ReactQuill from 'react-quill';
import {
  Newspaper, Plus, Edit2, Eye, EyeOff, Sparkles, Image,
  Calendar, User, Tag, Loader2, ChevronRight, Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function News() {
  const { currentClub, isClubAdmin, user } = useClub();
  const [posts, setPosts] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    featured_image_url: '',
    category: 'announcement',
    team_id: '',
    status: 'draft',
    is_featured: false
  });
  const [aiInputs, setAiInputs] = useState({
    score: '',
    scorers: '',
    man_of_match: '',
    key_moments: ''
  });
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    if (currentClub?.id) {
      loadData();
    }
  }, [currentClub?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [postsData, teamsData] = await Promise.all([
        base44.entities.NewsPost.filter({ club_id: currentClub.id }),
        base44.entities.Team.filter({ club_id: currentClub.id, is_active: true })
      ]);
      setPosts(postsData.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setTeams(teamsData);
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    if (filterCategory === 'all') return true;
    return post.category === filterCategory;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const team = teams.find(t => t.id === formData.team_id);
      const postData = {
        ...formData,
        club_id: currentClub.id,
        team_name: team?.name,
        author_id: user.id,
        author_name: user.full_name,
        slug: formData.title.toLowerCase().replace(/\s+/g, '-'),
        published_at: formData.status === 'published' ? new Date().toISOString() : null
      };

      if (selectedPost) {
        await base44.entities.NewsPost.update(selectedPost.id, postData);
      } else {
        await base44.entities.NewsPost.create(postData);
      }

      await loadData();
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving post:', error);
    } finally {
      setSaving(false);
    }
  };

  const generateMatchReport = async () => {
    setGeneratingAI(true);
    try {
      const prompt = `Write a professional 300-word match report for a sports club's news feed. Use an engaging, journalistic style.

Match Details:
- Final Score: ${aiInputs.score}
- Scorers: ${aiInputs.scorers}
- Man of the Match: ${aiInputs.man_of_match}
- Key Moments: ${aiInputs.key_moments}

Write a compelling match report with:
1. An exciting opening paragraph summarizing the result
2. Details of the goals and key moments
3. Praise for standout performers
4. Looking ahead to the next fixture

Keep the tone professional but celebratory.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            excerpt: { type: 'string' }
          }
        }
      });

      setFormData({
        ...formData,
        title: response.title || `Match Report: ${aiInputs.score}`,
        content: response.content || '',
        excerpt: response.excerpt || '',
        category: 'match_report',
        ai_generated: true
      });

      setShowAIModal(false);
      setShowAddModal(true);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGeneratingAI(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      featured_image_url: '',
      category: 'announcement',
      team_id: '',
      status: 'draft',
      is_featured: false
    });
    setSelectedPost(null);
  };

  const openEditModal = (post) => {
    setSelectedPost(post);
    setFormData({
      title: post.title || '',
      excerpt: post.excerpt || '',
      content: post.content || '',
      featured_image_url: post.featured_image_url || '',
      category: post.category || 'announcement',
      team_id: post.team_id || '',
      status: post.status || 'draft',
      is_featured: post.is_featured || false
    });
    setShowAddModal(true);
  };

  const getCategoryColor = (category) => {
    const colors = {
      match_report: 'bg-blue-100 text-blue-700',
      announcement: 'bg-purple-100 text-purple-700',
      event: 'bg-green-100 text-green-700',
      community: 'bg-pink-100 text-pink-700',
      achievement: 'bg-amber-100 text-amber-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">News & Updates</h1>
          <p className="text-gray-500 mt-1">{posts.length} articles</p>
        </div>
        {isClubAdmin && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowAIModal(true)} className="gap-2">
              <Wand2 className="w-4 h-4" />
              <span className="hidden sm:inline">AI Match Report</span>
            </Button>
            <Button 
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              <Plus className="w-4 h-4" />
              New Post
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <GlassCard className="mb-6">
        <GlassCardContent className="p-4">
          <Tabs value={filterCategory} onValueChange={setFilterCategory}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="match_report">Match Reports</TabsTrigger>
              <TabsTrigger value="announcement">Announcements</TabsTrigger>
              <TabsTrigger value="event">Events</TabsTrigger>
              <TabsTrigger value="community">Community</TabsTrigger>
            </TabsList>
          </Tabs>
        </GlassCardContent>
      </GlassCard>

      {/* Posts Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <GlassCard>
          <GlassCardContent className="p-12 text-center">
            <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-500 mb-4">Start sharing news with your club community</p>
            {isClubAdmin && (
              <Button onClick={() => { resetForm(); setShowAddModal(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Post
              </Button>
            )}
          </GlassCardContent>
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard className="h-full overflow-hidden group cursor-pointer" onClick={() => openEditModal(post)}>
                {post.featured_image_url ? (
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={post.featured_image_url} 
                      alt="" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {post.is_featured && (
                      <Badge className="absolute top-3 left-3 bg-amber-500">Featured</Badge>
                    )}
                    {post.ai_generated && (
                      <Badge className="absolute top-3 right-3 bg-purple-500">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <Newspaper className="w-12 h-12 text-gray-300" />
                  </div>
                )}
                <GlassCardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className={getCategoryColor(post.category)}>
                      {post.category?.replace('_', ' ')}
                    </Badge>
                    {post.status === 'draft' && (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                        <EyeOff className="w-3 h-3 mr-1" />
                        Draft
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                    {post.title}
                  </h3>
                  
                  {post.excerpt && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{post.excerpt}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {post.author_name}
                    </span>
                    <span>
                      {format(parseISO(post.published_at || post.created_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  
                  {post.team_name && (
                    <Badge variant="outline" className="mt-3 text-xs">
                      {post.team_name}
                    </Badge>
                  )}
                </GlassCardContent>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* AI Match Report Modal */}
      <Dialog open={showAIModal} onOpenChange={setShowAIModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-500" />
              AI Match Report Generator
            </DialogTitle>
            <DialogDescription>
              Enter key details and AI will write a professional match report
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="score">Final Score *</Label>
              <Input
                id="score"
                value={aiInputs.score}
                onChange={(e) => setAiInputs({...aiInputs, score: e.target.value})}
                placeholder="e.g., Home FC 3 - 1 Away United"
              />
            </div>

            <div>
              <Label htmlFor="scorers">Goal Scorers</Label>
              <Input
                id="scorers"
                value={aiInputs.scorers}
                onChange={(e) => setAiInputs({...aiInputs, scorers: e.target.value})}
                placeholder="e.g., Murphy (2), O'Brien"
              />
            </div>

            <div>
              <Label htmlFor="mom">Man of the Match</Label>
              <Input
                id="mom"
                value={aiInputs.man_of_match}
                onChange={(e) => setAiInputs({...aiInputs, man_of_match: e.target.value})}
                placeholder="e.g., John Murphy"
              />
            </div>

            <div>
              <Label htmlFor="moments">Key Moments</Label>
              <Textarea
                id="moments"
                value={aiInputs.key_moments}
                onChange={(e) => setAiInputs({...aiInputs, key_moments: e.target.value})}
                placeholder="e.g., Early penalty, red card 60mins, late winner"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAIModal(false)}>Cancel</Button>
            <Button 
              onClick={generateMatchReport}
              disabled={generatingAI || !aiInputs.score}
              className="bg-gradient-to-r from-purple-500 to-pink-600"
            >
              {generatingAI ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Post Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPost ? 'Edit Post' : 'Create New Post'}</DialogTitle>
            <DialogDescription>
              Share news and updates with your club members
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Post title"
              />
            </div>

            <div>
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                placeholder="Brief summary..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="featured_image_url">Featured Image URL</Label>
              <Input
                id="featured_image_url"
                value={formData.featured_image_url}
                onChange={(e) => setFormData({...formData, featured_image_url: e.target.value})}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="match_report">Match Report</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                    <SelectItem value="achievement">Achievement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="team_id">Related Team</Label>
                <Select value={formData.team_id} onValueChange={(v) => setFormData({...formData, team_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Content</Label>
              <div className="mt-2 border rounded-lg overflow-hidden">
                <ReactQuill
                  theme="snow"
                  value={formData.content}
                  onChange={(content) => setFormData({...formData, content})}
                  className="bg-white"
                  style={{ minHeight: '200px' }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                  <SelectTrigger className="w-[150px] mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(v) => setFormData({...formData, is_featured: v})}
                />
                <Label htmlFor="is_featured">Featured Post</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.title}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedPost ? 'Update Post' : 'Create Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}