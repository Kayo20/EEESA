import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Send,
  MoreVertical,
  Phone,
  Video,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { HoverScale } from '@/components/animations/HoverScale';
import { format, isToday, isYesterday } from 'date-fns';

type Message = any;
type Profile = any;

type Conversation = {
  user: Profile;
  lastMessage: Message;
  unreadCount: number;
};

type SearchResult = Profile & {
  friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'rejected';
  requestId?: string;
};

type MessagesSectionProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
};

export function MessagesSection({ searchQuery, onSearchQueryChange }: MessagesSectionProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    loadFriendRequests();
    fetchConversations();

    const subscription = supabase
      .channel('messages')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          fetchConversations();
          if (selectedUser) {
            fetchMessages(selectedUser.id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, selectedUser]);

  useEffect(() => {
    if (!user) return;
    if (searchQuery.trim().length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, user, friendRequests]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id);
      markMessagesAsRead(selectedUser.id);
      setIsMobileListVisible(false);
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadFriendRequests = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (error) {
      console.error('Friend requests load error:', error);
      return;
    }

    setFriendRequests(data || []);
  };

  const getFriendshipInfo = (otherUserId: string) => {
    if (!user) return { status: 'none' as const, request: null };

    const request = friendRequests.find(
      (row) =>
        (row.sender_id === user.id && row.receiver_id === otherUserId) ||
        (row.receiver_id === user.id && row.sender_id === otherUserId)
    );

    if (!request) {
      return { status: 'none' as const, request: null };
    }

    if (request.status === 'accepted') {
      return { status: 'accepted' as const, request };
    }

    if (request.status === 'pending') {
      return {
        status: request.sender_id === user.id ? 'pending_sent' as const : 'pending_received' as const,
        request,
      };
    }

    return { status: 'rejected' as const, request };
  };

  const isFriend = (otherUserId: string) => getFriendshipInfo(otherUserId).status === 'accepted';

  const searchUsers = async () => {
    if (!user) return;

    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
      .neq('id', user.id)
      .limit(20);

    if (profilesError || !profiles) {
      console.error('User search error:', profilesError);
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const enriched = profiles.map((profileItem: any) => {
      const friendship = getFriendshipInfo(profileItem.id);
      return {
        ...profileItem,
        friendshipStatus: friendship.status,
        requestId: friendship.request?.id,
      };
    });

    setSearchResults(enriched);
    setIsSearching(false);
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!user) return;
    const { error } = await supabase.from('friend_requests').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      status: 'pending',
    });

    if (error) {
      console.error('Send friend request error:', error);
      return;
    }

    await loadFriendRequests();
    if (searchQuery.trim().length >= 2) {
      searchUsers();
    }
  };

  const respondToFriendRequest = async (requestId: string, accept: boolean) => {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: accept ? 'accepted' : 'rejected' })
      .eq('id', requestId);

    if (error) {
      console.error('Respond to friend request error:', error);
      return;
    }

    await loadFriendRequests();
    if (searchQuery.trim().length >= 2) {
      searchUsers();
    }
  };

  const fetchConversations = async () => {
    if (!user) return;

    const { data: allMessages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error || !allMessages) return;

    const conversationMap = new Map<string, { lastMessage: Message; unreadCount: number }>();

    allMessages.forEach((message: any) => {
      const partnerId = message.sender_id === user.id ? message.receiver_id : message.sender_id;

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          lastMessage: message,
          unreadCount: message.receiver_id === user.id && !message.read ? 1 : 0,
        });
      } else if (message.receiver_id === user.id && !message.read) {
        const conv = conversationMap.get(partnerId)!;
        conv.unreadCount++;
      }
    });

    const userIds = Array.from(conversationMap.keys());
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);

    const conversationsList: Conversation[] = [];

    conversationMap.forEach((data, userId) => {
      const userProfile = profiles?.find((p: any) => p.id === userId);
      if (userProfile) {
        conversationsList.push({
          user: userProfile,
          lastMessage: data.lastMessage,
          unreadCount: data.unreadCount,
        });
      }
    });

    setConversations(conversationsList.sort((a, b) =>
      new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    ));
  };

  const fetchMessages = async (otherUserId: string) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const markMessagesAsRead = async (senderId: string) => {
    if (!user) return;

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', senderId)
      .eq('receiver_id', user.id)
      .eq('read', false);

    fetchConversations();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedUser) return;

    if (!isFriend(selectedUser.id)) return;

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: selectedUser.id,
      content: newMessage,
    });

    if (!error) {
      setNewMessage('');
      fetchMessages(selectedUser.id);
      await supabase.rpc('increment_points', { user_id: user.id, points: 3 });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageDate = (date: string) => {
    const messageDate = new Date(date);
    if (isToday(messageDate)) return format(messageDate, 'h:mm a');
    if (isYesterday(messageDate)) return 'Yesterday';
    return format(messageDate, 'MMM d');
  };

  const searchResultsEmpty = searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0;
  const incomingRequests = friendRequests.filter(
    (request) => request.status === 'pending' && request.receiver_id === user?.id
  );

  const selectedFriendship = selectedUser ? getFriendshipInfo(selectedUser.id) : null;
  const canChat = selectedFriendship?.status === 'accepted';

  const filteredConversations = conversations.filter((conv) =>
    conv.user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderConversation = (conversation: Conversation) => (
    <motion.button
      key={conversation.user.id}
      onClick={() => setSelectedUser(conversation.user)}
      className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 ${
        selectedUser?.id === conversation.user.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
      }`}
      whileHover={{ x: 4 }}
    >
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
          {(conversation.user.full_name?.[0] || conversation.user.username[0]).toUpperCase()}
        </div>
        {conversation.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {conversation.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="font-semibold text-slate-900 dark:text-white truncate">
          {conversation.user.full_name || conversation.user.username}
        </p>
        <p className={`text-sm truncate ${
          conversation.unreadCount > 0
            ? 'text-slate-900 dark:text-white font-medium'
            : 'text-slate-500 dark:text-slate-400'
        }`}>
          {conversation.lastMessage.sender_id === user?.id ? 'You: ' : ''}
          {conversation.lastMessage.content}
        </p>
      </div>
      <span className="text-xs text-slate-400">
        {formatMessageDate(conversation.lastMessage.created_at)}
      </span>
    </motion.button>
  );

  const renderSearchResult = (result: SearchResult) => {
    const isAccepted = result.friendshipStatus === 'accepted';
    const isPendingSent = result.friendshipStatus === 'pending_sent';
    const isPendingReceived = result.friendshipStatus === 'pending_received';

    return (
      <div key={result.id} className="w-full p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900 dark:text-white truncate">
              {result.full_name || result.username}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              @{result.username}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAccepted && (
              <button
                onClick={() => setSelectedUser(result)}
                className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Chat
              </button>
            )}
            {isPendingSent && (
              <span className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm">
                Request sent
              </span>
            )}
            {isPendingReceived && (
              <span className="px-3 py-2 rounded-xl bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-sm">
                Pending your approval
              </span>
            )}
            {result.friendshipStatus === 'none' && (
              <button
                onClick={() => sendFriendRequest(result.id)}
                className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Add friend
              </button>
            )}
            {result.friendshipStatus === 'rejected' && (
              <button
                onClick={() => sendFriendRequest(result.id)}
                className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Re-send request
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-200px)] min-h-[500px] bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex h-full">
        <AnimatePresence>
          {(isMobileListVisible || window.innerWidth >= 768) && (
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className={`w-full md:w-96 border-r border-slate-200 dark:border-slate-700 flex flex-col ${
                !isMobileListVisible && 'hidden md:flex'
              }`}
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    placeholder="Search users by name or username..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border-none text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {incomingRequests.length > 0 && (
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                    Incoming friend requests
                  </p>
                  <div className="space-y-3">
                    {incomingRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            Friend request from {request.sender_id}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Accept to unlock messaging with this person.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => respondToFriendRequest(request.id, true)}
                            className="px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => respondToFriendRequest(request.id, false)}
                            className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto">
                {searchQuery.trim().length >= 2 ? (
                  <div>
                    {isSearching ? (
                      <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Searching users...</div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map(renderSearchResult)
                    ) : (
                      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                        {searchResultsEmpty
                          ? 'No users found. Try a different name or username.'
                          : 'Type at least 2 characters to search.'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {filteredConversations.map(renderConversation)}
                    {filteredConversations.length === 0 && (
                      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                        No conversations yet. Search for friends above to send a request.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`flex-1 flex flex-col ${isMobileListVisible && 'hidden md:flex'}`}>
          {selectedUser ? (
            <>
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.button
                    onClick={() => setIsMobileListVisible(true)}
                    className="md:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </motion.button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {(selectedUser.full_name?.[0] || selectedUser.username[0]).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {selectedUser.full_name || selectedUser.username}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {canChat ? 'Friend' : 'Friend request needed'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <HoverScale>
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                      <Phone className="w-5 h-5" />
                    </button>
                  </HoverScale>
                  <HoverScale>
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                      <Video className="w-5 h-5" />
                    </button>
                  </HoverScale>
                  <HoverScale>
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </HoverScale>
                </div>
              </div>

              {!canChat && (
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <p className="text-slate-900 dark:text-white font-semibold mb-2">
                    Chat is locked until you become friends.
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Send or respond to a friend request to unlock direct messages.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedFriendship?.status === 'none' && (
                      <button
                        onClick={() => sendFriendRequest(selectedUser.id)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        Send friend request
                      </button>
                    )}
                    {selectedFriendship?.status === 'pending_sent' && (
                      <span className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm">
                        Friend request sent. Waiting for acceptance.
                      </span>
                    )}
                    {selectedFriendship?.status === 'pending_received' && selectedFriendship.request && (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => respondToFriendRequest(selectedFriendship.request.id, true)}
                          className="px-4 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => respondToFriendRequest(selectedFriendship.request.id, false)}
                          className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {selectedFriendship?.status === 'rejected' && (
                      <button
                        onClick={() => sendFriendRequest(selectedUser.id)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        Re-send request
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => {
                  const isSender = message.sender_id === user?.id;
                  const showDate = index === 0 ||
                    formatMessageDate(messages[index - 1].created_at) !== formatMessageDate(message.created_at);

                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="flex justify-center my-4">
                          <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                            {formatMessageDate(message.created_at)}
                          </span>
                        </div>
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                            isSender
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-md'
                          }`}
                        >
                          <p>{message.content}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1 ${
                            isSender ? 'text-white/70' : 'text-slate-400'
                          }`}>
                            <span className="text-xs">
                              {format(new Date(message.created_at), 'h:mm a')}
                            </span>
                            {isSender && (
                              message.read ? (
                                <CheckCheck className="w-3 h-3" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <HoverScale>
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                      <Paperclip className="w-5 h-5" />
                    </button>
                  </HoverScale>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder={canChat ? 'Type a message...' : 'Send a friend request to start chatting'}
                    disabled={!canChat}
                    className="flex-1 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border-none text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <HoverScale>
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                      <Smile className="w-5 h-5" />
                    </button>
                  </HoverScale>
                  <motion.button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || !canChat}
                    className="p-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Send className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <Send className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  Select a conversation or search for friends
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Use the search bar to find users and send friend requests.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
