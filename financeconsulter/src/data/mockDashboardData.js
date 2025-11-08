// Mock Dashboard Data für Frontend-Testing ohne Backend

export const MOCK_DASHBOARD_DATA = {
  user: {
    first_name: "Du möchte gern Admin ;)",
    email: "admin@local"
  },
  
  summary: {
    total_balance: {
      total: 542050,  // in Rappe
      currency: "CHF",
      account_count: 3
    },
    
    month_spend: {
      total: 189500,  
      currency: "CHF",
      trend: {
        value: 12.5,  // +12.5% vs letzten Monat
        direction: "up"
      }
    },
    
    budget_status: {
      spent: 189500,   
      limit: 200000,   
      percentage: 94.75
    },
    
    recent_count: {
      count: 23  // in letzten 7 Tagen
    }
  },
  
  spending_breakdown: [
    {
      category: "Groceries",
      amount: 75000,  
      percent: 39.6
    },
    {
      category: "Transport",
      amount: 45000,  
      percent: 23.7
    },
    {
      category: "Entertainment",
      amount: 32000,  
      percent: 16.9
    },
    {
      category: "Restaurants",
      amount: 28500,
      percent: 15.0
    },
    {
      category: "Shopping",
      amount: 9000,
      percent: 4.7
    }
  ],
  
  cashflow: [
    {
      month: "2024-06",
      income: 450000,
      expense: 210000
    },
    {
      month: "2024-07",
      income: 450000,
      expense: 195000
    },
    {
      month: "2024-08",
      income: 450000,
      expense: 225000
    },
    {
      month: "2024-09",
      income: 480000,
      expense: 198000
    },
    {
      month: "2024-10",
      income: 450000,
      expense: 168000
    },
    {
      month: "2024-11",
      income: 450000,
      expense: 189500
    }
  ],
  
  recent_transactions: [
    {
      id: 1,
      date: "2024-11-04",
      description: "Migros Supermarket",
      category: "Groceries",
      amount_cents: -8500,  
      currency_code: "CHF"
    },
    {
      id: 2,
      date: "2024-11-03",
      description: "SBB Ticket",
      category: "Transport",
      amount_cents: -6200,  
      currency_code: "CHF"
    },
    {
      id: 3,
      date: "2024-11-02",
      description: "Salary November",
      category: null,
      amount_cents: 450000,  
      currency_code: "CHF"
    },
    {
      id: 4,
      date: "2024-11-01",
      description: "Netflix Subscription",
      category: "Entertainment",
      amount_cents: -1690,  
      currency_code: "CHF"
    },
    {
      id: 5,
      date: "2024-10-31",
      description: "Coop Supermarket",
      category: "Groceries",
      amount_cents: -12350,
      currency_code: "CHF"
    }
  ],
  
  recent_receipts: [
    {
      id: 1,
      merchant: "Migros",
      purchase_date: "2024-11-04",
      total_cents: 8500,
      item_count: 12
    },
    {
      id: 2,
      merchant: "Coop",
      purchase_date: "2024-10-31",
      total_cents: 12350,
      item_count: 8
    },
    {
      id: 3,
      merchant: "Denner",
      purchase_date: "2024-10-28",
      total_cents: 4580,
      item_count: 5
    }
  ],
  
  insights: [
    {
      type: "warning",
      message: "You spent 12.5% more this month compared to last month. Your grocery spending increased by CHF 85.00.",
      action: "Review spending"
    },
    {
      type: "info",
      message: "You're at 95% of your monthly budget with 5 days remaining. Consider reviewing non-essential purchases.",
      action: "View budget"
    },
    {
      type: "success",
      message: "Great! You saved CHF 260.00 compared to your average spending in September.",
      action: null
    }
  ]
};
