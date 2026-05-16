import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';

type Message = any;
type Profile = any;

type SearchResult = Profile & {
  friendshipStatus: 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'rejected';
  requestId?: string;
};

type CallType = 'audio' | 'video';

type Conversation = {
  user: Profile;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isOnline: boolean;
};

type FriendRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
};

type MessagesSectionProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
};

export function MessagesSection({ searchQuery, onSearchQueryChange }: MessagesSectionProps) {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callType, setCallType] = useState<CallType | null>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'incoming' | 'in_call' | 'ended' | 'failed'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<RTCSessionDescriptionInit | null>(null);
  const [callChannel, setCallChannel] = useState<any>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const initializeChat = async () => {
      await loadFriendRequests();
      await fetchConversations();
      await searchUsers();
    };

    initializeChat();

    const subscription = supabase
      .channel('messages')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          if (selectedUser) {
            fetchMessages(selectedUser.id);
          }
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, selectedUser]);

  useEffect(() => {
    if (!user) return;
    searchUsers();
  }, [searchQuery, user, friendRequests]);

  useEffect(() => {
    if (messages.length === 0) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const markMessagesAsRead = useCallback(async (senderId: string) => {
    if (!user) return;

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', senderId)
      .eq('receiver_id', user.id)
      .eq('read', false);
  }, [user]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id);
      markMessagesAsRead(selectedUser.id);
      setIsMobileListVisible(false);
    }
  }, [selectedUser, markMessagesAsRead]);

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

  const fetchConversations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (id, username, full_name),
        receiver:receiver_id (id, username, full_name)
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Conversations fetch error:', error);
      return;
    }

    const conversationMap = new Map<string, Conversation>();

    (data || []).forEach((message: any) => {
      const otherUser = message.sender_id === user.id ? message.receiver : message.sender;
      const otherId = otherUser?.id;
      if (!otherId) return;

      if (!conversationMap.has(otherId)) {
        const isOnline = new Date(message.created_at).getTime() > Date.now() - 5 * 60 * 1000;
        const unreadCount = (data || []).filter(
          (msg: any) => msg.sender_id === otherId && msg.receiver_id === user.id && !msg.read
        ).length;

        conversationMap.set(otherId, {
          user: otherUser,
          lastMessage: message.content,
          lastMessageAt: message.created_at,
          unreadCount,
          isOnline,
        });
      }
    });

    const sortedConversations = Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    setConversations(sortedConversations);
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

  const getCallChannelName = (userId: string, otherUserId: string) => {
    return `call-${[userId, otherUserId].sort().join('-')}`;
  };

  const sendCallSignal = async (channel: any, payload: any) => {
    if (!channel) return;
    await channel.send({
      type: 'broadcast',
      event: 'call-signal',
      payload,
    });
  };

  const setupPeerConnection = (channel: any) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendCallSignal(channel, {
          type: 'candidate',
          from: user?.id,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      event.streams[0] && setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallStatus('in_call');
      }

      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCall();
      }
    };

    setPeerConnection(pc);
    return pc;
  };

  const cleanupCallResources = async () => {
    peerConnection?.close();
    callChannel?.unsubscribe();
    localStream?.getTracks().forEach((track) => track.stop());
    remoteStream?.getTracks().forEach((track) => track.stop());
    setPeerConnection(null);
    setCallChannel(null);
    setLocalStream(null);
    setRemoteStream(null);
    setIncomingOffer(null);
    setCallType(null);
    setCallStatus('idle');
    setIsMuted(false);
  };

  const acceptCall = async () => {
    if (!incomingOffer || !selectedUser || !user) return;
    const channelName = getCallChannelName(user.id, selectedUser.id);
    const channel = callChannel || supabase.channel(channelName);

    if (!callChannel) {
      channel.on('broadcast', { event: 'call-signal' }, ({ payload }: any) => {
        handleCallSignal(payload);
      }).subscribe();
      setCallChannel(channel);
    }

    setCallModalOpen(true);
    setCallStatus('connecting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: callType === 'video', audio: true });
      setLocalStream(stream);
      const pc = setupPeerConnection(channel);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendCallSignal(channel, {
        type: 'answer',
        from: user.id,
        answer,
      });
    } catch (error) {
      console.error('Accept call failed:', error);
      setCallStatus('failed');
    }
  };

  const rejectCall = async () => {
    if (!user || !selectedUser) return;
    const channelName = getCallChannelName(user.id, selectedUser.id);
    const channel = callChannel || supabase.channel(channelName);
    if (!callChannel) {
      channel.on('broadcast', { event: 'call-signal' }, ({ payload }: any) => {
        handleCallSignal(payload);
      }).subscribe();
      setCallChannel(channel);
    }
    await sendCallSignal(channel, {
      type: 'hangup',
      from: user.id,
    });
    cleanupCallResources();
  };

  const handleCallSignal = async (payload: any) => {
    if (!payload || payload.from === user?.id) return;

    if (payload.type === 'offer') {
      if (!selectedUser || selectedUser.id !== payload.from) {
        return;
      }
      setCallModalOpen(true);
      setCallType(payload.callType);
      setIncomingOffer(payload.offer);
      setCallStatus('incoming');
      return;
    }

    if (payload.type === 'answer' && peerConnection) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.answer));
      return;
    }

    if (payload.type === 'candidate' && peerConnection) {
      try {
        await peerConnection.addIceCandidate(payload.candidate);
      } catch (error) {
        console.error('Add ICE candidate failed:', error);
      }
      return;
    }

    if (payload.type === 'hangup') {
      cleanupCallResources();
      return;
    }
  };

  const searchUsers = async () => {
    if (!user) return;

    setIsSearching(true);
    const query = searchQuery.trim();

    let profilesQuery = supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .limit(50);

    if (query.length >= 1) {
      profilesQuery = profilesQuery.or(
        `username.ilike.%${query}%,full_name.ilike.%${query}%`
      );
    }

    const { data: profiles, error: profilesError } = await profilesQuery;

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

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => undefined);
    }

    return () => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    };
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => undefined);
    }

    return () => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };
  }, [remoteStream]);

  useEffect(() => {
    return () => {
      cleanupCallResources();
    };
  }, []);

  const toggleAudioMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted((prev) => !prev);
    }
  };

  const endCall = async () => {
    if (callChannel) {
      await sendCallSignal(callChannel, {
        type: 'hangup',
        from: user?.id,
      });
    }
    await cleanupCallResources();
  };

  const startCall = async (type: CallType) => {
    if (!selectedUser || !canChat || !user) return;

    const channelName = getCallChannelName(user.id, selectedUser.id);
    let channel = callChannel;

    if (!channel) {
      channel = supabase.channel(channelName);
      channel.on('broadcast', { event: 'call-signal' }, ({ payload }: any) => {
        handleCallSignal(payload);
      });
      await channel.subscribe();
      setCallChannel(channel);
    }

    setCallModalOpen(true);
    setCallType(type);
    setCallStatus('connecting');
    setIsMuted(false);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCallStatus('failed');
      return;
    }

    try {
      const constraints: MediaStreamConstraints =
        type === 'video'
          ? { video: true, audio: true }
          : { audio: true, video: false };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      const pc = setupPeerConnection(channel);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await sendCallSignal(channel, {
        type: 'offer',
        from: user.id,
        callType: type,
        offer: pc.localDescription,
      });
    } catch (error) {
      console.error('Call start failed:', error);
      setCallStatus('failed');
    }
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
    searchUsers();
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
    searchUsers();
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

  const formatMessageDate = (date: string) => {
    const messageDate = new Date(date);
    if (isToday(messageDate)) return format(messageDate, 'h:mm a');
    if (isYesterday(messageDate)) return 'Yesterday';
    return format(messageDate, 'MMM d');
  };

  const incomingRequests = friendRequests.filter(
    (request) => request.status === 'pending' && request.receiver_id === user?.id
  );

  const selectedFriendship = selectedUser ? getFriendshipInfo(selectedUser.id) : null;
  const canChat = selectedFriendship?.status === 'accepted';

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.user.id === selectedUser?.id) || null,
    [conversations, selectedUser]
  );

  const selectedUserStatus = selectedConversation
    ? selectedConversation.isOnline
      ? 'Online'
      : `Last active ${formatDistanceToNow(new Date(selectedConversation.lastMessageAt), { addSuffix: true })}`
    : canChat
    ? 'Friend'
    : 'Friend request needed';

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
                <div>
                  {isSearching ? (
                    <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Searching users...</div>
                  ) : searchQuery.trim().length > 0 ? (
                    searchResults.length > 0 ? (
                      searchResults.map(renderSearchResult)
                    ) : (
                      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                        No users found. Try a different name or username.
                      </div>
                    )
                  ) : conversations.length > 0 ? (
                    conversations.map((conversation) => (
                      <button
                        key={conversation.user.id}
                        onClick={() => setSelectedUser(conversation.user)}
                        className={`w-full text-left p-4 border-b border-slate-200 dark:border-slate-700 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 ${
                          selectedUser?.id === conversation.user.id ? 'bg-slate-100 dark:bg-slate-700' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                              {(conversation.user.full_name?.[0] || conversation.user.username[0]).toUpperCase()}
                            </div>
                            {conversation.isOnline && (
                              <span className="absolute bottom-0 right-0 block w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 bg-green-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-slate-900 dark:text-white truncate">
                                {conversation.user.full_name || conversation.user.username}
                              </p>
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                {format(new Date(conversation.lastMessageAt), 'h:mm a')}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1">
                              {conversation.lastMessage || 'No messages yet'}
                            </p>
                          </div>
                          {conversation.unreadCount > 0 && (
                            <span className="flex items-center justify-center min-w-[24px] h-6 rounded-full bg-indigo-600 text-white text-xs font-semibold">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                      No conversations yet. Search for friends or send a message to start chatting.
                    </div>
                  )}
                </div>
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
                      {selectedUserStatus}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <HoverScale>
                    <button
                      onClick={() => startCall('audio')}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                    >
                      <Phone className="w-5 h-5" />
                    </button>
                  </HoverScale>
                  <HoverScale>
                    <button
                      onClick={() => startCall('video')}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                    >
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

              <AnimatePresence>
                {callModalOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                  >
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
                    >
                      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 font-semibold">
                              {callType === 'video' ? 'Video Call' : 'Audio Call'}
                            </p>
                            <p className="text-xl font-semibold text-slate-900 dark:text-white">
                              Calling {selectedUser.full_name || selectedUser.username}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                              {callStatus === 'connecting' && 'Connecting...'}
                              {callStatus === 'incoming' && 'Incoming call'}
                              {callStatus === 'in_call' && 'In call'}
                              {callStatus === 'ended' && 'Call ended'}
                              {callStatus === 'failed' && 'Unable to connect. Please check your microphone and camera permissions.'}
                            </p>
                          </div>
                          <button
                            onClick={() => void endCall()}
                            className="rounded-full bg-red-600 text-white p-3 hover:bg-red-700 transition-colors"
                          >
                            End
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 p-6">
                        <div className="rounded-3xl bg-slate-100 dark:bg-slate-800 p-4 flex items-center justify-center relative">
                          {callType === 'video' ? (
                            <div className="relative w-full h-full">
                              <video
                                ref={remoteVideoRef}
                                className="w-full h-full rounded-3xl bg-black"
                                autoPlay
                                playsInline
                              />
                              {localStream && (
                                <div className="absolute bottom-4 right-4 w-36 h-28 rounded-3xl overflow-hidden border-2 border-white shadow-xl">
                                  <video
                                    ref={localVideoRef}
                                    className="w-full h-full object-cover"
                                    autoPlay
                                    muted
                                    playsInline
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-3 text-slate-700 dark:text-slate-200">
                              <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-white text-3xl">
                                {selectedUser.full_name?.[0] || selectedUser.username[0]}
                              </div>
                              <p className="text-lg font-semibold">Audio call connected</p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-4">
                          {callStatus === 'incoming' ? (
                            <div className="rounded-3xl bg-slate-100 dark:bg-slate-800 p-4">
                              <p className="text-sm text-slate-500 dark:text-slate-400">Incoming call</p>
                              <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                  onClick={() => void acceptCall()}
                                  className="px-4 py-3 rounded-2xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => void rejectCall()}
                                  className="px-4 py-3 rounded-2xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="rounded-3xl bg-slate-100 dark:bg-slate-800 p-4">
                                <p className="text-sm text-slate-500 dark:text-slate-400">Call controls</p>
                                <div className="mt-4 flex flex-wrap gap-3">
                                  <button
                                    onClick={toggleAudioMute}
                                    className={`px-4 py-3 rounded-2xl font-semibold transition-colors ${isMuted ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                  >
                                    {isMuted ? 'Unmute' : 'Mute'}
                                  </button>
                                  {callType === 'video' && (
                                    <button
                                      onClick={() => {
                                        setCallType('audio');
                                      }}
                                      className="px-4 py-3 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                    >
                                      Switch to audio
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="rounded-3xl bg-slate-100 dark:bg-slate-800 p-4">
                                <p className="text-sm text-slate-500 dark:text-slate-400">Tips</p>
                                <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                  <li>Use a headset for better audio quality.</li>
                                  <li>Allow browser permissions if prompted.</li>
                                  <li>Switch to audio-only to save bandwidth.</li>
                                </ul>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

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
