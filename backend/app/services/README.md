# AI Services

This directory contains AI-powered services for the FinanceConsulter application.

## AI Insights Generator

### Overview
The `ai_insights_generator.py` service uses **Google Gemini 2.0 Flash** to analyze user financial data and generate personalized insights with actionable recommendations.

### Features
- **Financial Health Score**: 0-100 rating based on savings, spending control, categorization, emergency fund, and debt levels
- **Smart Pattern Detection**: Identifies spending patterns, budget overruns, and financial opportunities
- **Personalized Recommendations**: Specific, actionable advice with estimated impact (e.g., "Save CHF 120/month")
- **Multi-Severity Insights**: Alert (urgent), Warning (watch), and Good (strengths)
- **Swiss Context**: Uses CHF currency, Swiss brands (Migros, Coop, SBB), and local benchmarks

### Setup

1. **Install Dependencies**
```bash
pip install google-generativeai
```

2. **Get Gemini API Key**
- Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
- Create a new API key
- Copy the key

3. **Set Environment Variable**

add to `.env` file in the /backend folder:
```
GEMINI_API_KEY=your-api-key-here
```

### API Endpoints

#### Get Latest Insights

Retrieves the most recently generated insights from the database without triggering a new analysis. Ideal for initial page load.
```
GET /ai-insights/
Authorization: Bearer <token>
```

**Response:**
```json
{
  "health_score": 78,
  "summary": "Overall financial health is good with room for improvement",
  "last_analyzed": "2025-11-30 14:30:00",
  "insights": [
    {
      "id": 1,
      "severity": "alert",
      "category": "Budget",
      "title": "Entertainment Budget Exceeded",
      "description": "You've spent CHF 290 on entertainment this month, exceeding your CHF 200 budget by 45%.",
      "ai_analysis": "Based on your spending pattern, you tend to overspend on streaming services...",
      "recommendations": [
        {
          "title": "Pause unused subscriptions",
          "description": "You have Disney+ and Audible with no usage this month",
          "impact": "Save CHF 25/month"
        }
      ],
      "detected_at": "2 hours ago",
      "is_resolved": false
    }
  ]
}
```

#### Generate New Insights
Triggers a live analysis using the latest transaction data via Google Gemini and saves the result to the database.
```
POST /ai-insights/generate
Authorization: Bearer <token>
```
Response: Returns the same JSON structure as the GET endpoint, but with freshly generated data.

### Usage Example
You can also use the generator class directly within other Python scripts:
```python
from services.ai_insights_generator import AIInsightsGenerator

# Initialize generator (reads API key from env)
generator = AIInsightsGenerator()

# Prepare data (dictionaries)
transactions = [...]  # List of transaction dicts
categories = [...]    # List of category dicts
accounts = [...]      # List of account dicts
user = {...}          # User info dict

# Generate insights
insights = generator.generate_insights(
    transactions=transactions,
    categories=categories,
    accounts=accounts,
    user=user
)

print(f"Health Score: {insights['health_score']}")
print(f"Number of Insights: {len(insights['insights'])}")
```

### Insight Categories

- **Budget**: Budget overruns and underspending
- **Spending**: General spending patterns and trends
- **Savings**: Savings habits and goals
- **Cash Flow**: Income/expense patterns and volatility
- **Subscriptions**: Recurring charges and unused services
- **Transport**: Commute and travel costs
- **Fixed Costs**: Rent, utilities, insurance
- **Debt**: Credit cards, loans, interest
- **Emergency Fund**: Rainy day fund status

### Severity Levels

1. **Alert** 🔴 (Urgent): Requires immediate attention
   - Budget overruns
   - Risky spending patterns
   - Income volatility

2. **Warning** ⚠️ (Watch): Should be monitored
   - Rising costs
   - Subscription creep
   - Inefficiencies

3. **Good** ✅ (Strength): Positive patterns
   - Consistent savings
   - Low debt
   - Smart shopping habits

### Cost Estimation

- Model: Gemini 2.0 Flash (free tier available)
- Average Request Size: ~2-5 KB (transactions + metadata)
- Response Time: 2-5 seconds
- Free Tier: 15 requests/minute, 1500 requests/day
- Cost (paid): $0.00125 per 1K input tokens, $0.005 per 1K output tokens

### Troubleshooting

**Error: "GEMINI_API_KEY not found"**
- Ensure environment variable is set
- Restart the FastAPI server after setting the variable

**Error: "JSON parsing failed"**
- Gemini sometimes returns markdown-wrapped JSON
- The code automatically strips ```json``` blocks
- If persists, check the raw response in logs

**Error: "Rate limit exceeded"**
- Free tier: 15 RPM, 1500 RPD
- Consider caching insights (valid for 24h)
- Upgrade to paid tier for higher limits

### Future Enhancements (File 2)

The second file will handle:
- **Caching**: Store insights in database, refresh daily
- **Trends**: Compare month-over-month changes
- **Goals**: Track progress toward user-defined goals
- **Alerts**: Push notifications for urgent insights
- **Customization**: User preferences for insight types
