import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  Image as ImageIcon,
  Send,
  TrendingUp,
  Clock,
  Database
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { FadeIn } from '@/components/animations/FadeIn';
import { StaggerContainer, StaggerItem } from '@/components/animations/StaggerContainer';
import { HoverScale, HoverLift } from '@/components/animations/HoverScale';
import { formatDistanceToNow } from 'date-fns';

type Post = any;

// Sample posts for demo when database is not set up
const SAMPLE_POSTS: Post[] = [
  {
    id: '1',
    content: 'Just joined StudentConnect! Excited to connect with fellow students and find study groups. 🎓',
    image_url: null,
    likes_count: 12,
    comments_count: 3,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    profiles: {
      full_name: 'Sarah Johnson',
      username: 'sarahj'
    },
    likes: []
  },
  {
    id: '2',
    content: 'Looking for a study group for Calculus II. Anyone interested? 📚',
    image_url: null,
    likes_count: 8,
    comments_count: 5,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    profiles: {
      full_name: 'Mike Chen',
      username: 'mikec'
    },
    likes: []
  },
  {
    id: '3',
    content: 'Just uploaded my notes from today\'s Physics lecture. Check them out in the Resources section! ⚛️',
    image_url: null,
    likes_count: 24,
    comments_count: 7,
    created_at: new Date(Date.now() - 10800000).toISOString(),
    profiles: {
      full_name: 'Emma Williams',
      username: 'emmaw'
    },
    likes: []
  }
];

export function FeedSection() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');

  useEffect(() => {
    fetchPosts();
    
    // Subscribe to new posts
    const subscription = supabase
      .channel('posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (*),
          likes (*),
          comments (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Posts fetch error (table may not exist):', error);
        setDbError(true);
        setPosts(SAMPLE_POSTS);
      } else if (data && data.length > 0) {
        setPosts(data);
      } else {
        // No posts yet, show sample posts
        setPosts(SAMPLE_POSTS);
      }
    } catch (err) {
      console.warn('Posts fetch exception:', err);
      setDbError(true);
      setPosts(SAMPLE_POSTS);
    }
    setIsLoading(false);
  };

  const createPost = async () => {
    if (!newPostContent.trim() || !user) {
      alert('Please sign in to create posts');
      return;
    }

    try {
      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: newPostContent,
      });

      if (error) {
        console.error('Create post error:', error);
        alert('Failed to create post. Database may not be set up yet.');
        return;
      }

      setNewPostContent('');
      fetchPosts();
    } catch (err) {
      console.error('Create post exception:', err);
      alert('Failed to create post. Please set up the database first.');
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) {
      alert('Please sign in to like posts');
      return;
    }

    try {
      const post = posts.find((p: any) => p.id === postId);
      const hasLiked = post?.likes?.some((l: any) => l.user_id === user.id);

      if (hasLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase.from('likes').insert({
          post_id: postId,
          user_id: user.id,
        });
      }

      fetchPosts();
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const addComment = async (postId: string) => {
    if (!commentContent.trim() || !user) {
      alert('Please sign in to comment');
      return;
    }

    try {
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: user.id,
        content: commentContent,
      });

      if (error) {
        console.error('Comment error:', error);
        alert('Failed to add comment. Database may not be set up yet.');
        return;
      }

      setCommentContent('');
      setCommentingOn(null);
      fetchPosts();
    } catch (err) {
      console.error('Comment exception:', err);
      alert('Failed to add comment. Please set up the database first.');
    }
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

  return (
    <div className="max-w-2xl mx-auto">
      {/* Database Setup Notice */}
      {dbError && (
        <FadeIn>
          <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">Database Setup Required</p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Showing demo content. Run the SQL schema in your Supabase dashboard to enable full functionality.
                </p>
              </div>
            </div>
          </div>
        </FadeIn>
      )}

      {/* Create Post */}
      <FadeIn>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
              {(profile?.full_name?.[0] || profile?.username?.[0] || 'G').toUpperCase()}
            </div>
            <div className="flex-1">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-700 border-none text-slate-900 dark:text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                rows={3}
              />
              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-2">
                  <HoverScale>
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                      <ImageIcon className="w-5 h-5" />
                    </button>
                  </HoverScale>
                </div>
                <motion.button
                  onClick={createPost}
                  disabled={!newPostContent.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Send className="w-4 h-4" />
                  Post
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Posts Feed */}
      <StaggerContainer staggerDelay={0.1}>
        {posts.map((post) => (
          <StaggerItem key={post.id}>
            <HoverLift>
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
                {/* Post Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {(post.profiles?.full_name?.[0] || post.profiles?.username?.[0] || 'U').toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {post.profiles?.full_name || post.profiles?.username || 'Anonymous'}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <HoverScale>
                    <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </HoverScale>
                </div>

                {/* Post Content */}
                <p className="text-slate-700 dark:text-slate-300 mb-4 whitespace-pre-wrap">
                  {post.content}
                </p>

                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="w-full rounded-xl mb-4"
                  />
                )}

                {/* Post Actions */}
                <div className="flex items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <motion.button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-2 transition-colors ${
                      post.likes?.some((l: any) => l.user_id === user?.id)
                        ? 'text-red-500'
                        : 'text-slate-500 dark:text-slate-400 hover:text-red-500'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        post.likes?.some((l: any) => l.user_id === user?.id) ? 'fill-current' : ''
                      }`}
                    />
                    <span className="font-medium">{post.likes_count}</span>
                  </motion.button>

                  <motion.button
                    onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id)}
                    className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="font-medium">{post.comments_count}</span>
                  </motion.button>

                  <motion.button
                    className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-indigo-500 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Share2 className="w-5 h-5" />
                    <span className="font-medium">Share</span>
                  </motion.button>
                </div>

                {/* Comments Section */}
                <AnimatePresence>
                  {commentingOn === post.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700"
                    >
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={commentContent}
                          onChange={(e) => setCommentContent(e.target.value)}
                          placeholder="Write a comment..."
                          className="flex-1 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 border-none text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          onKeyPress={(e) => e.key === 'Enter' && addComment(post.id)}
                        />
                        <motion.button
                          onClick={() => addComment(post.id)}
                          disabled={!commentContent.trim()}
                          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium disabled:opacity-50"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Send className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </HoverLift>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {posts.length === 0 && (
        <FadeIn>
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <TrendingUp className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              No posts yet
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Be the first to share something with the community!
            </p>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
