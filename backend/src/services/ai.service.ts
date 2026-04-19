import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { createLogger } from '../lib/logger';

dotenv.config();

const logger = createLogger('services.ai');

const apiKey = process.env.LLM_API_KEY as string;
if (!apiKey) {
  logger.warn('LLM_API_KEY is not defined; AI features will fail until it is set.');
}

const genAI = new GoogleGenerativeAI(apiKey || 'mock-key');

export const generateDraftReply = async (contextEmails: string[], currentThread: string): Promise<string> => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
    You are an AI assistant helping draft a reply to an email thread.
    Use the sender's tone based on their previous emails.
    
    Previous Context (to learn tone):
    ${contextEmails.join('\n---\n')}
    
    Current Thread:
    ${currentThread}
    
    Draft a professional, helpful reply. Just provide the email body.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
};

export const extractCalendarDetails = async (emailContent: string): Promise<any> => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `
    Extract event details from the following email. If a meeting is mentioned, extract the Title, Start Time, and End Time (assuming ISO format strings). Let's assume today is ${new Date().toISOString()}.
    
    Email:
    ${emailContent}
    
    Return a JSON object: { "title": "...", "start": "...", "end": "..." }. Only output JSON, nothing else.
    `;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    // Attempt parsing JSON logic
    try {
        const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(text);
    } catch (e) {
        throw new Error('Failed to parse LLM calendar extraction');
    }
};

export const evaluateSubscription = async (emailContent: string): Promise<boolean> => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
    Determine if the following email is a marketing newsletter or subscription.
    
    Email:
    ${emailContent}
    
    Reply with "YES" if it's a subscription, "NO" otherwise.
    `;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().toLowerCase();
    
    return text.includes("yes");
};
