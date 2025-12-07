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

  const { access_token } = req.body;

  if (!access_token) {
    return res.status(400).json({ error: 'Access token is required' });
  }

  try {
    // Note: in Sandbox, we might not get immediate recurring transactions.
    // Plaid documentation says /transactions/recurring/get returns a list of streams.
    const response = await client.transactionsRecurringGet({
      access_token: access_token,
      options: {
        include_personal_finance_category: true,
      },
    });

    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching recurring transactions:', error);
    return res.status(500).json({ error: error.message });
  }
}
