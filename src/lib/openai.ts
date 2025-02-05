import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY environment variable");
}

// Configure OpenAI client with project key support
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY.trim(),
  defaultHeaders: {
    'OpenAI-Beta': 'project' // Enable project key support
  }
}); 