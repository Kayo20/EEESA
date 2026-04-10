import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Plus,
  Check,
  X,
  Search
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { FadeIn } from '@/components/animations/FadeIn';
import { StaggerContainer, StaggerItem } from '@/components/animations/StaggerContainer';
import { HoverScale, HoverLift } from '@/components/animations/HoverScale';
import { ScaleIn } from '@/components/animations/ScaleIn';
import { ElasticButton } from '@/components/animations/MorphingButton';
import { format, parseISO, isAfter } from 'date-fns';

type Event = any;

export function EventsSection() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    event_date: '',
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data: eventsData, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      setIsLoading(false);
      return;
    }

    // Fetch attendee counts and user status for each event
    const eventsWithDetails = await Promise.all(
      (eventsData || []).map(async (event: any) => {
        const { count: attendeesCount } = await supabase
          .from('event_attendees')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .eq('status', 'going');

        const { data: userAttendance } = await supabase
          .from('event_attendees')
          .select('status')
          .eq('event_id', event.id)
          .eq('user_id', user?.id)
          .single();

        return {
          ...event,
          attendees_count: attendeesCount || 0,
          user_status: userAttendance?.status || null,
        };
      })
    );

    setEvents(eventsWithDetails);
    setIsLoading(false);
  };

  const createEvent = async () => {
    if (!user || !newEvent.title.trim() || !newEvent.event_date) return;

    const { data: event, error } = await supabase
      .from('events')
      .insert({
        title: newEvent.title,
        description: newEvent.description,
        location: newEvent.location,
        event_date: newEvent.event_date,
        created_by: user.id,
      })
      .select()
      .single();

    if (!error && event) {
      // Add creator as attendee
      await supabase.from('event_attendees').insert({
        event_id: event.id,
        user_id: user.id,
        status: 'going',
      });

      // Add points for creating an event
      await supabase.rpc('increment_points', { user_id: user.id, points: 30 });

      setNewEvent({ title: '', description: '', location: '', event_date: '' });
      setIsCreating(false);
      fetchEvents();
    }
  };

  const updateAttendance = async (eventId: string, status: 'going' | 'maybe' | 'not_going') => {
    if (!user) return;

    const event = events.find(e => e.id === eventId);
    
    if (event?.user_status) {
      await supabase
        .from('event_attendees')
        .update({ status })
        .eq('event_id', eventId)
        .eq('user_id', user.id);
    } else {
      await supabase.from('event_attendees').insert({
        event_id: eventId,
        user_id: user.id,
        status,
      });
      // Add points for RSVPing
      await supabase.rpc('increment_points', { user_id: user.id, points: 5 });
    }

    fetchEvents();
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const eventDate = parseISO(event.event_date);
    const now = new Date();
    
    if (filter === 'upcoming') return matchesSearch && isAfter(eventDate, now);
    if (filter === 'past') return matchesSearch && !isAfter(eventDate, now);
    return matchesSearch;
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
              Campus Events
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Discover and join exciting campus activities
            </p>
          </div>
          <ElasticButton
            onClick={() => setIsCreating(true)}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Event
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
              placeholder="Search events..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'upcoming', 'past'] as const).map((f) => (
              <motion.button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl font-medium capitalize transition-colors ${
                  filter === f
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {f}
              </motion.button>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Events Grid */}
      <StaggerContainer staggerDelay={0.1} className="grid md:grid-cols-2 gap-6">
        {filteredEvents.map((event) => {
          const eventDate = parseISO(event.event_date);
          const isUpcoming = isAfter(eventDate, new Date());

          return (
            <StaggerItem key={event.id}>
              <HoverLift>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {/* Event Date Badge */}
                  <div className="relative h-32 bg-gradient-to-r from-indigo-500 to-purple-600">
                    <div className="absolute bottom-4 left-4 bg-white dark:bg-slate-800 rounded-xl p-3 text-center min-w-[80px]">
                      <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                        {format(eventDate, 'd')}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 uppercase">
                        {format(eventDate, 'MMM')}
                      </div>
                    </div>
                    {isUpcoming && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-green-500 text-white text-sm font-medium rounded-full">
                        Upcoming
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                      {event.title}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                      {event.description || 'No description'}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {format(eventDate, 'h:mm a')}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {event.attendees_count} going
                      </span>
                    </div>

                    {/* RSVP Buttons */}
                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => updateAttendance(event.id, 'going')}
                        className={`flex-1 py-2 rounded-xl font-medium text-sm transition-colors ${
                          event.user_status === 'going'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-green-100 dark:hover:bg-green-900/30'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Check className="w-4 h-4 inline mr-1" />
                        Going
                      </motion.button>
                      <motion.button
                        onClick={() => updateAttendance(event.id, 'maybe')}
                        className={`flex-1 py-2 rounded-xl font-medium text-sm transition-colors ${
                          event.user_status === 'maybe'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Maybe
                      </motion.button>
                      <motion.button
                        onClick={() => updateAttendance(event.id, 'not_going')}
                        className={`flex-1 py-2 rounded-xl font-medium text-sm transition-colors ${
                          event.user_status === 'not_going'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <X className="w-4 h-4 inline mr-1" />
                        Can't
                      </motion.button>
                    </div>
                  </div>
                </div>
              </HoverLift>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {filteredEvents.length === 0 && (
        <FadeIn>
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <Calendar className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              No events found
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Create an event or check back later!
            </p>
          </div>
        </FadeIn>
      )}

      {/* Create Event Modal */}
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
                className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Create Event
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
                      Event Title
                    </label>
                    <input
                      type="text"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      placeholder="e.g., Study Session"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={newEvent.event_date}
                      onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                      placeholder="e.g., Library Room 302"
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      placeholder="What's this event about?"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                    />
                  </div>

                  <ElasticButton
                    onClick={createEvent}
                    disabled={!newEvent.title.trim() || !newEvent.event_date}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Event
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
