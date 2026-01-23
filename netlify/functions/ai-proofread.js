const fetch = require('node-fetch');

// Debug: Check if environment variable is loaded
console.log('Environment variables:', Object.keys(process.env));
console.log('MISTRAL_API_KEY exists:', !!process.env.MISTRAL_API_KEY);

exports.handler = async function(event, context) {
  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const { text, tone = 'professional', style = 'formal', focus = 'grammar' } = JSON.parse(event.body);

    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Text is required' })
      };
    }

    // Get Mistral API key from environment variables (secure)
    const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
    
    if (!MISTRAL_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API key not configured' })
      };
    }

    const prompt = `Please proofread and improve the following text for ${focus}. Make it ${tone} and ${style}. Return only the improved text without explanations:

${text}`;

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'mistral-tiny',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const improvedText = data.choices[0]?.message?.content || text;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        success: true,
        originalText: text,
        improvedText: improvedText.trim(),
        tone: tone,
        style: style,
        focus: focus
      })
    };

  } catch (error) {
    console.error('AI proofread error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
