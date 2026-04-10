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
    const { action, userId, data } = JSON.parse(event.body || '{}');

    switch (action) {
      case 'send_notification': {
        // Store notification in database
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title: data.title,
            message: data.message,
            type: data.type || 'info',
            read: false,
          });

        if (error) throw error;

        return {
          statusCode: 200,
          body: JSON.stringify({ success: true }),
        };
      }

      case 'get_notifications': {
        // Get user notifications
        const { data: notifications, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        return {
          statusCode: 200,
          body: JSON.stringify({ notifications }),
        };
      }

      case 'mark_read': {
        // Mark notification as read
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', data.notificationId)
          .eq('user_id', userId);

        if (error) throw error;

        return {
          statusCode: 200,
          body: JSON.stringify({ success: true }),
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
