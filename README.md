# Financial Calendar (FinCal)

https://fincal.vercel.app/

A React application that helps you forecast your financial future by integrating with Google Calendar. Track your income and expenses through calendar events and get a clear view of your projected balance.

## Features

- 🔐 Google Calendar Integration
- 💰 Track income and expenses through calendar events
- 📊 Real-time balance forecasting
- 📅 Customizable forecast period
- 🔄 Sortable transaction history
- 💳 Multiple account support (income and expense calendars)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your Google API credentials:
   ```
   VITE_GOOGLE_API_KEY=your_api_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Sign in with your Google account
2. Select your income (credit) and expense (debit) calendars
3. Set your current balance and forecast end date
4. View your projected balance over time

## Calendar Event Format

For the application to properly parse your calendar events, use the following format:

- Income events: `+$1000 Salary`
- Expense events: `-$50 Rent`

## Development

This project uses:
- React + TypeScript
- Vite for build tooling
- Shadcn UI for components
- Google Calendar API for data
- date-fns for date manipulation

## License

MIT
