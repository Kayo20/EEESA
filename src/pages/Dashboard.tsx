import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Users, 
  Calendar, 
  BookOpen, 
  MessageSquare, 
  Trophy,
  Bell,
  Search,
  Menu,
  LogOut,
  Sun,
  Moon,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { HoverScale } from '@/components/animations/HoverScale';
import { supabase } from '@/lib/supabase/client';

// Import sections
import { FeedSection } from '@/sections/FeedSection';
import { StudyGroupsSection } from '@/sections/StudyGroupsSection';
import { EventsSection } from '@/sections/EventsSection';
import { ResourcesSection } from '@/sections/ResourcesSection';
import { MessagesSection } from '@/sections/MessagesSection';
import { GamificationSection } from '@/sections/GamificationSection';

type Section = 'feed' | 'groups' | 'events' | 'resources' | 'messages' | 'gamification';

const navItems = [
  { id: 'feed' as Section, label: 'Feed', icon: Home },
  { id: 'groups' as Section, label: 'Study Groups', icon: Users },
  { id: 'events' as Section, label: 'Events', icon: Calendar },
  { id: 'resources' as Section, label: 'Resources', icon: BookOpen },
  { id: 'messages' as Section, label: 'Messages', icon: MessageSquare },
  { id: 'gamification' as Section, label: 'Achievements', icon: Trophy },
];

export function Dashboard() {
  const [activeSection, setActiveSection] = useState<Section>('feed');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const { profile, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // Fetch unread messages count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!profile?.id) {
        setUnreadCount(0);
        return;
      }

      const { data: requests, error: requestError } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`);

      if (requestError) {
        console.error('Friend requests fetch error:', requestError);
        setUnreadCount(0);
        return;
      }

      const acceptedFriendIds = (requests || [])
        .filter((request: any) => request.status === 'accepted')
        .map((request: any) => (request.sender_id === profile.id ? request.receiver_id : request.sender_id));

      if (acceptedFriendIds.length === 0) {
        setUnreadCount(0);
        return;
      }

      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', profile.id)
        .in('sender_id', acceptedFriendIds)
        .eq('read', false);
      
      setUnreadCount(count || 0);
    };

    if (profile?.id) {
      fetchUnreadCount();
      
      // Subscribe to new messages
      const subscription = supabase
        .channel('messages')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${profile.id}` },
          () => {
            fetchUnreadCount();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [profile?.id]);

  const renderSection = () => {
    switch (activeSection) {
      case 'feed':
        return <FeedSection />;
      case 'groups':
        return <StudyGroupsSection />;
      case 'events':
        return <EventsSection />;
      case 'resources':
        return <ResourcesSection />;
      case 'messages':
        return (
          <MessagesSection
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
        );
      case 'gamification':
        return <GamificationSection />;
      default:
        return <FeedSection />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-500">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`fixed left-0 top-0 h-full bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-50 transition-all duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ width: '280px' }}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              StudentConnect
            </span>
          </motion.div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === item.id
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {item.id === 'messages' && unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full"
                >
                  {unreadCount}
                </motion.span>
              )}
            </motion.button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <motion.button
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="text-sm">{isDark ? 'Light' : 'Dark'}</span>
            </motion.button>
          </div>
          
          <motion.button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </motion.button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="lg:ml-[280px] min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
            <div className="flex items-center gap-4">
              <motion.button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Menu className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </motion.button>
              
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeSection === 'messages' ? 'Search users to message...' : 'Search...'}
                  className="pl-10 pr-4 py-2 w-64 rounded-xl bg-slate-100 dark:bg-slate-700 border-none text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <HoverScale>
                <button className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </button>
              </HoverScale>
              
              <motion.div 
                className="flex items-center gap-3"
                whileHover={{ scale: 1.02 }}
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {profile?.full_name || profile?.username}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {profile?.points || 0} points
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {(profile?.full_name?.[0] || profile?.username?.[0] || 'U').toUpperCase()}
                </div>
              </motion.div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
