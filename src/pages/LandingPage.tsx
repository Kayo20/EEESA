import { motion } from 'framer-motion';
import { 
  GraduationCap, 
  Users, 
  MessageCircle, 
  Calendar, 
  BookOpen, 
  Trophy,
  ArrowRight,
  Sparkles,
  Zap,
  Heart
} from 'lucide-react';
import { FadeIn, FadeInOnScroll } from '@/components/animations/FadeIn';
import { ScaleIn } from '@/components/animations/ScaleIn';
import { StaggerContainer, StaggerItem } from '@/components/animations/StaggerContainer';
import { FloatingElement, PulsingElement } from '@/components/animations/FloatingElements';
import { AnimatedCounter } from '@/components/animations/AnimatedCounter';
import { HoverScale, HoverLift } from '@/components/animations/HoverScale';
import { ElasticButton } from '@/components/animations/MorphingButton';
import { ParticleBackground } from '@/components/animations/ParticleBackground';

interface LandingPageProps {
  onGetStarted: () => void;
}

const features = [
  {
    icon: Users,
    title: 'Study Groups',
    description: 'Connect with classmates and form study groups for any subject.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: MessageCircle,
    title: 'Real-time Chat',
    description: 'Message fellow students instantly with our real-time messaging.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Calendar,
    title: 'Campus Events',
    description: 'Discover and join campus events, meetups, and activities.',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: BookOpen,
    title: 'Resource Sharing',
    description: 'Share and access study materials, notes, and resources.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Trophy,
    title: 'Gamification',
    description: 'Earn points, badges, and streaks for your engagement.',
    color: 'from-yellow-500 to-amber-500',
  },
  {
    icon: Sparkles,
    title: 'Smart Matching',
    description: 'Get matched with study partners based on your interests.',
    color: 'from-indigo-500 to-violet-500',
  },
];

const stats = [
  { value: 50000, label: 'Active Students', suffix: '+' },
  { value: 12000, label: 'Study Groups', suffix: '+' },
  { value: 100000, label: 'Resources Shared', suffix: '+' },
  { value: 98, label: 'Satisfaction Rate', suffix: '%' },
];

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-500">
      <ParticleBackground />
      
      {/* Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                StudentConnect
              </span>
            </motion.div>
            
            <div className="flex items-center gap-4">
              <ElasticButton
                onClick={onGetStarted}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-shadow"
              >
                Get Started
              </ElasticButton>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <FadeIn delay={0.2}>
                <motion.div 
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-6"
                  whileHover={{ scale: 1.05 }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>The Ultimate Student Platform</span>
                </motion.div>
              </FadeIn>
              
              <FadeIn delay={0.3}>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight mb-6">
                  Connect, Learn, and{' '}
                  <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Grow Together
                  </span>
                </h1>
              </FadeIn>
              
              <FadeIn delay={0.4}>
                <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 max-w-xl mx-auto lg:mx-0">
                  Join the largest student community. Find study partners, share resources, 
                  attend events, and level up your academic journey with gamified learning.
                </p>
              </FadeIn>
              
              <FadeIn delay={0.5}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <ElasticButton
                    onClick={onGetStarted}
                    className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold text-lg shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-2"
                  >
                    Get Started Free
                    <ArrowRight className="w-5 h-5" />
                  </ElasticButton>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl font-semibold text-lg border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors"
                  >
                    Watch Demo
                  </motion.button>
                </div>
              </FadeIn>
              
              <FadeIn delay={0.6}>
                <div className="mt-8 flex items-center justify-center lg:justify-start gap-4 text-sm text-slate-500 dark:text-slate-400">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-white dark:border-slate-900"
                      />
                    ))}
                  </div>
                  <span>Join 50,000+ students worldwide</span>
                </div>
              </FadeIn>
            </div>
            
            <div className="relative hidden lg:block">
              <FloatingElement duration={4} distance={15}>
                <ScaleIn delay={0.4} duration={0.8}>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl blur-3xl opacity-30 transform rotate-6" />
                    <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600" />
                        <div>
                          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                          <div className="h-3 w-20 bg-slate-100 dark:bg-slate-600 rounded mt-2" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded" />
                        <div className="h-3 w-4/5 bg-slate-100 dark:bg-slate-700 rounded" />
                        <div className="h-3 w-3/5 bg-slate-100 dark:bg-slate-700 rounded" />
                      </div>
                      <div className="flex gap-2 mt-6">
                        <div className="h-8 w-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full" />
                        <div className="h-8 w-20 bg-purple-100 dark:bg-purple-900/30 rounded-full" />
                      </div>
                    </div>
                  </div>
                </ScaleIn>
              </FloatingElement>
              
              <FloatingElement duration={3} distance={10} delay={0.5} className="absolute -top-8 -right-8">
                <motion.div 
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 border border-slate-200 dark:border-slate-700"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8, type: 'spring' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">Daily Streak!</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">7 days strong</div>
                    </div>
                  </div>
                </motion.div>
              </FloatingElement>
              
              <FloatingElement duration={3.5} distance={12} delay={1} className="absolute -bottom-4 -left-8">
                <motion.div 
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-4 border border-slate-200 dark:border-slate-700"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, type: 'spring' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">+250 Points</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">New achievement!</div>
                    </div>
                  </div>
                </motion.div>
              </FloatingElement>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <StaggerItem key={index}>
                <div className="text-center">
                  <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">{stat.label}</div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInOnScroll className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Everything You Need to{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Succeed
              </span>
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Powerful features designed to enhance your student experience and help you achieve your academic goals.
            </p>
          </FadeInOnScroll>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FadeInOnScroll key={index} delay={index * 0.1}>
                <HoverLift>
                  <div className="h-full bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400">
                      {feature.description}
                    </p>
                  </div>
                </HoverLift>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInOnScroll>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-12 lg:p-20 text-center">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
              
              <PulsingElement duration={3} scale={1.02}>
                <div className="relative z-10">
                  <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
                    Ready to Transform Your<br />Student Experience?
                  </h2>
                  <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
                    Join thousands of students who are already connecting, learning, and growing together on StudentConnect.
                  </p>
                  
                  <ElasticButton
                    onClick={onGetStarted}
                    className="px-10 py-4 bg-white text-indigo-600 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-shadow"
                  >
                    Get Started for Free
                  </ElasticButton>
                  
                  <p className="mt-4 text-sm text-white/60">
                    No credit card required. Start connecting in seconds.
                  </p>
                </div>
              </PulsingElement>
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <motion.div 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                StudentConnect
              </span>
            </motion.div>
            
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              © 2026 StudentConnect. All rights reserved.
            </p>
            
            <div className="flex items-center gap-6">
              <HoverScale>
                <a href="#" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Privacy
                </a>
              </HoverScale>
              <HoverScale>
                <a href="#" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Terms
                </a>
              </HoverScale>
              <HoverScale>
                <a href="#" className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Contact
                </a>
              </HoverScale>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
