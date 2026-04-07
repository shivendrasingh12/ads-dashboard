/**
 * One-time script to get your Google Ads refresh token.
 * 
 * Run this ONCE on your local machine:
 *   node scripts/get-google-refresh-token.js
 *
 * Prerequisites:
 *   npm install googleapis
 *
 * What it does:
 * 1. Opens a browser URL for you to log in with the Google account that has access to your Ads account
 * 2. After you approve, pastes the code back here
 * 3. Prints the refresh token — copy it to your .env / Vercel env vars
 */

const { google } = require('googleapis')
const readline = require('readline')

// ← Paste your values from Google Cloud Console here
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID'
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET'
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob' // "out of band" — works without a web server

const SCOPES = [
  'https://www.googleapis.com/auth/adwords', 'https://www.googleapis.com/auth/spreadsheets.readonly',
]

async function main() {
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // forces refresh token to be returned
  })

  console.log('\n==========================================================')
  console.log('STEP 1: Open this URL in your browser and log in:')
  console.log('==========================================================')
  console.log('\n' + authUrl + '\n')
  console.log('==========================================================')
  console.log('STEP 2: After approving, paste the code shown below:')
  console.log('==========================================================\n')

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  
  rl.question('Paste the authorization code here: ', async (code) => {
    rl.close()
    try {
      const { tokens } = await oauth2Client.getToken(code.trim())
      console.log('\n==========================================================')
      console.log('SUCCESS! Your refresh token:')
      console.log('==========================================================')
      console.log('\nGOOGLE_REFRESH_TOKEN=' + tokens.refresh_token)
      console.log('\n==========================================================')
      console.log('Copy the line above into your .env.local file and Vercel env vars.')
      console.log('You will NOT need to run this script again.')
      console.log('==========================================================\n')
    } catch (err) {
      console.error('Error getting tokens:', err.message)
      console.log('Make sure you copied the full code and try again.')
    }
  })
}

main()
