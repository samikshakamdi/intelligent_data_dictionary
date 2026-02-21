from services.schema_extractor import extract_schema

INDUSTRY_KEYWORDS = {
    "Healthcare": ["patient", "doctor", "diagnosis", "hospital", "prescription", "blood_group", "disease", "treatment"],
    "Finance": ["transaction", "account", "balance", "credit", "debit", "loan", "card", "payment"],
    "E-commerce": ["product", "order", "shipping", "cart", "discount", "customer", "price", "seller", "freight", "review", "item"],
    "Education": ["student", "course", "grade", "faculty", "university", "assignment", "semester"],
    "Real Estate": ["property", "rent", "agent", "lease", "broker", "location", "zipcode"],
    "HR": ["employee", "salary", "department", "manager", "attendance", "role"]
}

def detect_industry():
    schema = extract_schema()
    if not schema:
        return {"industry": "Unknown", "confidence": 0, "reason": "No tables found in database."}
        
    all_columns = []
    for table_data in schema.values():
        for col in table_data.get("columns", []):
            all_columns.append(col["name"].lower())
            
    industry_scores = {industry: 0 for industry in INDUSTRY_KEYWORDS.keys()}
    
    for col in all_columns:
        for industry, keywords in INDUSTRY_KEYWORDS.items():
            if any(kw in col for kw in keywords):
                industry_scores[industry] += 1
                
    # Find the industry with the highest score
    best_match = max(industry_scores, key=industry_scores.get)
    max_score = industry_scores[best_match]
    
    if max_score == 0:
        return {"industry": "General/Unknown", "confidence": "Low", "reason": "No industry-specific columns found."}
        
    total_matches = sum(industry_scores.values())
    confidence = round((max_score / total_matches) * 100, 2)
    
    return {
        "industry": best_match,
        "confidence": f"{confidence}%",
        "keywords_matched": max_score,
        "all_scores": industry_scores
    }
