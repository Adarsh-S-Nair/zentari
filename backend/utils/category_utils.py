def format_category_name(category_name: str) -> str:
    """Format category name for consistency using proper title case"""
    if not category_name:
        return "Uncategorized"
    
    # Replace underscores and extra spaces
    name = category_name.strip().replace("_", " ")
    
    # Lowercase everything first to normalize
    words = name.lower().split()
    if not words:
        return "Uncategorized"
    
    minor_words = {
        'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'nor',
        'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet'
    }

    formatted_words = []
    for i, word in enumerate(words):
        if i == 0 or i == len(words) - 1 or word not in minor_words:
            formatted_words.append(word.capitalize())
        else:
            formatted_words.append(word.lower())

    return ' '.join(formatted_words) 