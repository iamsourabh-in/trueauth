const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env if it exists (for local testing of the script)
dotenv.config();

const targetPath = './src/environments/environment.prod.ts';

// Helper to get env with error if missing
const getEnv = (name) => {
  const val = process.env[name];
  if (!val || val === 'undefined') {
    console.error(`ERROR: Environment variable ${name} is missing!`);
    process.exit(1);
  }
  return val;
};

// Get values from environment variables (e.g. set in Vercel UI)
const envConfigFile = `export const environment = {
  production: true,
  supabaseUrl: '${getEnv('SUPABASE_URL')}',
  supabaseKey: '${getEnv('SUPABASE_ANON_KEY')}',
  apiUrl: '${getEnv('API_URL')}'
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
