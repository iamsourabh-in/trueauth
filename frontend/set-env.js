const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env if it exists (for local testing of the script)
dotenv.config();

const targetPath = './src/environments/environment.prod.ts';

// Get values from environment variables (e.g. set in Vercel UI)
const envConfigFile = `export const environment = {
  production: true,
  supabaseUrl: '${process.env.SUPABASE_URL}',
  supabaseKey: '${process.env.SUPABASE_ANON_KEY}',
  apiUrl: '${process.env.API_URL}'
};
`;

console.log('Generating environment.prod.ts...');

fs.writeFile(targetPath, envConfigFile, function (err) {
   if (err) {
       throw console.error(err);
   } else {
       console.log(`Angular environment.prod.ts file generated correctly at ${targetPath} \n`);
   }
});
