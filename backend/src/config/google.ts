import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  // Ensure the redirect URL matches what is configured in Google Cloud & Supabase
  'postmessage' 
);

/**
 * Returns a configured standard Google APIs client using a stored refresh/access token.
 */
export const getGoogleAuthClient = (accessToken: string, refreshToken?: string) => {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage'
  );
  
  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return client;
};

export const getGmailClient = (accessToken: string, refreshToken?: string) => {
  const auth = getGoogleAuthClient(accessToken, refreshToken);
  return google.gmail({ version: 'v1', auth });
};

export const getCalendarClient = (accessToken: string, refreshToken?: string) => {
  const auth = getGoogleAuthClient(accessToken, refreshToken);
  return google.calendar({ version: 'v3', auth });
};
