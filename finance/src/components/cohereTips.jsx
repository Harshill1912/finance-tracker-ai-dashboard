export async function getCohereSavingTip(category, percentage) {
    const prompt = `Give a short and practical financial advice in 2 lines max for overspending in ${category} (at ${percentage}%).`;
  
    const response = await fetch('https://api.cohere.ai/v1/generate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_COHERE_API_KEY}`, // 🔁 Replace with your API key
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command',
        prompt,
        max_tokens: 60,
        temperature: 0.6,
      }),
    });
  
    if (!response.ok) {
      throw new Error('Failed to fetch from Cohere');
    }
  
    const data = await response.json();
    return data.generations[0].text.trim();
  }
  