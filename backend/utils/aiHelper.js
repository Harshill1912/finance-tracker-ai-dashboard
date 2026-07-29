const axios = require('axios');

/**
 * Centralized AI Helper function calling Cohere AI models with multi-model fallbacks.
 * @param {string} prompt - The prompt to send to AI
 * @param {number} maxTokens - Max tokens for response (default: 500)
 * @returns {Promise<string>} AI response text or empty string on failure
 */
const callOpenAI = async (prompt, maxTokens = 500) => {
  const apiKey = process.env.COHERE_API_KEY;
  
  if (!apiKey) {
    console.error('[aiHelper] No Cohere API key found in process.env.COHERE_API_KEY');
    return '';
  }
  
  // Cohere v2 chat models in order of preference
  const models = [
    'command-a-03-2025',
    'command-r7b-12-2024',
    'command-r-plus-08-2024',
    'command-r-08-2024',
    'command-r-plus',
    'command-r',
    'command'
  ];
  
  // 1. Try Cohere v2 Chat API
  for (const model of models) {
    try {
      console.log(`[aiHelper] Calling Cohere v2/chat with model: ${model}`);
      
      const response = await axios.post(
        'https://api.cohere.com/v2/chat',
        {
          model: model,
          messages: [
            { 
              role: 'system', 
              content: 'You are a helpful, accurate financial advisor AI assistant. Provide clear, actionable, and personalized financial advice formatted nicely with markdown.' 
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 25000
        }
      );

      const result = response.data?.message?.content?.[0]?.text?.trim() || '';
      
      if (result) {
        console.log(`[aiHelper] Cohere ${model} success! Response length: ${result.length}`);
        return result;
      }
      console.warn(`[aiHelper] Cohere ${model} returned empty content, trying next model...`);
    } catch (error) {
      console.warn(
        `[aiHelper] Cohere ${model} error:`, 
        error.response?.status, 
        error.response?.data?.message || error.message
      );
    }
  }

  // 2. Fallback to Cohere v1 Generate API if v2 fails
  try {
    console.log('[aiHelper] Trying Cohere v1/generate fallback...');
    const response = await axios.post(
      'https://api.cohere.ai/v1/generate',
      {
        model: 'command',
        prompt: `System: You are a helpful financial advisor AI assistant.\nUser: ${prompt}\nAssistant:`,
        max_tokens: maxTokens,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      }
    );

    const v1Result = response.data?.generations?.[0]?.text?.trim() || '';
    if (v1Result) {
      console.log('[aiHelper] Cohere v1 generate success!');
      return v1Result;
    }
  } catch (v1Err) {
    console.warn('[aiHelper] Cohere v1 generate error:', v1Err.response?.status, v1Err.message);
  }
  
  console.error('[aiHelper] All Cohere models and endpoints failed');
  return '';
};

module.exports = {
  callOpenAI
};
