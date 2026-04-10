import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://umkvxtuuqodyhrbtehma.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVta3Z4dHV1cW9keWhyYnRlaG1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MjU2OTAsImV4cCI6MjA4ODUwMTY5MH0.C3S848uVhDwJmQ2FtlwV59iRlE39CPAtybSs_zzCaWw';

const supabase = createClient(supabaseUrl, supabaseKey);

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { action, userId, points } = JSON.parse(event.body || '{}');

    switch (action) {
      case 'award_points': {
        // Award points to user
        const { data: profile, error: fetchError } = await supabase
          .from('profiles')
          .select('points')
          .eq('id', userId)
          .single();

        if (fetchError) throw fetchError;

        const newPoints = (profile?.points || 0) + points;

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ points: newPoints })
          .eq('id', userId);

        if (updateError) throw updateError;

        return {
          statusCode: 200,
          body: JSON.stringify({ success: true, points: newPoints }),
        };
      }

      case 'update_streak': {
        // Update user streak
        const { data: profile, error: fetchError } = await supabase
          .from('profiles')
          .select('streak_days')
          .eq('id', userId)
          .single();

        if (fetchError) throw fetchError;

        const newStreak = (profile?.streak_days || 0) + 1;

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ streak_days: newStreak })
          .eq('id', userId);

        if (updateError) throw updateError;

        return {
          statusCode: 200,
          body: JSON.stringify({ success: true, streak: newStreak }),
        };
      }

      case 'get_leaderboard': {
        // Get top users by points
        const { data: leaders, error } = await supabase
          .from('profiles')
          .select('id, username, points, streak_days')
          .order('points', { ascending: false })
          .limit(10);

        if (error) throw error;

        return {
          statusCode: 200,
          body: JSON.stringify({ leaderboard: leaders }),
        };
      }

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid action' }),
        };
    }
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };
