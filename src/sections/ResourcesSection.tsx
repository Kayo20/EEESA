import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Search, 
  Download, 
  FileText,
  Image,
  File,
  Video,
  Music,
  Plus,
  X,
  MoreVertical,
  Star
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { FadeIn } from '@/components/animations/FadeIn';
import { StaggerContainer, StaggerItem } from '@/components/animations/StaggerContainer';
import { HoverScale, HoverLift } from '@/components/animations/HoverScale';
import { ScaleIn } from '@/components/animations/ScaleIn';
import { ElasticButton } from '@/components/animations/MorphingButton';
import { formatDistanceToNow } from 'date-fns';

type Resource = any;

const fileTypeIcons: Record<string, React.ElementType> = {
  pdf: FileText,
  image: Image,
  video: Video,
  audio: Music,
  default: File,
};

const fileTypeColors: Record<string, string> = {
  pdf: 'from-red-500 to-orange-500',
  image: 'from-blue-500 to-cyan-500',
  video: 'from-purple-500 to-pink-500',
  audio: 'from-green-500 to-emerald-500',
  default: 'from-slate-500 to-gray-500',
};

export function ResourcesSection() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    subject: '',
    file_url: '',
  });

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    const { data, error } = await supabase
      .from('resources')
      .select(`
        *,
        profiles:uploaded_by (*)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setResources(data as Resource[]);
    }
    setIsLoading(false);
  };

  const uploadResource = async () => {
    if (!user || !newResource.title.trim() || !newResource.subject.trim()) return;

    const { error } = await supabase.from('resources').insert({
      title: newResource.title,
      description: newResource.description,
      subject: newResource.subject,
      file_url: newResource.file_url,
      uploaded_by: user.id,
    });

    if (!error) {
      // Add points for uploading
      await supabase.rpc('increment_points', { user_id: user.id, points: 25 });

      setNewResource({ title: '', description: '', subject: '', file_url: '' });
      setIsUploading(false);
      fetchResources();
    }
  };

  const downloadResource = async (resourceId: string) => {
    await supabase
      .from('resources')
      .update({ downloads_count: supabase.rpc('increment_downloads', { resource_id: resourceId }) })
      .eq('id', resourceId);

    fetchResources();
  };

  const getFileType = (url: string): string => {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    if (['pdf', 'doc', 'docx'].includes(extension)) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    if (['mp4', 'avi', 'mov', 'webm'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'ogg'].includes(extension)) return 'audio';
    return 'default';
  };

  const subjects = ['all', ...new Set(resources.map((r) => r.subject))];

  const filteredResources = resources.filter((resource) => {
    const matchesSearch =
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || resource.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

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
              Study Resources
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Share and access study materials, notes, and resources
            </p>
          </div>
          <ElasticButton
            onClick={() => setIsUploading(true)}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Upload Resource
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
              placeholder="Search resources..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {subjects.map((subject) => (
              <motion.button
                key={subject}
                onClick={() => setSelectedSubject(subject)}
                className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors capitalize ${
                  selectedSubject === subject
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

      {/* Resources Grid */}
      <StaggerContainer staggerDelay={0.1} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResources.map((resource) => {
          const fileType = getFileType(resource.file_url || '');
          const Icon = fileTypeIcons[fileType] || fileTypeIcons.default;
          const colorClass = fileTypeColors[fileType] || fileTypeColors.default;

          return (
            <StaggerItem key={resource.id}>
              <HoverLift>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <HoverScale>
                      <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </HoverScale>
                  </div>

                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2">
                    {resource.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                    {resource.description || 'No description'}
                  </p>

                  <div className="flex items-center gap-4 mb-4 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {resource.subject}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="w-4 h-4" />
                      {resource.downloads_count}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
                      {(resource.profiles?.full_name?.[0] || resource.profiles?.username?.[0] || 'U').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {resource.profiles?.full_name || resource.profiles?.username}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDistanceToNow(new Date(resource.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex gap-2">
                    <motion.a
                      href={resource.file_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => downloadResource(resource.id)}
                      className="flex-1 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium text-center flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </motion.a>
                    <HoverScale>
                      <button className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                        <Star className="w-5 h-5" />
                      </button>
                    </HoverScale>
                  </div>
                </div>
              </HoverLift>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {filteredResources.length === 0 && (
        <FadeIn>
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              No resources found
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Be the first to share a study resource!
            </p>
          </div>
        </FadeIn>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setIsUploading(false)}
          >
            <ScaleIn>
              <motion.div
                className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Upload Resource
                  </h3>
                  <HoverScale>
                    <button
                      onClick={() => setIsUploading(false)}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </HoverScale>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newResource.title}
                      onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                      placeholder="e.g., Calculus Notes Chapter 5"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={newResource.subject}
                      onChange={(e) => setNewResource({ ...newResource, subject: e.target.value })}
                      placeholder="e.g., Mathematics"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newResource.description}
                      onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                      placeholder="Brief description of the resource..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      File URL
                    </label>
                    <input
                      type="url"
                      value={newResource.file_url}
                      onChange={(e) => setNewResource({ ...newResource, file_url: e.target.value })}
                      placeholder="https://example.com/file.pdf"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <ElasticButton
                    onClick={uploadResource}
                    disabled={!newResource.title.trim() || !newResource.subject.trim()}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Upload Resource
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
