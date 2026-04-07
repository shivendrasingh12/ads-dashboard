import { isGoogleConfigured } from '../../lib/googleAds'
import { isMetaConfigured } from '../../lib/metaAds'

export default function handler(req, res) {
  res.status(200).json({
    google: {
      connected: isGoogleConfigured(),
      missing: getMissingGoogleVars(),
    },
    meta: {
      connected: isMetaConfigured(),
      missing: getMissingMetaVars(),
    },
  })
}

function getMissingGoogleVars() {
  const required = {
    GOOGLE_CLIENT_ID: 'Client ID',
    GOOGLE_CLIENT_SECRET: 'Client Secret',
    GOOGLE_DEVELOPER_TOKEN: 'Developer Token',
    GOOGLE_REFRESH_TOKEN: 'Refresh Token',
    GOOGLE_CUSTOMER_ID: 'Customer ID',
  }
  return Object.entries(required)
    .filter(([key]) => !process.env[key])
    .map(([, label]) => label)
}

function getMissingMetaVars() {
  const required = {
    META_ACCESS_TOKEN: 'Access Token',
    META_AD_ACCOUNT_ID: 'Ad Account ID',
  }
  return Object.entries(required)
    .filter(([key]) => !process.env[key])
    .map(([, label]) => label)
}
