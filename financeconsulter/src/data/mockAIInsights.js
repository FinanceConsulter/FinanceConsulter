// Mock data for AI Insights
export const MOCK_AI_INSIGHTS = {
  health_score: 78,
  last_analyzed: "2 hours ago",
  insights: [
    // URGENT ALERTS
    {
      id: 1,
      severity: "alert",
      category: "Budget",
      title: "Entertainment Budget Exceeded",
      description: "You've spent CHF 290 on entertainment this month, exceeding your CHF 200 budget by 45%.",
      ai_analysis: "Based on your spending pattern, you tend to overspend on streaming services and dining out in the last week of the month. This is a recurring pattern for the past 3 months.",
      recommendations: [
        {
          title: "Pause unused subscriptions",
          description: "You have Disney+ and Audible with no usage this month",
          impact: "Save CHF 25/month"
        },
        {
          title: "Cook at home 2 more nights per week",
          description: "Replace restaurant visits with meal prep on Thursdays and Fridays",
          impact: "Save CHF 60/month"
        },
        {
          title: "Use free entertainment alternatives",
          description: "Local library has free movie rentals and e-books",
          impact: "Save CHF 30/month"
        }
      ],
      detected_at: "2 hours ago",
      is_resolved: false
    },
    {
      id: 2,
      severity: "alert",
      category: "Cash Flow",
      title: "Irregular Income Pattern Detected",
      description: "Your income has varied by more than 30% over the last 3 months (CHF 4,500 → CHF 3,200 → CHF 4,800).",
      ai_analysis: "Income volatility makes budgeting difficult and increases financial stress. Your lowest month was CHF 3,200, which should be your baseline for essential expenses.",
      recommendations: [
        {
          title: "Build 6-month emergency fund",
          description: "Target: CHF 19,200 (based on average monthly expenses)",
          impact: "Financial security buffer"
        },
        {
          title: "Base budget on lowest income month",
          description: "Use CHF 3,200 as baseline, save surplus months",
          impact: "Predictable spending"
        },
        {
          title: "Diversify income streams",
          description: "Consider part-time freelance or passive income",
          impact: "Reduce volatility"
        }
      ],
      detected_at: "1 day ago",
      is_resolved: false
    },

    // WARNINGS
    {
      id: 3,
      severity: "warning",
      category: "Spending",
      title: "Rising Grocery Costs",
      description: "You spent CHF 850 on groceries this month, which is 23% above your 6-month average of CHF 690.",
      ai_analysis: "Price increases and impulse purchases are the main drivers. You're shopping 4-5 times per week instead of your usual 2-3 times.",
      recommendations: [
        {
          title: "Weekly meal planning",
          description: "Plan meals on Sundays, shop once per week",
          impact: "Save CHF 120/month"
        },
        {
          title: "Buy seasonal produce",
          description: "Seasonal items are 30-40% cheaper at local markets",
          impact: "Save CHF 40/month"
        },
        {
          title: "Use Migros Cumulus deals",
          description: "Stack promotions with Cumulus points",
          impact: "Save CHF 25/month"
        }
      ],
      detected_at: "3 hours ago",
      is_resolved: false
    },
    {
      id: 4,
      severity: "warning",
      category: "Subscriptions",
      title: "Subscription Creep",
      description: "You have 12 active subscriptions totaling CHF 145/month. That's CHF 1,740 annually.",
      ai_analysis: "Analysis shows Disney+ (no usage for 3 months), Audible (1 book in 6 months), and Tidal (Spotify duplicate) are underutilized.",
      recommendations: [
        {
          title: "Cancel unused services",
          description: "Remove Disney+, Audible, and Tidal",
          impact: "Save CHF 45/month"
        },
        {
          title: "Share Netflix with family",
          description: "Split Premium plan with 2 family members",
          impact: "Save CHF 10/month"
        },
        {
          title: "Annual billing for essential services",
          description: "Save 15% by paying Spotify annually",
          impact: "Save CHF 18/year"
        }
      ],
      detected_at: "5 hours ago",
      is_resolved: false
    },
    {
      id: 5,
      severity: "warning",
      category: "Transport",
      title: "Increasing Transport Costs",
      description: "Fuel expenses increased to CHF 320 this month (+28% vs last month).",
      ai_analysis: "Your average distance per trip suggests you're driving for short errands that could be walked or biked.",
      recommendations: [
        {
          title: "Consider GA Travelcard",
          description: "CHF 3,860/year vs your current CHF 3,840/year on fuel + parking",
          impact: "Unlimited travel + save on parking"
        },
        {
          title: "Carpool to work 2x per week",
          description: "Split costs with colleague from Zurich",
          impact: "Save CHF 60/month"
        },
        {
          title: "Bike for trips under 5km",
          description: "30% of your trips are under 5km",
          impact: "Save CHF 40/month + fitness"
        }
      ],
      detected_at: "1 day ago",
      is_resolved: false
    },

    // STRENGTHS
    {
      id: 6,
      severity: "good",
      category: "Savings",
      title: "Consistent Savings Habit",
      description: "You've saved CHF 500+ for 3 consecutive months! 🎉",
      ai_analysis: "This consistency puts you on track to save CHF 6,000 this year. You're in the top 20% of users in your income bracket.",
      recommendations: [
        {
          title: "Increase savings to CHF 600/month",
          description: "You have room in your budget based on recent spending",
          impact: "CHF 7,200 saved annually"
        },
        {
          title: "Automate savings increase",
          description: "Set up automatic transfer on payday",
          impact: "Never forget to save"
        }
      ],
      detected_at: "6 hours ago",
      is_resolved: false
    },
    {
      id: 7,
      severity: "good",
      category: "Fixed Costs",
      title: "Low Fixed Cost Ratio",
      description: "Your rent and utilities are only 28% of your income, well below the recommended 30%.",
      ai_analysis: "This gives you excellent financial flexibility. Most people in Zurich spend 35-40% on housing.",
      recommendations: [
        {
          title: "Maintain current housing situation",
          description: "Your rent is below market rate for the area",
          impact: "Save CHF 200-300/month vs moving"
        }
      ],
      detected_at: "1 day ago",
      is_resolved: false
    },
    {
      id: 8,
      severity: "good",
      category: "Debt",
      title: "Zero Credit Card Debt",
      description: "You have CHF 0 in revolving credit card debt.",
      ai_analysis: "By avoiding credit card interest, you're saving approximately CHF 200/month compared to the average Swiss household.",
      recommendations: [
        {
          title: "Keep using debit card for daily expenses",
          description: "Continue your disciplined spending habits",
          impact: "Maintain zero interest charges"
        }
      ],
      detected_at: "2 days ago",
      is_resolved: false
    },
    {
      id: 9,
      severity: "good",
      category: "Emergency Fund",
      title: "Emergency Fund Progress",
      description: "You have 3.5 months of expenses saved (CHF 10,500).",
      ai_analysis: "You're 58% of the way to the recommended 6-month emergency fund. At your current savings rate, you'll reach the goal in 5 months.",
      recommendations: [
        {
          title: "Reach 6-month target",
          description: "CHF 2,700 more to hit CHF 13,200 goal",
          impact: "Full financial security buffer"
        },
        {
          title: "Keep emergency fund in high-yield savings",
          description: "Move to savings account with 1.5% interest",
          impact: "Earn CHF 200/year in interest"
        }
      ],
      detected_at: "3 days ago",
      is_resolved: false
    },
    {
      id: 10,
      severity: "good",
      category: "Spending",
      title: "Smart Grocery Shopping",
      description: "Despite recent increase, you're still 12% below the Swiss average for grocery spending.",
      ai_analysis: "Your meal planning and bulk buying habits are working well. Keep it up!",
      recommendations: [
        {
          title: "Share successful strategies",
          description: "Your meal prep Sundays are effective",
          impact: "Continue current habits"
        }
      ],
      detected_at: "4 days ago",
      is_resolved: false
    }
  ]
};