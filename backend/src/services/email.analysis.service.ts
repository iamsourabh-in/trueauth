import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.LLM_API_KEY || '');

export function identifyCategory(headers: any[], labels: string[]): string {
    const labelSet = new Set(labels.map(l => l.toLowerCase()));
    const subject = (headers.find(h => h.name.toLowerCase() === 'subject')?.value || '').toLowerCase();
    const from = (headers.find(h => h.name.toLowerCase() === 'from')?.value || '').toLowerCase();

    if (labelSet.has('spam')) return 'spam';
    if (labelSet.has('category_promotions') || labelSet.has('promotions')) return 'promotions';
    if (labelSet.has('important')) return 'important';
    
    // Check for newsletters (List-Unsubscribe header or common terms)
    const hasUnsub = headers.some(h => h.name.toLowerCase() === 'list-unsubscribe');
    if (hasUnsub || from.includes('newsletter') || subject.includes('newsletter')) return 'newsletter';

    // Check for OTP/Auth
    const otpKeywords = ['otp', 'verification code', 'verify', 'password reset', 'login code', 'security code', 'your code'];
    if (otpKeywords.some(kw => subject.includes(kw))) return 'otp';

    return 'personal';
}

export async function analyzeEmailWithAI(email: { subject: string, sender: string, body: string }) {
    if (!process.env.LLM_API_KEY) return null;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
            Analyze this email and provide a JSON response with:
            1. category (one of: personal, work, travel, finance, newsletter, shopping, recruitment, technical, notification)
            2. tags (array of 3-5 keywords)
            3. sentiment (positive, neutral, negative)
            4. priority (high, medium, low)
            5. summary (one sentence)

            Subject: ${email.subject}
            From: ${email.sender}
            Body: ${email.body.substring(0, 1000)}

            IMPORTANT: Return ONLY valid JSON.
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return null;
    } catch (error) {
        console.error('AI Analysis failed', error);
        return null;
    }
}

