import os
from datetime import datetime, timedelta
from typing import List, Dict, Any
import google.generativeai as genai
import json
from pathlib import Path
from dotenv import load_dotenv
import time

load_dotenv()


class AIInsightsGenerator:
    """
    Generates AI-powered financial insights using Gemini 2.5 Pro.
    Analyzes transactions, categories, and spending patterns to provide
    personalized recommendations.
    """
    
    def __init__(self, api_key: str = None):
        """
        Initialize the AI Insights Generator.
        
        Args:
            api_key: Google Gemini API key. If None, reads from GEMINI_API_KEY env variable from .env file.
        """
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY must be set in .env file or provided as argument")
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('models/gemini-2.5-flash')
    
    def prepare_financial_data(
        self,
        transactions: List[Dict[str, Any]],
        categories: List[Dict[str, Any]],
        accounts: List[Dict[str, Any]],
        user: Dict[str, Any]
    ) -> str:
        """
        Prepare financial data as a structured prompt for the AI model.
        
        Args:
            transactions: List of transaction dictionaries
            categories: List of category dictionaries
            accounts: List of account dictionaries
            user: User information dictionary
            
        Returns:
            Formatted string containing all financial data
        """
        now = datetime.now()
        start_of_month = datetime(now.year, now.month, 1)
        last_month = start_of_month - timedelta(days=1)
        start_of_last_month = datetime(last_month.year, last_month.month, 1)
        three_months_ago = now - timedelta(days=90)
        
        # Organize transactions by time period
        current_month_txs = [t for t in transactions if datetime.fromisoformat(t['date'].replace('Z', '+00:00')) >= start_of_month]
        last_month_txs = [t for t in transactions if start_of_last_month <= datetime.fromisoformat(t['date'].replace('Z', '+00:00')) < start_of_month]
        last_3_months_txs = [t for t in transactions if datetime.fromisoformat(t['date'].replace('Z', '+00:00')) >= three_months_ago]
        
        # Calculate key metrics
        total_balance = sum(t.get('amount_cents', 0) for t in transactions) / 100
        current_month_income = sum(t.get('amount_cents', 0) for t in current_month_txs if t.get('amount_cents', 0) > 0) / 100
        current_month_expenses = abs(sum(t.get('amount_cents', 0) for t in current_month_txs if t.get('amount_cents', 0) < 0)) / 100
        last_month_expenses = abs(sum(t.get('amount_cents', 0) for t in last_month_txs if t.get('amount_cents', 0) < 0)) / 100
        
        # Category breakdown
        category_spending = {}
        for t in current_month_txs:
            if t.get('amount_cents', 0) < 0 and t.get('category_id'):
                cat = next((c for c in categories if c['id'] == t['category_id']), None)
                cat_name = cat['name'] if cat else 'Uncategorized'
                category_spending[cat_name] = category_spending.get(cat_name, 0) + abs(t.get('amount_cents', 0)) / 100
        
        # Count transactions with/without categories
        categorized = len([t for t in transactions if t.get('category_id')])
        uncategorized = len(transactions) - categorized
        
        # Format data for AI
        data_summary = f"""
# User Financial Data Summary

## User Information
- Name: {user.get('first_name', '')} {user.get('last_name', '')}
- User ID: {user.get('id', 'N/A')}

## Overall Financial Position
- Total Balance: CHF {total_balance:.2f}
- Number of Accounts: {len(accounts)}
- Total Transactions: {len(transactions)}
- Categorized Transactions: {categorized} ({(categorized/len(transactions)*100):.1f}%)
- Uncategorized Transactions: {uncategorized}

## Current Month (November 2025)
- Income: CHF {current_month_income:.2f}
- Expenses: CHF {current_month_expenses:.2f}
- Net: CHF {current_month_income - current_month_expenses:.2f}
- Number of Transactions: {len(current_month_txs)}

## Last Month Comparison
- Last Month Expenses: CHF {last_month_expenses:.2f}
- Change: {((current_month_expenses - last_month_expenses) / last_month_expenses * 100):.1f}% {'increase' if current_month_expenses > last_month_expenses else 'decrease'}

## Spending by Category (Current Month)
{json.dumps(category_spending, indent=2)}

## Account Details
{json.dumps([{
    'name': a.get('name', 'Unknown'),
    'type': a.get('account_type', 'Unknown'),
    'currency': a.get('currency_code', 'CHF')
} for a in accounts], indent=2)}

## All Transactions
Date,Description,Amount,Category ID,Account ID
"""
        # Add all transactions in CSV format to save tokens while providing all data
        for t in sorted(transactions, key=lambda x: x.get('date', ''), reverse=True):
            date = t.get('date', '').split('T')[0]
            desc = t.get('description', '').replace(',', ' ')
            amount = t.get('amount_cents', 0) / 100
            cat_id = t.get('category_id', '')
            acc_id = t.get('account_id', '')
            data_summary += f"{date},{desc},{amount},{cat_id},{acc_id}\n"

        data_summary += f"""
## All Categories
{json.dumps([{
    'id': c.get('id'),
    'name': c.get('name', ''),
    'type': c.get('type', '')
} for c in categories], indent=2)}
"""
        return data_summary
    
    def generate_insights(
        self,
        transactions: List[Dict[str, Any]],
        categories: List[Dict[str, Any]],
        accounts: List[Dict[str, Any]],
        user: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate AI-powered financial insights based on user data.
        
        Args:
            transactions: List of user transactions
            categories: List of available categories
            accounts: List of user accounts
            user: User information
            
        Returns:
            Dictionary containing health_score, last_analyzed, and insights list
        """
        # Prepare financial data
        financial_data = self.prepare_financial_data(transactions, categories, accounts, user)
        
        # Create the prompt for Gemini
        prompt = f"""You are an expert financial advisor AI. Analyze the following user's financial data and generate personalized insights.

{financial_data}

Generate a comprehensive financial analysis in the following JSON format:

{{
  "health_score": <number 0-100>,
  "summary": "<brief overall assessment>",
  "insights": [
    {{
      "severity": "<alert|warning|good>",
      "category": "<Budget|Spending|Savings|Cash Flow|Subscriptions|Transport|Fixed Costs|Debt|Emergency Fund>",
      "title": "<concise insight title>",
      "description": "<2-3 sentence description with specific numbers>",
      "ai_analysis": "<detailed AI analysis explaining the pattern, root cause, and context>",
      "recommendations": [
        {{
          "title": "<actionable recommendation title>",
          "description": "<specific step to take>",
          "impact": "<expected outcome with numbers if possible>"
        }}
      ]
    }}
  ]
}}

Guidelines:
1. **health_score**: 0-100 based on:
   - Savings rate (weight: 25%)
   - Spending control (weight: 25%)
   - Category organization (weight: 20%)
   - Emergency fund (weight: 15%)
   - Debt levels (weight: 15%)

2. **insights**: Generate 5-10 insights with mix of severities:
   - **alert** (urgent): Budget overruns, irregular income, risky patterns
   - **warning** (watch): Rising costs, subscription creep, inefficiencies
   - **good** (strength): Consistent savings, low debt, smart habits

3. Each insight must have:
   - Specific numbers from the data (e.g., "CHF 290" not "too much")
   - Clear severity classification
   - 2-4 actionable recommendations
   - Impact estimation (save CHF X/month, Y% improvement, etc.)

4. **AI Analysis** should:
   - Identify patterns (e.g., "overspending in last week of month")
   - Explain root causes (e.g., "impulse purchases", "lifestyle creep")
   - Provide context (e.g., "top 20% of savers in your bracket")
   - Compare to benchmarks when relevant

5. Use Swiss context:
   - Currency: CHF
   - Brands: Migros, Coop, SBB, GA Travelcard, etc.
   - Housing typically 30-40% of income
   - Reference Swiss averages when relevant

Return ONLY the JSON object, no additional text or markdown formatting.
"""
        
        try:
            # Generate insights using Gemini with retry logic for rate limits
            max_retries = 3
            retry_count = 0
            
            while retry_count < max_retries:
                try:
                    response = self.model.generate_content(prompt)
                    break  # Success, exit retry loop
                    
                except Exception as api_error:
                    error_str = str(api_error)
                    
                    # Check if it's a rate limit error (429 TooManyRequests)
                    if "429" in error_str or "TooManyRequests" in error_str or "quota" in error_str.lower():
                        retry_count += 1
                        if retry_count < max_retries:
                            wait_time = 60  # Wait 60 seconds for rate limit reset
                            print(f"⚠️  Rate limit reached. Waiting {wait_time} seconds before retry {retry_count}/{max_retries}...")
                            time.sleep(wait_time)
                        else:
                            print(f"❌ Rate limit exceeded after {max_retries} retries")
                            raise Exception(f"Rate limit exceeded. Please wait a minute and try again.")
                    else:
                        # Not a rate limit error, re-raise immediately
                        raise
            
            # Parse the JSON response
            response_text = response.text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            # Save raw response to JSON file
            try:
                output_dir = Path("output")
                output_dir.mkdir(exist_ok=True)
                with open(output_dir / "ai_response.json", "w", encoding="utf-8") as f:
                    f.write(response_text)
            except Exception as e:
                print(f"Failed to save AI response to file: {e}")

            insights_data = json.loads(response_text.strip())
            
            # Add metadata
            insights_data['last_analyzed'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # Add IDs and timestamps to insights
            for idx, insight in enumerate(insights_data.get('insights', [])):
                insight['id'] = idx + 1
                insight['detected_at'] = self._get_relative_time(datetime.now())
                insight['is_resolved'] = False
            
            return insights_data
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON response: {e}")
            print(f"Raw response: {response.text}")
            raise
        except Exception as e:
            print(f"Error generating insights: {e}")
            raise
    
    def _get_relative_time(self, dt: datetime) -> str:
        """
        Convert datetime to relative time string (e.g., '2 hours ago').
        
        Args:
            dt: Datetime to convert
            
        Returns:
            Relative time string
        """
        now = datetime.now()
        diff = now - dt
        
        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
        elif diff.seconds >= 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.seconds >= 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return "just now"


# Example usage
if __name__ == "__main__":
    # This is for testing purposes
    generator = AIInsightsGenerator()
    
    # Example data structure
    sample_transactions = [
        {
            "id": 1,
            "user_id": 5,
            "account_id": 1,
            "category_id": 3,
            "date": "2025-11-15",
            "description": "Migros Groceries",
            "amount_cents": -8500,
            "tags": []
        },
        # Add more sample transactions...
    ]
    
    sample_categories = [
        {"id": 1, "name": "Groceries", "type": "expense"},
        {"id": 2, "name": "Transport", "type": "expense"},
        {"id": 3, "name": "Entertainment", "type": "expense"},
    ]
    
    sample_accounts = [
        {"id": 1, "name": "Main Account", "account_type": "checking", "currency_code": "CHF"}
    ]
    
    sample_user = {
        "id": 5,
        "first_name": "John",
        "last_name": "Doe"
    }
    
    # Generate insights
    insights = generator.generate_insights(
        transactions=sample_transactions,
        categories=sample_categories,
        accounts=sample_accounts,
        user=sample_user
    )
    
    print(json.dumps(insights, indent=2))
