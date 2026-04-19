export function identifyCategory(headers: any[], labels: string[]): string {
    const labelSet = new Set(labels.map(l => l.toLowerCase()));
    const subject = (headers.find(h => h.name.toLowerCase() === 'subject')?.value || '').toLowerCase();
    const from = (headers.find(h => h.name.toLowerCase() === 'from')?.value || '').toLowerCase();

    if (labelSet.has('spam')) return 'spam';
    if (labelSet.has('category_promotions') || labelSet.has('promotions')) return 'promotions';
    if (labelSet.has('important')) return 'important';
    
    // Check for newsletters (List-Unsubscribe header or common terms)
    const hasUnsub = headers.some(h => h.name.toLowerCase() === 'list-unsubscribe');
    if (hasUnsub || from.includes('newsletter') || subject.includes('newsletter')) return 'newsletters';

    // Check for OTP/Auth
    const otpKeywords = ['otp', 'verification code', 'verify', 'password reset', 'login code', 'security code', 'your code'];
    if (otpKeywords.some(kw => subject.includes(kw))) return 'otp';

    return 'other';
}
