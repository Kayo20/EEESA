import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Search, 
  BookOpen,
  UserPlus,
  UserCheck,
  MoreVertical,
  X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { FadeIn } from '@/components/animations/FadeIn';
import { StaggerContainer, StaggerItem } from '@/components/animations/StaggerContainer';
import { HoverScale, HoverLift } from '@/components/animations/HoverScale';
import { ScaleIn } from '@/components/animations/ScaleIn';
import { ElasticButton } from '@/components/animations/MorphingButton';

type StudyGroup = any;

export function StudyGroupsSection() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    subject: '',
    max_members: 20,
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    const { data: groupsData, error: groupsError } = await supabase
      .from('study_groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (groupsError) {
      console.error('Error fetching groups:', groupsError);
      setIsLoading(false);
      return;
    }

    // Fetch member counts and membership status for each group
    const groupsWithDetails = await Promise.all(
      (groupsData || []).map(async (group: any) => {
        const { count: memberCount } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id);

        const { data: membership } = await supabase
          .from('group_members')
          .select('*')
          .eq('group_id', group.id)
          .eq('user_id', user?.id)
          .single();

        return {
          ...group,
          member_count: memberCount || 0,
          is_member: !!membership,
        };
      })
    );

    setGroups(groupsWithDetails);
    setIsLoading(false);
  };

  const createGroup = async () => {
    if (!user || !newGroup.name.trim() || !newGroup.subject.trim()) return;

    const { data: group, error } = await supabase
      .from('study_groups')
      .insert({
        name: newGroup.name,
        description: newGroup.description,
        subject: newGroup.subject,
        max_members: newGroup.max_members,
        created_by: user.id,
      })
      .select()
      .single();

    if (!error && group) {
      // Add creator as first member
      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
      });

      // Add points for creating a group
      await supabase.rpc('increment_points', { user_id: user.id, points: 50 });

      setNewGroup({ name: '', description: '', subject: '', max_members: 20 });
      setIsCreating(false);
      fetchGroups();
    }
  };

  const joinGroup = async (groupId: string) => {
    if (!user) return;

    const { error } = await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: user.id,
    });

    if (!error) {
      // Add points for joining a group
      await supabase.rpc('increment_points', { user_id: user.id, points: 20 });
      fetchGroups();
    }
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return;

    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    fetchGroups();
  };

  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const subjects = [...new Set(groups.map((g) => g.subject))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Study Groups
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Find or create study groups for any subject
            </p>
          </div>
          <ElasticButton
            onClick={() => setIsCreating(true)}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Group
          </ElasticButton>
        </div>
      </FadeIn>

      {/* Search and Filter */}
      <FadeIn delay={0.1}>
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search groups..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <motion.button
              onClick={() => setSearchQuery('')}
              className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                searchQuery === ''
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              All
            </motion.button>
            {subjects.map((subject) => (
              <motion.button
                key={subject}
                onClick={() => setSearchQuery(subject)}
                className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  searchQuery === subject
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {subject}
              </motion.button>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Groups Grid */}
      <StaggerContainer staggerDelay={0.1} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.map((group) => (
          <StaggerItem key={group.id}>
            <HoverLift>
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 h-full flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center`}>
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <HoverScale>
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </HoverScale>
                </div>

                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  {group.name}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                  {group.description || 'No description'}
                </p>

                <div className="flex items-center gap-4 mb-4 text-sm text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {group.subject}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {group.member_count}/{group.max_members}
                  </span>
                </div>

                <div className="mt-auto">
                  {group.is_member ? (
                    <motion.button
                      onClick={() => leaveGroup(group.id)}
                      className="w-full py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl font-medium flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <UserCheck className="w-5 h-5" />
                      Joined
                    </motion.button>
                  ) : group.member_count >= group.max_members ? (
                    <button
                      disabled
                      className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-xl font-medium cursor-not-allowed"
                    >
                      Full
                    </button>
                  ) : (
                    <motion.button
                      onClick={() => joinGroup(group.id)}
                      className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <UserPlus className="w-5 h-5" />
                      Join Group
                    </motion.button>
                  )}
                </div>
              </div>
            </HoverLift>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {filteredGroups.length === 0 && (
        <FadeIn>
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Users className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              No groups found
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Try adjusting your search or create a new group!
            </p>
          </div>
        </FadeIn>
      )}

      {/* Create Group Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setIsCreating(false)}
          >
            <ScaleIn>
              <motion.div
                className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Create Study Group
                  </h3>
                  <HoverScale>
                    <button
                      onClick={() => setIsCreating(false)}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </HoverScale>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={newGroup.name}
                      onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                      placeholder="e.g., Calculus Study Squad"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={newGroup.subject}
                      onChange={(e) => setNewGroup({ ...newGroup, subject: e.target.value })}
                      placeholder="e.g., Mathematics"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newGroup.description}
                      onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                      placeholder="What will you study?"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Max Members: {newGroup.max_members}
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="50"
                      value={newGroup.max_members}
                      onChange={(e) => setNewGroup({ ...newGroup, max_members: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  <ElasticButton
                    onClick={createGroup}
                    disabled={!newGroup.name.trim() || !newGroup.subject.trim()}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Group
                  </ElasticButton>
                </div>
              </motion.div>
            </ScaleIn>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
