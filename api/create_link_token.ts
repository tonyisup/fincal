import { PlaidApi, Configuration, PlaidEnvironments } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const client = new PlaidApi(configuration);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const createTokenResponse = await client.linkTokenCreate({
      user: {
        client_user_id: 'user-id', // In a real app, this should be a unique identifier for the authenticated user
      },
      client_name: 'Fin Cal',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    });

    return res.status(200).json(createTokenResponse.data);
  } catch (error) {
    console.error('Error creating link token:', error);
    return res.status(500).json({ error: error.message });
  }
}
