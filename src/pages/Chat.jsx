import React, { useState, useEffect, useRef } from 'react';
import { useClub } from '@/components/ClubContext';
import { base44 } from '@/api/base44Client';
import { GlassCard, GlassCardContent } from '@/components/ui/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isToday, isYesterday, differenceInMinutes } from 'date-fns';
import {
  MessageCircle, Send, Plus, Search, Users, Check, CheckCheck,
  Image, Paperclip, Smile, MoreVertical, Pin, Bell, BellOff, ChevronLeft, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import SafeChatIndicator from '@/components/chat/SafeChatIndicator';

export default function Chat() {
  const { currentClub, user, isCoach, familyMembers, childMembers } = useClub();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showReadReceipts, setShowReadReceipts] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (currentClub?.id) {
      loadConversations();
    }
  }, [currentClub?.id]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const convos = await base44.entities.ChatConversation.filter({ 
        club_id: currentClub.id,
        is_active: true
      });
      setConversations(convos);
      if (convos.length > 0 && !selectedConversation) {
        setSelectedConversation(convos[0]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const msgs = await base44.entities.ChatMessage.filter({
        conversation_id: conversationId
      });
      setMessages(msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
      
      // Mark messages as read
      await markMessagesAsRead(conversationId);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const markMessagesAsRead = async (conversationId) => {
    // In a real app, this would update read receipts
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSendingMessage(true);
    try {
      const messageData = {
        conversation_id: selectedConversation.id,
        club_id: currentClub.id,
        sender_id: user.id,
        sender_email: user.email,
        sender_name: user.full_name,
        content: newMessage,
        message_type: 'text',
        read_by: [{
          user_id: user.id,
          user_email: user.email,
          name: user.full_name,
          read_at: new Date().toISOString()
        }]
      };

      await base44.entities.ChatMessage.create(messageData);
      
      // Update conversation's last message
      await base44.entities.ChatConversation.update(selectedConversation.id, {
        last_message: {
          content: newMessage,
          sender_name: user.full_name,
          sent_at: new Date().toISOString()
        }
      });

      setNewMessage('');
      await loadMessages(selectedConversation.id);
      await loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const formatMessageTime = (dateStr) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  const formatConversationTime = (dateStr) => {
    if (!dateStr) return '';
    const date = parseISO(dateStr);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  const shouldShowAvatar = (messages, index) => {
    if (index === 0) return true;
    const prevMsg = messages[index - 1];
    const currMsg = messages[index];
    if (prevMsg.sender_email !== currMsg.sender_email) return true;
    if (differenceInMinutes(parseISO(currMsg.created_date), parseISO(prevMsg.created_date)) > 5) return true;
    return false;
  };

  const getConversationIcon = (conversation) => {
    if (conversation.type === 'team') return Users;
    return MessageCircle;
  };

  const openReadReceipts = (message) => {
    setSelectedMessage(message);
    setShowReadReceipts(true);
  };

  const createNewConversation = async () => {
    try {
      const newConvo = await base44.entities.ChatConversation.create({
        club_id: currentClub.id,
        type: 'group',
        name: 'New Conversation',
        participants: [{
          user_id: user.id,
          user_email: user.email,
          name: user.full_name,
          role: 'admin',
          joined_at: new Date().toISOString(),
          is_admin: true
        }],
        is_active: true
      });
      await loadConversations();
      setSelectedConversation(newConvo);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  // Two-Deep Rule: Check if attempting to DM a child, add guardians
  const startSafeDirectMessage = async (targetMember) => {
    if (targetMember.member_category === 'child' && targetMember.managed_by?.length > 0) {
      // Get guardians
      const guardians = await Promise.all(
        targetMember.managed_by.map(async (guardianId) => {
          const guardianMembers = await base44.entities.Member.filter({ user_id: guardianId });
          return guardianMembers[0];
        })
      );

      // Create conversation with child AND guardians (Two-Deep Rule)
      const participants = [
        {
          user_id: user.id,
          user_email: user.email,
          name: user.full_name,
          role: isCoach ? 'coach' : 'member',
          joined_at: new Date().toISOString(),
          is_admin: isCoach
        },
        ...guardians.filter(Boolean).map(g => ({
          user_id: g.user_id,
          user_email: g.email,
          name: `${g.first_name} ${g.last_name}`,
          role: 'guardian',
          joined_at: new Date().toISOString(),
          is_admin: false
        }))
      ];

      const newConvo = await base44.entities.ChatConversation.create({
        club_id: currentClub.id,
        type: 'direct',
        name: `${targetMember.first_name}'s Chat (Safeguarded)`,
        participants,
        settings: { safeguarded: true, child_member_id: targetMember.id },
        is_active: true
      });

      await loadConversations();
      setSelectedConversation(newConvo);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] lg:h-screen flex">
      {/* Conversations List */}
      <div className={`w-full lg:w-80 bg-white border-r border-gray-200 flex flex-col ${selectedConversation && 'hidden lg:flex'}`}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Messages</h2>
            <Button variant="ghost" size="icon" onClick={() => createNewConversation()}>
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search conversations..." className="pl-10" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No conversations yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {conversations.map((conversation) => {
                const Icon = getConversationIcon(conversation);
                const isSelected = selectedConversation?.id === conversation.id;
                return (
                  <motion.div
                    key={conversation.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`p-4 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <Icon className={`w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 truncate">{conversation.name}</h3>
                          <span className="text-xs text-gray-500">
                            {formatConversationTime(conversation.last_message?.sent_at)}
                          </span>
                        </div>
                        {conversation.last_message && (
                          <p className="text-sm text-gray-500 truncate mt-0.5">
                            <span className="font-medium">{conversation.last_message.sender_name?.split(' ')[0]}:</span>{' '}
                            {conversation.last_message.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSelectedConversation(null)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{selectedConversation.name}</h3>
                <SafeChatIndicator 
                  conversation={selectedConversation} 
                  familyMembers={familyMembers}
                />
              </div>
              <p className="text-sm text-gray-500">
                {selectedConversation.participants?.length || 0} members
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Pin className="w-4 h-4 mr-2" />
                  Pin Conversation
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <BellOff className="w-4 h-4 mr-2" />
                  Mute Notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((message, index) => {
                const isOwn = message.sender_email === user.email;
                const showAvatar = shouldShowAvatar(messages, index);

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-end gap-2 max-w-[80%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                      {!isOwn && showAvatar ? (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                            {message.sender_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      ) : !isOwn ? (
                        <div className="w-8" />
                      ) : null}
                      
                      <div className={`group ${isOwn ? 'items-end' : 'items-start'}`}>
                        {showAvatar && !isOwn && (
                          <p className="text-xs text-gray-500 mb-1 ml-1">{message.sender_name}</p>
                        )}
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            isOwn 
                              ? 'bg-blue-600 text-white rounded-br-md' 
                              : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-xs text-gray-400">
                            {formatMessageTime(message.created_date)}
                          </span>
                          {isOwn && isCoach && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => openReadReceipts(message)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    {message.read_by?.length > 1 ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {message.read_by?.length || 1} read
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              <Button variant="ghost" size="icon" className="text-gray-400">
                <Paperclip className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-400">
                <Image className="w-5 h-5" />
              </Button>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              />
              <Button variant="ghost" size="icon" className="text-gray-400">
                <Smile className="w-5 h-5" />
              </Button>
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendingMessage}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {sendingMessage ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a conversation</h3>
            <p className="text-gray-500">Choose from your existing conversations or start a new one</p>
          </div>
        </div>
      )}

      {/* Read Receipts Modal */}
      <Dialog open={showReadReceipts} onOpenChange={setShowReadReceipts}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Read by</DialogTitle>
            <DialogDescription>
              See who has read this message
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {selectedMessage?.read_by?.map((reader, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs">
                      {reader.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-gray-900">{reader.name}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {reader.read_at && format(parseISO(reader.read_at), 'MMM d, h:mm a')}
                </span>
              </div>
            ))}
            {(!selectedMessage?.read_by || selectedMessage.read_by.length === 0) && (
              <p className="text-center text-gray-500 py-4">No read receipts yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}