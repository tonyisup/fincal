import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { PlaidApi, Configuration, PlaidEnvironments } from 'plaid';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const app = express();
const port = 3001;

app.use(cors());
app.use(bodyParser.json());

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

app.post('/api/create_link_token', async (req, res) => {
  try {
    const createTokenResponse = await client.linkTokenCreate({
      user: {
        client_user_id: 'user-id',
      },
      client_name: 'Fin Cal',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en',
    });
    res.json(createTokenResponse.data);
  } catch (error) {
    console.error('Error creating link token:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/exchange_public_token', async (req, res) => {
  const { public_token } = req.body;
  try {
    const response = await client.itemPublicTokenExchange({
      public_token: public_token,
    });
    res.json({ access_token: response.data.access_token });
  } catch (error) {
    console.error('Error exchanging public token:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/get_recurring_transactions', async (req, res) => {
  const { access_token } = req.body;
  try {
    const response = await client.transactionsRecurringGet({
      access_token: access_token,
      options: {
        include_personal_finance_category: true,
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching recurring transactions:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Local API server running at http://localhost:${port}`);
});
