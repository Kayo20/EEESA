import { useState, useEffect, useRef } from 'react';
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
  Database,
  Search,
  Filter,
  Edit3,
  Trash2,
  Flag,
  Eye,
  ThumbsUp,
  ChevronDown,
  Upload,
  X
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
    content: 'Just joined StudentConnect! Excited to connect with fellow students and find study groups. 🎓 #studygroup',
    image_url: null,
    likes_count: 12,
    comments_count: 3,
    view_count: 45,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    profiles: {
      full_name: 'Sarah Johnson',
      username: 'sarahj'
    },
    likes: [],
    hashtags: ['studygroup']
  },
  {
    id: '2',
    content: 'Looking for a study group for Calculus II. Anyone interested? 📚 #homeworkhelp #calculus',
    image_url: null,
    likes_count: 8,
    comments_count: 5,
    view_count: 32,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    profiles: {
      full_name: 'Mike Chen',
      username: 'mikec'
    },
    likes: [],
    hashtags: ['homeworkhelp', 'calculus']
  },
  {
    id: '3',
    content: 'Just uploaded my notes from today\'s Physics lecture. Check them out in the Resources section! ⚛️ #notes #physics',
    image_url: null,
    likes_count: 24,
    comments_count: 7,
    view_count: 89,
    created_at: new Date(Date.now() - 10800000).toISOString(),
    profiles: {
      full_name: 'Emma Williams',
      username: 'emmaw'
    },
    likes: [],
    hashtags: ['notes', 'physics']
  }
];

export function FeedSection() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'friends' | 'trending' | 'recent'>('all');
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [hashtags, setHashtags] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastPostRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (lastPostRef.current) {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMorePosts();
        }
      });

      observer.observe(lastPostRef.current);
      observerRef.current = observer;

      return () => observer.disconnect();
    }
  }, [hasMore]);

  useEffect(() => {
    fetchPosts();
    fetchHashtags();

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
  }, [profile?.id]);

  useEffect(() => {
    // Filter posts based on search and filters
    filterPosts();
  }, [allPosts, searchQuery, filterBy, selectedHashtag]);

  const fetchFriendIds = async (): Promise<string[]> => {
    if (!profile?.id) return [];

    const { data, error } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`);

    if (error || !data) return [];

    return data
      .filter((request: any) => request.status === 'accepted')
      .map((request: any) => (request.sender_id === profile.id ? request.receiver_id : request.sender_id));
  };

  const fetchPosts = async (loadMore = false) => {
    try {
      if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setPage(1);
      }

      const visibleUserIds = profile ? [profile.id, ...(await fetchFriendIds())] : [];
      const from = loadMore ? (page - 1) * 10 : 0;
      const to = from + 9;

      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (*),
          likes (*),
          comments (*),
          post_hashtags (
            hashtags (
              name
            )
          )
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (profile && filterBy === 'friends') {
        query = query.in('user_id', visibleUserIds);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Posts fetch error (table may not exist):', error);
        setDbError(true);
        setPosts(SAMPLE_POSTS);
        setAllPosts(SAMPLE_POSTS);
      } else if (data) {
        const processedPosts = data.map((post: any) => ({
          ...post,
          hashtags: post.post_hashtags?.map((ph: any) => ph.hashtags?.name).filter(Boolean) || []
        }));

        if (loadMore) {
          setAllPosts(prev => [...prev, ...processedPosts]);
          setHasMore(processedPosts.length === 10);
          setPage(prev => prev + 1);
        } else {
          setAllPosts(processedPosts);
          setHasMore(processedPosts.length === 10);
        }
      }
    } catch (err) {
      console.warn('Posts fetch exception:', err);
      setDbError(true);
      setPosts(SAMPLE_POSTS);
      setAllPosts(SAMPLE_POSTS);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMorePosts = () => {
    if (!isLoadingMore && hasMore) {
      fetchPosts(true);
    }
  };

  const fetchHashtags = async () => {
    try {
      const { data, error } = await supabase
        .from('hashtags')
        .select('*')
        .order('post_count', { ascending: false })
        .limit(20);

      if (!error && data) {
        setHashtags(data);
      }
    } catch (err) {
      console.warn('Hashtags fetch error:', err);
    }
  };

  const filterPosts = () => {
    let filtered = [...allPosts];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.content.toLowerCase().includes(query) ||
        post.profiles?.full_name?.toLowerCase().includes(query) ||
        post.profiles?.username?.toLowerCase().includes(query) ||
        post.hashtags?.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    // Apply hashtag filter
    if (selectedHashtag) {
      filtered = filtered.filter(post =>
        post.hashtags?.includes(selectedHashtag)
      );
    }

    // Apply sorting
    switch (filterBy) {
      case 'trending':
        filtered.sort((a, b) => (b.likes_count + b.comments_count) - (a.likes_count + a.comments_count));
        break;
      case 'recent':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      default:
        break;
    }

    setPosts(filtered);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}_${Date.now()}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const createPost = async () => {
    if (!newPostContent.trim() || !user) {
      alert('Please sign in to create posts');
      return;
    }

    try {
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
        if (!imageUrl) {
          alert('Failed to upload image. Please try again.');
          return;
        }
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: newPostContent,
        image_url: imageUrl,
      });

      if (error) {
        console.error('Create post error:', error);
        alert('Failed to create post. Database may not be set up yet.');
        return;
      }

      setNewPostContent('');
      setSelectedImage(null);
      setImagePreview(null);
      fetchPosts();
      fetchHashtags();
    } catch (err) {
      console.error('Create post exception:', err);
      alert('Failed to create post. Please set up the database first.');
    }
  };

  const editPost = async (postId: string) => {
    if (!editContent.trim() || !user) return;

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          content: editContent,
          is_edited: true,
          edited_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', postId)
        .eq('user_id', user.id);

      if (error) throw error;

      setEditingPost(null);
      setEditContent('');
      fetchPosts();
    } catch (err) {
      console.error('Edit post error:', err);
      alert('Failed to edit post.');
    }
  };

  const deletePost = async (postId: string) => {
    if (!user || !confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id);

      if (error) throw error;

      fetchPosts();
      fetchHashtags();
    } catch (err) {
      console.error('Delete post error:', err);
      alert('Failed to delete post.');
    }
  };

  const reportPost = async (postId: string) => {
    if (!user) {
      alert('Please sign in to report posts');
      return;
    }

    const reason = prompt('Why are you reporting this post?');
    if (!reason) return;

    try {
      const { error } = await supabase.from('post_reports').insert({
        post_id: postId,
        reporter_id: user.id,
        reason: reason,
      });

      if (error) throw error;

      alert('Post reported successfully. Thank you for helping keep our community safe.');
    } catch (err) {
      console.error('Report post error:', err);
      alert('Failed to report post.');
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

  const toggleCommentLike = async (commentId: string) => {
    if (!user) {
      alert('Please sign in to like comments');
      return;
    }

    try {
      const { data: existingLike } = await supabase
        .from('comment_likes')
        .select('*')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .single();

      if (existingLike) {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        await supabase.from('comment_likes').insert({
          comment_id: commentId,
          user_id: user.id,
        });
      }

      fetchPosts();
    } catch (err) {
      console.error('Comment like error:', err);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image size must be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const extractHashtags = (content: string): string[] => {
    const hashtagRegex = /#(\w+)/g;
    const matches = content.match(hashtagRegex);
    return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
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
    <div className="max-w-4xl mx-auto">
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

      {/* Search and Filters */}
      <FadeIn>
        <div className="mb-6 space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts, users, or hashtags..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <motion.button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Filter className="w-5 h-5" />
              Filters
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </motion.button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"
              >
                <div className="flex flex-wrap gap-4">
                  <div className="flex gap-2">
                    {(['all', 'friends', 'trending', 'recent'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setFilterBy(filter)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filterBy === filter
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {hashtags.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Trending Hashtags</p>
                    <div className="flex flex-wrap gap-2">
                      {hashtags.slice(0, 10).map((hashtag) => (
                        <button
                          key={hashtag.name}
                          onClick={() => setSelectedHashtag(selectedHashtag === hashtag.name ? null : hashtag.name)}
                          className={`px-3 py-1 rounded-full text-sm transition-colors ${
                            selectedHashtag === hashtag.name
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                          }`}
                        >
                          #{hashtag.name} ({hashtag.post_count})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </FadeIn>

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

              {/* Image Preview */}
              <AnimatePresence>
                {imagePreview && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="mt-4 relative inline-block"
                  >
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-w-xs max-h-48 rounded-xl object-cover"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hashtags Preview */}
              {newPostContent && extractHashtags(newPostContent).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {extractHashtags(newPostContent).map((tag) => (
                    <span key={tag} className="text-sm text-indigo-600 dark:text-indigo-400">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <HoverScale>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors disabled:opacity-50"
                    >
                      {uploadingImage ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Upload className="w-5 h-5" />
                        </motion.div>
                      ) : (
                        <ImageIcon className="w-5 h-5" />
                      )}
                    </button>
                  </HoverScale>
                </div>
                <motion.button
                  onClick={createPost}
                  disabled={!newPostContent.trim() || uploadingImage}
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
        {posts.map((post, index) => (
          <StaggerItem key={post.id}>
            <HoverLift>
              <div
                ref={index === posts.length - 1 ? lastPostRef : null}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6"
              >
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
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        {post.is_edited && (
                          <span className="text-xs">(edited)</span>
                        )}
                        <Eye className="w-3 h-3 ml-2" />
                        <span>{post.view_count || 0}</span>
                      </div>
                    </div>
                  </div>

                  {/* Post Actions Menu */}
                  <div className="relative">
                    <HoverScale>
                      <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </HoverScale>

                    {/* Dropdown Menu - Simplified for now */}
                    {post.user_id === user?.id && (
                      <div className="absolute right-0 top-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-2 min-w-32">
                        <button
                          onClick={() => {
                            setEditingPost(post.id);
                            setEditContent(post.content);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                        >
                          <Edit3 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => deletePost(post.id)}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}

                    {post.user_id !== user?.id && (
                      <div className="absolute right-0 top-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-2 min-w-32">
                        <button
                          onClick={() => reportPost(post.id)}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        >
                          <Flag className="w-4 h-4" />
                          Report
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit Mode */}
                <AnimatePresence>
                  {editingPost === post.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4"
                    >
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-700 border-none text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        rows={3}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => editPost(post.id)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingPost(null);
                            setEditContent('');
                          }}
                          className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-300 dark:hover:bg-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Post Content */}
                {editingPost !== post.id && (
                  <>
                    <p className="text-slate-700 dark:text-slate-300 mb-4 whitespace-pre-wrap">
                      {post.content}
                    </p>

                    {/* Hashtags */}
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.hashtags.map((tag: string) => (
                          <button
                            key={tag}
                            onClick={() => setSelectedHashtag(tag)}
                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}

                    {post.image_url && (
                      <img
                        src={post.image_url}
                        alt="Post"
                        className="w-full rounded-xl mb-4 object-cover max-h-96"
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
                          {/* Existing Comments */}
                          {post.comments && post.comments.length > 0 && (
                            <div className="space-y-3 mb-4">
                              {post.comments.map((comment: any) => (
                                <div key={comment.id} className="flex gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                    U
                                  </div>
                                  <div className="flex-1">
                                    <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3">
                                      <p className="text-sm text-slate-700 dark:text-slate-300">
                                        {comment.content}
                                      </p>
                                      <div className="flex items-center gap-2 mt-2">
                                        <button
                                          onClick={() => toggleCommentLike(comment.id)}
                                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500"
                                        >
                                          <ThumbsUp className="w-3 h-3" />
                                          <span>{comment.likes_count || 0}</span>
                                        </button>
                                        <span className="text-xs text-slate-400">
                                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

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
                  </>
                )}
              </div>
            </HoverLift>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Loading More Indicator */}
      {isLoadingMore && (
        <div className="flex items-center justify-center py-8">
          <motion.div
            className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}

      {posts.length === 0 && !isLoading && (
        <FadeIn>
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <TrendingUp className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              {searchQuery || selectedHashtag ? 'No posts found' : 'No posts yet'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              {searchQuery || selectedHashtag
                ? 'Try adjusting your search or filters'
                : 'Be the first to share something with the community!'
              }
            </p>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
