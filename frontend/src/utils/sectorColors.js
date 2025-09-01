// Authoritative top-level sector list (GICS top level) with stable colors
export const TOP_LEVEL_SECTORS = [
  'Energy',
  'Materials',
  'Industrials',
  'Consumer Discretionary',
  'Consumer Staples',
  'Health Care',
  'Financials',
  'Information Technology',
  'Communication Services',
  'Utilities',
  'Real Estate'
]

export const SECTOR_COLORS = {
  'energy': '#ef4444',
  'materials': '#a855f7',
  'industrials': '#64748b',
  'consumer discretionary': '#f472b6',
  'consumer staples': '#22c55e',
  'health care': '#f59e0b',
  'financials': '#06b6d4',
  'information technology': '#6b8afd',
  'communication services': '#7c3aed',
  'utilities': '#3b82f6',
  'real estate': '#10b981',
  'other': '#94a3b8'
}

// Map common Finnhub finnhubIndustry names to their top-level GICS sector
// This is a growing map; unknown industries will be hashed to a color but grouped under "Other"
export const INDUSTRY_TO_SECTOR = {
  'semiconductors': 'Information Technology',
  'semiconductor equipment & materials': 'Information Technology',
  'software—infrastructure': 'Information Technology',
  'software—application': 'Information Technology',
  'information technology services': 'Information Technology',
  'electronic components': 'Information Technology',
  'communication equipment': 'Information Technology',
  'internet content & information': 'Communication Services',
  'entertainment': 'Communication Services',
  'telecom services': 'Communication Services',
  'interactive media & services': 'Communication Services',
  'apparel retail': 'Consumer Discretionary',
  'specialty retail': 'Consumer Discretionary',
  'automotive': 'Consumer Discretionary',
  'internet retail': 'Consumer Discretionary',
  'household products': 'Consumer Staples',
  'beverages—non-alcoholic': 'Consumer Staples',
  'beverages—brewers': 'Consumer Staples',
  'food distribution': 'Consumer Staples',
  'biotechnology': 'Health Care',
  'drug manufacturers—general': 'Health Care',
  'health care plans': 'Health Care',
  'medical devices': 'Health Care',
  'banks—diversified': 'Financials',
  'asset management': 'Financials',
  'capital markets': 'Financials',
  'insurance—diversified': 'Financials',
  'aerospace & defense': 'Industrials',
  'machinery': 'Industrials',
  'specialty industrial machinery': 'Industrials',
  'electrical equipment & parts': 'Industrials',
  'oil & gas integrated': 'Energy',
  'oil & gas e&p': 'Energy',
  'utilities—regulated electric': 'Utilities',
  'utilities—renewable': 'Utilities',
  'real estate services': 'Real Estate',
  'reit—specialty': 'Real Estate',
  'chemicals': 'Materials',
  'metals & mining': 'Materials'
}

function hashToPalette(input, palette) {
  let h = 0
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

export function normalizeSectorOrIndustry(label) {
  const s = String(label || '').trim()
  if (!s) return { sector: 'Other', display: 'Other' }
  const low = s.toLowerCase()
  // direct sector match
  for (const sector of TOP_LEVEL_SECTORS) {
    if (low === sector.toLowerCase()) return { sector, display: sector }
  }
  // industry to sector mapping
  const mapped = INDUSTRY_TO_SECTOR[low]
  if (mapped) return { sector: mapped, display: s }
  return { sector: 'Other', display: s }
}

export function getSectorColor(label) {
  const { sector } = normalizeSectorOrIndustry(label)
  const key = sector.toLowerCase()
  const known = SECTOR_COLORS[key]
  if (known) return known
  // fallback deterministic palette
  const palette = Object.values(SECTOR_COLORS)
  return hashToPalette(key, palette)
}

// For raw industry strings straight from the data source (e.g., Finnhub finnhubIndustry),
// return a stable color without attempting to map to GICS. This guarantees coverage and consistency
// without requiring a hardcoded list.
export function getIndustryColor(industryLabel) {
  const s = String(industryLabel || 'Other').trim().toLowerCase()
  const palette = [
    '#6b8afd', '#7c3aed', '#f472b6', '#22c55e', '#f59e0b',
    '#06b6d4', '#64748b', '#ef4444', '#a855f7', '#10b981', '#3b82f6', '#94a3b8'
  ]
  return hashToPalette(s || 'other', palette)
}


