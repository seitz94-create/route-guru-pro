import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { analysisType, userData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (analysisType) {
      case 'analyze':
        systemPrompt = `You are an expert cycling coach. Analyze training data and provide actionable insights.
        Focus on: training load, recovery, performance trends, areas for improvement.
        Be specific and practical.`;
        userPrompt = `Analyze this cyclist's profile:
        Experience: ${userData.profile?.experience_level}
        FTP: ${userData.profile?.ftp}W
        Weekly training hours: ${userData.profile?.weekly_training_hours}
        Recent sessions: ${userData.sessions?.length || 0}
        
        Provide: current fitness assessment, training load analysis, recovery recommendations, next steps.`;
        break;

      case 'goals':
        systemPrompt = `You are a cycling performance coach helping set SMART goals.
        Create realistic, measurable goals based on current fitness and experience.`;
        userPrompt = `Help set goals for:
        Experience: ${userData.profile?.experience_level}
        FTP: ${userData.profile?.ftp}W
        Discipline: ${userData.profile?.cycling_discipline}
        
        Suggest 3-5 achievable goals for the next 3 months with specific metrics and milestones.`;
        break;

      case 'nutrition':
        systemPrompt = `You are a sports nutritionist specializing in cycling.
        Provide practical nutrition advice for training and recovery.`;
        userPrompt = `Nutrition guidance for:
        Weekly training: ${userData.profile?.weekly_training_hours}h
        Weight: ${userData.profile?.weight_kg}kg
        Discipline: ${userData.profile?.cycling_discipline}
        
        Include: daily calorie needs, pre/during/post-ride nutrition, hydration, supplements.`;
        break;

      default:
        throw new Error('Invalid analysis type');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        const errorMsg = response.status === 429 
          ? 'Rate limit exceeded. Please try again later.'
          : 'Credits exhausted. Please add credits to continue.';
        return new Response(JSON.stringify({ error: errorMsg }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const insights = data.choices[0].message.content;

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-training-insights:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate insights';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
