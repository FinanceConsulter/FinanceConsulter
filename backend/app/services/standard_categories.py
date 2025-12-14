from __future__ import annotations

# IMPORTANT:
# The DB enforces UniqueConstraint(user_id, name), so every category/subcategory name
# in this tree must be globally unique per user (no repeated "Other", etc.).

STANDARD_CATEGORIES: list[dict] = [
    {
        "name": "Banktransfer",
        "type": "neutral",
        "subcategories": [],
    },
    {
        "name": "Housing",
        "type": "expense",
        "subcategories": [
            "Rent",
            "Utilities",
            "Internet & Mobile",
            "Home Insurance",
        ],
    },
    {
        "name": "Food & Drinks",
        "type": "expense",
        "subcategories": [
            "Groceries",
            "Restaurants & Cafés",
            "Takeaway & Delivery",
        ],
    },
    {
        "name": "Transport",
        "type": "expense",
        "subcategories": [
            "Public Transport",
            "Fuel",
            "Parking & Tolls",
            "Car Maintenance",
        ],
    },
    {
        "name": "Health",
        "type": "expense",
        "subcategories": [
            "Health Insurance",
            "Doctor & Pharmacy",
        ],
    },
    {
        "name": "Shopping",
        "type": "expense",
        "subcategories": [
            "Clothing",
            "Electronics",
            "Household Goods",
        ],
    },
    {
        "name": "Leisure",
        "type": "expense",
        "subcategories": [
            "Entertainment",
            "Sports & Fitness",
            "Hobbies",
            "Travel & Holidays",
        ],
    },
    {
        "name": "Subscriptions",
        "type": "expense",
        "subcategories": [
            "Streaming",
            "Software & Apps",
            "Memberships",
        ],
    },
    {
        "name": "Education",
        "type": "expense",
        "subcategories": [
            "Courses",
            "Books & Learning",
        ],
    },
    {
        "name": "Finance",
        "type": "expense",
        "subcategories": [
            "Bank Fees",
            "Taxes",
            "Interest & Charges",
        ],
    },
    {
        "name": "Gifts & Donations",
        "type": "expense",
        "subcategories": [
            "Gifts",
            "Donations",
        ],
    },
    {
        "name": "Salary",
        "type": "income",
        "subcategories": [
            "Main Salary",
            "Bonus",
        ],
    },
    {
        "name": "Other Income",
        "type": "income",
        "subcategories": [
            "Refunds",
            "Gifts Received",
            "Investment Income",
        ],
    },
]
