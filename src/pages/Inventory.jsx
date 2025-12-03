import React, { useState, useEffect } from 'react';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent, GlassCardHeader } from '@/components/ui/GlassCard';
import { motion } from 'framer-motion';
import { format, parseISO, isPast } from 'date-fns';
import {
  Package, Plus, Search, Filter, AlertTriangle, CheckCircle,
  ArrowRightLeft, User, Calendar, MapPin, Loader2, Box,
  ChevronRight, Tag, DollarSign, History, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Inventory() {
  const { currentClub, isClubAdmin } = useClub();
  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'equipment',
    quantity: 1,
    unit_value: 0,
    location: '',
    condition: 'good',
    purchase_date: '',
    warranty_expires: ''
  });
  const [checkoutData, setCheckoutData] = useState({
    member_id: '',
    expected_return: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentClub?.id) {
      loadData();
    }
  }, [currentClub?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsData, membersData] = await Promise.all([
        base44.entities.InventoryItem.filter({ club_id: currentClub.id, is_active: true }),
        base44.entities.Member.filter({ club_id: currentClub.id, status: 'active' })
      ]);
      setItems(itemsData);
      setMembers(membersData);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const isAssigned = !!item.assigned_to?.member_id;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'available' && !isAssigned) ||
      (filterStatus === 'assigned' && isAssigned);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Items that need attention (overdue returns, items assigned to people who might be leaving)
  const alertItems = items.filter(item => {
    if (!item.assigned_to?.expected_return) return false;
    return isPast(parseISO(item.assigned_to.expected_return));
  });

  const handleSaveItem = async () => {
    setSaving(true);
    try {
      const itemData = {
        ...formData,
        club_id: currentClub.id,
        available_quantity: formData.quantity
      };

      if (selectedItem) {
        await base44.entities.InventoryItem.update(selectedItem.id, itemData);
      } else {
        await base44.entities.InventoryItem.create(itemData);
      }

      await loadData();
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedItem || !checkoutData.member_id) return;
    
    setSaving(true);
    try {
      const member = members.find(m => m.id === checkoutData.member_id);
      const checkoutEntry = {
        member_id: checkoutData.member_id,
        member_name: `${member?.first_name} ${member?.last_name}`,
        checked_out: new Date().toISOString(),
        notes: checkoutData.notes
      };

      await base44.entities.InventoryItem.update(selectedItem.id, {
        assigned_to: {
          member_id: checkoutData.member_id,
          member_name: `${member?.first_name} ${member?.last_name}`,
          assigned_date: format(new Date(), 'yyyy-MM-dd'),
          expected_return: checkoutData.expected_return
        },
        checkout_history: [...(selectedItem.checkout_history || []), checkoutEntry],
        available_quantity: (selectedItem.available_quantity || selectedItem.quantity) - 1
      });

      await loadData();
      setShowCheckoutModal(false);
      setCheckoutData({ member_id: '', expected_return: '', notes: '' });
    } catch (error) {
      console.error('Error checking out item:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCheckin = async (item) => {
    setSaving(true);
    try {
      const history = item.checkout_history || [];
      const lastCheckout = history[history.length - 1];
      if (lastCheckout) {
        lastCheckout.checked_in = new Date().toISOString();
      }

      await base44.entities.InventoryItem.update(item.id, {
        assigned_to: null,
        checkout_history: history,
        available_quantity: (item.available_quantity || 0) + 1
      });

      await loadData();
    } catch (error) {
      console.error('Error checking in item:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'equipment',
      quantity: 1,
      unit_value: 0,
      location: '',
      condition: 'good',
      purchase_date: '',
      warranty_expires: ''
    });
    setSelectedItem(null);
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      category: item.category || 'equipment',
      quantity: item.quantity || 1,
      unit_value: item.unit_value || 0,
      location: item.location || '',
      condition: item.condition || 'good',
      purchase_date: item.purchase_date || '',
      warranty_expires: item.warranty_expires || ''
    });
    setShowAddModal(true);
  };

  const openCheckoutModal = (item) => {
    setSelectedItem(item);
    setShowCheckoutModal(true);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      equipment: Package,
      clothing: Tag,
      medical: AlertTriangle,
      electronics: Box,
      trophies: DollarSign,
      training_aids: Box
    };
    return icons[category] || Package;
  };

  const getCategoryColor = (category) => {
    const colors = {
      equipment: 'bg-blue-100 text-blue-700',
      clothing: 'bg-purple-100 text-purple-700',
      medical: 'bg-red-100 text-red-700',
      electronics: 'bg-green-100 text-green-700',
      trophies: 'bg-amber-100 text-amber-700',
      training_aids: 'bg-pink-100 text-pink-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const getConditionColor = (condition) => {
    const colors = {
      new: 'bg-green-100 text-green-700',
      good: 'bg-blue-100 text-blue-700',
      fair: 'bg-amber-100 text-amber-700',
      poor: 'bg-orange-100 text-orange-700',
      needs_repair: 'bg-red-100 text-red-700'
    };
    return colors[condition] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 mt-1">{items.length} items tracked</p>
        </div>
        {isClubAdmin && (
          <Button 
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        )}
      </div>

      {/* Alert for overdue items */}
      {alertItems.length > 0 && (
        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Items Overdue for Return</AlertTitle>
          <AlertDescription className="text-amber-700">
            {alertItems.length} item(s) are past their expected return date. 
            <Button variant="link" className="p-0 h-auto text-amber-800 underline ml-1">
              View all
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <GlassCard className="mb-6">
        <GlassCardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-3">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="trophies">Trophies</SelectItem>
                  <SelectItem value="training_aids">Training Aids</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="assigned">Checked Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </GlassCardContent>
      </GlassCard>

      {/* Inventory Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <GlassCard>
          <GlassCardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Try adjusting your search' : 'Start tracking your club assets'}
            </p>
            {isClubAdmin && !searchTerm && (
              <Button onClick={() => { resetForm(); setShowAddModal(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Item
              </Button>
            )}
          </GlassCardContent>
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item, index) => {
            const CategoryIcon = getCategoryIcon(item.category);
            const isAssigned = !!item.assigned_to?.member_id;
            const isOverdue = item.assigned_to?.expected_return && 
              isPast(parseISO(item.assigned_to.expected_return));

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <GlassCard className={`h-full ${isOverdue ? 'ring-2 ring-amber-400' : ''}`}>
                  <GlassCardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {item.photo_url ? (
                          <img src={item.photo_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                        ) : (
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getCategoryColor(item.category)}`}>
                            <CategoryIcon className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          <Badge variant="secondary" className={`${getCategoryColor(item.category)} text-xs mt-1`}>
                            {item.category?.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={isAssigned ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}
                      >
                        {isAssigned ? 'Out' : 'Available'}
                      </Badge>
                    </div>

                    {item.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.description}</p>
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between text-gray-600">
                        <span className="flex items-center gap-1">
                          <Box className="w-3.5 h-3.5" />
                          Quantity
                        </span>
                        <span className="font-medium">{item.available_quantity || item.quantity} / {item.quantity}</span>
                      </div>
                      {item.location && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            Location
                          </span>
                          <span>{item.location}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-gray-600">
                        <span>Condition</span>
                        <Badge variant="secondary" className={`${getConditionColor(item.condition)} text-xs`}>
                          {item.condition?.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    {/* Assigned To */}
                    {isAssigned && (
                      <div className={`mt-4 p-3 rounded-xl ${isOverdue ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                              {item.assigned_to.member_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-gray-900">
                            {item.assigned_to.member_name}
                          </span>
                          {isOverdue && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs ml-auto">
                              Overdue
                            </Badge>
                          )}
                        </div>
                        {item.assigned_to.expected_return && (
                          <p className="text-xs text-gray-500 mt-1">
                            Due: {format(parseISO(item.assigned_to.expected_return), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      {isClubAdmin && (
                        <>
                          {isAssigned ? (
                            <Button 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => handleCheckin(item)}
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Check In
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => openCheckoutModal(item)}
                            >
                              <ArrowRightLeft className="w-4 h-4 mr-1" />
                              Check Out
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openEditModal(item)}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </GlassCardContent>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Item Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            <DialogDescription>
              {selectedItem ? 'Update item details' : 'Track a new asset for your club'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Set of Training Cones"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Additional details..."
                rows={2}
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
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="clothing">Clothing</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="trophies">Trophies</SelectItem>
                    <SelectItem value="training_aids">Training Aids</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="condition">Condition</Label>
                <Select value={formData.condition} onValueChange={(v) => setFormData({...formData, condition: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                    <SelectItem value="needs_repair">Needs Repair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                />
              </div>
              <div>
                <Label htmlFor="unit_value">Unit Value (€)</Label>
                <Input
                  id="unit_value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unit_value}
                  onChange={(e) => setFormData({...formData, unit_value: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Storage Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="e.g., Equipment Room, Shelf 3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveItem} 
              disabled={saving || !formData.name}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {selectedItem ? 'Update Item' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Modal */}
      <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check Out: {selectedItem?.name}</DialogTitle>
            <DialogDescription>
              Assign this item to a club member
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="member">Assign To *</Label>
              <Select value={checkoutData.member_id} onValueChange={(v) => setCheckoutData({...checkoutData, member_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="expected_return">Expected Return Date</Label>
              <Input
                id="expected_return"
                type="date"
                value={checkoutData.expected_return}
                onChange={(e) => setCheckoutData({...checkoutData, expected_return: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={checkoutData.notes}
                onChange={(e) => setCheckoutData({...checkoutData, notes: e.target.value})}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckoutModal(false)}>Cancel</Button>
            <Button 
              onClick={handleCheckout} 
              disabled={saving || !checkoutData.member_id}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Check Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}