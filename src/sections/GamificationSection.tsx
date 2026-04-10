import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Star, 
  Zap, 
  Flame,
  Crown,
  Medal,
  Award,
  TrendingUp,
  Users,
  Calendar,
  Heart
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { FadeIn } from '@/components/animations/FadeIn';
import { StaggerContainer, StaggerItem } from '@/components/animations/StaggerContainer';
import { HoverLift } from '@/components/animations/HoverScale';
import { AnimatedCounter } from '@/components/animations/AnimatedCounter';
import { FloatingElement } from '@/components/animations/FloatingElements';

type Badge = any;
type UserBadge = any;

interface LeaderboardUser {
  id: string;
  username: string;
  full_name: string | null;
  points: number;
  streak_days: number;
}

export function GamificationSection() {
  const { profile } = useAuth();
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [stats, setStats] = useState({
    postsCount: 0,
    likesReceived: 0,
    groupsJoined: 0,
    eventsAttended: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchGamificationData();
  }, []);

  const fetchGamificationData = async () => {
    if (!profile) return;

    // Fetch user's badges
    const { data: badgesData } = await supabase
      .from('user_badges')
      .select(`
        *,
        badges (*)
      `)
      .eq('user_id', profile.id);

    if (badgesData) {
      setUserBadges(badgesData as UserBadge[]);
    }

    // Fetch all badges
    const { data: allBadgesData } = await supabase
      .from('badges')
      .select('*')
      .order('points_required', { ascending: true });

    if (allBadgesData) {
      setAllBadges(allBadgesData);
    }

    // Fetch leaderboard
    const { data: leaderboardData } = await supabase
      .from('profiles')
      .select('id, username, full_name, points, streak_days')
      .order('points', { ascending: false })
      .limit(10);

    if (leaderboardData) {
      setLeaderboard(leaderboardData);
    }

    // Fetch stats
    const [{ count: postsCount }, , { count: groupsCount }, { count: eventsCount }] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
      supabase.from('posts').select('likes_count', { count: 'exact', head: true }).eq('user_id', profile.id),
      supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('user_id', profile.id),
      supabase.from('event_attendees').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('status', 'going'),
    ]);

    setStats({
      postsCount: postsCount || 0,
      likesReceived: 0,
      groupsJoined: groupsCount || 0,
      eventsAttended: eventsCount || 0,
    });

    setIsLoading(false);
  };

  const getNextLevelPoints = (currentPoints: number) => {
    const levels = [0, 100, 250, 500, 1000, 2000, 5000, 10000];
    for (const level of levels) {
      if (currentPoints < level) return level;
    }
    return levels[levels.length - 1] * 2;
  };

  const getLevel = (points: number) => {
    if (points < 100) return 1;
    if (points < 250) return 2;
    if (points < 500) return 3;
    if (points < 1000) return 4;
    if (points < 2000) return 5;
    if (points < 5000) return 6;
    if (points < 10000) return 7;
    return 8;
  };

  const getRank = (userId: string) => {
    const index = leaderboard.findIndex(u => u.id === userId);
    return index >= 0 ? index + 1 : leaderboard.length + 1;
  };

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

  const currentLevel = getLevel(profile?.points || 0);
  const nextLevelPoints = getNextLevelPoints(profile?.points || 0);
  const progressToNextLevel = ((profile?.points || 0) / nextLevelPoints) * 100;
  const userRank = getRank(profile?.id || '');

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <FadeIn>
        <div className="text-center mb-12">
          <FloatingElement duration={3} distance={8}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 text-yellow-700 dark:text-yellow-300 text-sm font-medium mb-4">
              <Trophy className="w-4 h-4" />
              <span>Level {currentLevel} Scholar</span>
            </div>
          </FloatingElement>
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Your Achievements
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Keep engaging with the community to earn points, unlock badges, and climb the leaderboard!
          </p>
        </div>
      </FadeIn>

      {/* Stats Cards */}
      <StaggerContainer staggerDelay={0.1} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StaggerItem>
          <HoverLift>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                <Star className="w-7 h-7 text-white" />
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                <AnimatedCounter value={profile?.points || 0} />
              </div>
              <p className="text-slate-500 dark:text-slate-400">Total Points</p>
            </div>
          </HoverLift>
        </StaggerItem>

        <StaggerItem>
          <HoverLift>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                <Flame className="w-7 h-7 text-white" />
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                <AnimatedCounter value={profile?.streak_days || 0} />
              </div>
              <p className="text-slate-500 dark:text-slate-400">Day Streak</p>
            </div>
          </HoverLift>
        </StaggerItem>

        <StaggerItem>
          <HoverLift>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                #{userRank}
              </div>
              <p className="text-slate-500 dark:text-slate-400">Your Rank</p>
            </div>
          </HoverLift>
        </StaggerItem>

        <StaggerItem>
          <HoverLift>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                <Award className="w-7 h-7 text-white" />
              </div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                <AnimatedCounter value={userBadges.length} />
              </div>
              <p className="text-slate-500 dark:text-slate-400">Badges Earned</p>
            </div>
          </HoverLift>
        </StaggerItem>
      </StaggerContainer>

      {/* Level Progress */}
      <FadeIn delay={0.3}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Level {currentLevel}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {profile?.points || 0} / {nextLevelPoints} points to Level {currentLevel + 1}
                </p>
              </div>
            </div>
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {Math.round(progressToNextLevel)}%
            </span>
          </div>
          <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressToNextLevel}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
      </FadeIn>

      {/* Activity Stats */}
      <FadeIn delay={0.4}>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
          Your Activity
        </h3>
      </FadeIn>
      
      <StaggerContainer staggerDelay={0.1} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <StaggerItem>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.postsCount}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Posts</p>
            </div>
          </div>
        </StaggerItem>
        
        <StaggerItem>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
              <Heart className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.likesReceived}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Likes</p>
            </div>
          </div>
        </StaggerItem>
        
        <StaggerItem>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.groupsJoined}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Groups</p>
            </div>
          </div>
        </StaggerItem>
        
        <StaggerItem>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.eventsAttended}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Events</p>
            </div>
          </div>
        </StaggerItem>
      </StaggerContainer>

      {/* Badges */}
      <FadeIn delay={0.5}>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
          Badges
        </h3>
      </FadeIn>
      
      <StaggerContainer staggerDelay={0.05} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {allBadges.map((badge) => {
          const isEarned = userBadges.some(ub => ub.badge_id === badge.id);
          
          return (
            <StaggerItem key={badge.id}>
              <HoverLift>
                <div className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-lg border p-6 text-center transition-all ${
                  isEarned 
                    ? 'border-indigo-500 dark:border-indigo-500' 
                    : 'border-slate-200 dark:border-slate-700 opacity-60'
                }`}>
                  {isEarned && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center ${
                    isEarned 
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}>
                    <Medal className={`w-8 h-8 ${isEarned ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-1">
                    {badge.name}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                    {badge.description}
                  </p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    {badge.points_required} points
                  </p>
                </div>
              </HoverLift>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* Leaderboard */}
      <FadeIn delay={0.6}>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
          Leaderboard
        </h3>
      </FadeIn>
      
      <FadeIn delay={0.7}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-slate-500 dark:text-slate-400">
              <div className="col-span-2 text-center">Rank</div>
              <div className="col-span-6">Student</div>
              <div className="col-span-2 text-center">Streak</div>
              <div className="col-span-2 text-right">Points</div>
            </div>
          </div>
          
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {leaderboard.map((user, index) => {
              const isCurrentUser = user.id === profile?.id;
              const rankColors = ['text-yellow-500', 'text-slate-400', 'text-amber-600'];
              
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 grid grid-cols-12 gap-4 items-center ${
                    isCurrentUser ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                  }`}
                >
                  <div className="col-span-2 text-center">
                    {index < 3 ? (
                      <Crown className={`w-6 h-6 mx-auto ${rankColors[index]}`} />
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        #{index + 1}
                      </span>
                    )}
                  </div>
                  <div className="col-span-6 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                      {(user.full_name?.[0] || user.username[0]).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {user.full_name || user.username}
                      </p>
                      {isCurrentUser && (
                        <span className="text-xs text-indigo-600 dark:text-indigo-400">You</span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="inline-flex items-center gap-1 text-orange-500">
                      <Flame className="w-4 h-4" />
                      {user.streak_days}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {user.points.toLocaleString()}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
