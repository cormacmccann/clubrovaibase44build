import React, { useState, useEffect } from 'react';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import {
  Car, Shirt, Goal, Coffee, HeartPulse, Eye, Plus, Check, Loader2, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const TASK_TYPES = {
  transport: { icon: Car, label: 'Transport', color: 'bg-blue-100 text-blue-700' },
  jersey_wash: { icon: Shirt, label: 'Jersey Wash', color: 'bg-purple-100 text-purple-700' },
  goal_setup: { icon: Goal, label: 'Goal Setup', color: 'bg-green-100 text-green-700' },
  refreshments: { icon: Coffee, label: 'Refreshments', color: 'bg-amber-100 text-amber-700' },
  first_aid: { icon: HeartPulse, label: 'First Aid', color: 'bg-red-100 text-red-700' },
  supervision: { icon: Eye, label: 'Supervision', color: 'bg-indigo-100 text-indigo-700' },
  other: { icon: Users, label: 'Other', color: 'bg-gray-100 text-gray-700' }
};

export default function VolunteerTasksSection({ event, isAdmin, onTaskUpdate }) {
  const { currentClub, currentMemberProfile, familyMembers, childMembers } = useClub();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [claiming, setClaiming] = useState(null);
  const [formData, setFormData] = useState({
    task_type: 'transport',
    title: '',
    description: '',
    slots_needed: 1,
    transport_seats: 4
  });

  useEffect(() => {
    loadTasks();
  }, [event.id]);

  const loadTasks = async () => {
    try {
      const data = await base44.entities.VolunteerTask.filter({ event_id: event.id });
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    try {
      await base44.entities.VolunteerTask.create({
        ...formData,
        club_id: currentClub.id,
        event_id: event.id,
        event_title: event.title,
        event_date: event.start_datetime,
        team_id: event.team_id,
        team_name: event.team_name,
        claimed_by: [],
        status: 'open'
      });
      await loadTasks();
      setShowAddModal(false);
      setFormData({
        task_type: 'transport',
        title: '',
        description: '',
        slots_needed: 1,
        transport_seats: 4
      });
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleClaimTask = async (task, forChildId = null) => {
    if (!currentMemberProfile) return;
    setClaiming(task.id);
    
    try {
      const forChild = forChildId ? childMembers.find(c => c.id === forChildId) : null;
      
      const newClaim = {
        member_id: currentMemberProfile.id,
        member_name: `${currentMemberProfile.first_name} ${currentMemberProfile.last_name}`,
        claimed_at: new Date().toISOString(),
        for_child_id: forChildId || null,
        for_child_name: forChild ? `${forChild.first_name} ${forChild.last_name}` : null
      };

      const updatedClaims = [...(task.claimed_by || []), newClaim];
      const isFilled = updatedClaims.length >= task.slots_needed;

      await base44.entities.VolunteerTask.update(task.id, {
        claimed_by: updatedClaims,
        status: isFilled ? 'filled' : 'open'
      });

      await loadTasks();
      if (onTaskUpdate) onTaskUpdate();
    } catch (error) {
      console.error('Error claiming task:', error);
    } finally {
      setClaiming(null);
    }
  };

  const hasUserClaimed = (task) => {
    return task.claimed_by?.some(c => c.member_id === currentMemberProfile?.id);
  };

  const getTaskConfig = (type) => TASK_TYPES[type] || TASK_TYPES.other;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Volunteers Needed</h4>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Task
          </Button>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No volunteer tasks for this event</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const config = getTaskConfig(task.task_type);
            const Icon = config.icon;
            const slotsRemaining = task.slots_needed - (task.claimed_by?.length || 0);
            const userClaimed = hasUserClaimed(task);

            return (
              <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${config.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
                      )}
                      {task.task_type === 'transport' && task.transport_seats && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {task.transport_seats} seats available
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {task.status === 'filled' ? (
                      <Badge className="bg-green-100 text-green-700">Filled</Badge>
                    ) : (
                      <Badge variant="outline">{slotsRemaining} needed</Badge>
                    )}
                  </div>
                </div>

                {/* Claimed by list */}
                {task.claimed_by?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Volunteers:</p>
                    <div className="flex flex-wrap gap-1">
                      {task.claimed_by.map((claim, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {claim.member_name}
                          {claim.for_child_name && ` (for ${claim.for_child_name})`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Claim button */}
                {task.status !== 'filled' && !userClaimed && currentMemberProfile && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    {childMembers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleClaimTask(task)}
                          disabled={claiming === task.id}
                        >
                          {claiming === task.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                          I'll help
                        </Button>
                        {childMembers.map(child => (
                          <Button
                            key={child.id}
                            size="sm"
                            variant="outline"
                            onClick={() => handleClaimTask(task, child.id)}
                            disabled={claiming === task.id}
                          >
                            For {child.first_name}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleClaimTask(task)}
                        disabled={claiming === task.id}
                      >
                        {claiming === task.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                        I'll volunteer
                      </Button>
                    )}
                  </div>
                )}

                {userClaimed && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <Badge className="bg-green-100 text-green-700">
                      <Check className="w-3 h-3 mr-1" />
                      You're signed up!
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Task Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Volunteer Task</DialogTitle>
            <DialogDescription>
              Create a volunteer opportunity for this event
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Task Type</Label>
              <Select value={formData.task_type} onValueChange={(v) => setFormData({...formData, task_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_TYPES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="w-4 h-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Task Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="e.g., Drive players to match"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Volunteers Needed</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.slots_needed}
                  onChange={(e) => setFormData({...formData, slots_needed: parseInt(e.target.value) || 1})}
                />
              </div>
              {formData.task_type === 'transport' && (
                <div>
                  <Label>Seats Available</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.transport_seats}
                    onChange={(e) => setFormData({...formData, transport_seats: parseInt(e.target.value) || 4})}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddTask} disabled={!formData.title}>
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}