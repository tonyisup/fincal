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

  const { public_token } = req.body;

  try {
    const response = await client.itemPublicTokenExchange({
      public_token: public_token,
    });

    return res.status(200).json({ access_token: response.data.access_token });
  } catch (error) {
    console.error('Error exchanging public token:', error);
    return res.status(500).json({ error: error.message });
  }
}
