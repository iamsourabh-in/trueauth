import { Job } from 'bull';
import { getGmailClient } from '../config/google';
import { supabase } from '../config/supabase';
import { createLogger } from '../lib/logger';

const logger = createLogger('jobs.removal');

const BROKERS = [
  { id: 'whitepages', name: 'Whitepages', email: 'privacy@whitepages.com' },
  { id: 'spokeo', name: 'Spokeo', email: 'optout@spokeo.com' },
  { id: 'beenverified', name: 'BeenVerified', email: 'privacy@beenverified.com' },
  { id: 'intelius', name: 'Intelius', email: 'custserv@intelius.com' },
  { id: 'truthfinder', name: 'TruthFinder', email: 'privacy@truthfinder.com' }
];

function buildCCPAEmail(toEmail: string, identities: any[]): string {
    const emails = identities.filter(i => i.id_type === 'email').map(i => i.id_value).join(', ');
    const phones = identities.filter(i => i.id_type === 'phone').map(i => i.id_value).join(', ');
    const addresses = identities.filter(i => i.id_type === 'address').map(i => i.id_value).join(', ');

    const body = `Hello Privacy Officer,

I am writing to exercise my rights under the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA).

I am requesting that your company entirely opt-out my records from the sale or sharing of my personal information, and initiate a full deletion of my data from your databases.

Please locate and delete my records associated with any of the following details:
Emails: ${emails || 'N/A'}
Phone Numbers: ${phones || 'N/A'}
Addresses: ${addresses || 'N/A'}

I certify that I am the consumer whose personal information is the subject of this request. Please respond within the legally mandated timeframe to confirm completion.

Sincerely,
California Resident`;

    const subject = `Formal CCPA/CPRA Request for Data Deletion`;
    const message = [
        `To: ${toEmail}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        '',
        body
    ].join('\n');

    return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const processRemoval = async (job: Job) => {
  const { userId, tokens } = job.data;
  const gmail = getGmailClient(tokens.gmail_token, tokens.refresh_token);

  try {
    // 1. Fetch user's identities from DB
    const { data: identities, error: idError } = await supabase
      .from('data_removal_identities')
      .select('*')
      .eq('user_id', userId);
      
    if (idError || !identities || identities.length === 0) {
        logger.warn('No identities found for user', { userId });
        return; // Nothing to remove
    }

    // 2. Loop through brokers and send email
    for (const broker of BROKERS) {
        // Create pending request log first
        const { data: reqLog } = await supabase
           .from('data_removal_requests')
           .upsert({ user_id: userId, broker_id: broker.id, status: 'pending' }, { onConflict: 'user_id,broker_id' })
           .select()
           .single();
           
        try {
            const rawMessage = buildCCPAEmail(broker.email, identities);
            
            const req = await gmail.users.messages.send({
                userId: 'me',
                requestBody: { raw: rawMessage }
            });
            
            // Mark as sent
            if (req.data && req.data.id) {
                await supabase
                  .from('data_removal_requests')
                  .update({ status: 'sent', sent_at: new Date().toISOString(), message_id: req.data.id })
                  .eq('user_id', userId)
                  .eq('broker_id', broker.id);
            }
        } catch (e: any) {
            logger.error(`Failed sending to broker ${broker.id}`, { error: e.message });
            await supabase.from('data_removal_requests').update({ status: 'failed' }).eq('user_id', userId).eq('broker_id', broker.id);
        }
    }
    
  } catch (error: unknown) {
    logger.error('Removal job failed', {
      jobId: job.id,
      userId,
      message: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};
