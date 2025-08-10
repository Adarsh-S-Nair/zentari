import React, { useContext, useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MdEdit } from 'react-icons/md';
import { FaChevronRight } from 'react-icons/fa';
import IconButton from '../ui/IconButton';
import CategoryIcon from '../ui/CategoryIcon';
import { FinancialContext } from '../../contexts/FinancialContext';
import { formatCurrency, capitalizeWords, formatDate } from '../../utils/formatters';
import Spinner from '../ui/Spinner';
import BalanceTabs from '../ui/BalanceTabs';
import { AccountCard } from '../ui/AccountCardsCarousel';
import SlideOver from '../ui/SlideOver';
import { getApiBaseUrl } from '../../utils/api';

function hexToRgba(hex, alpha = 1) {
  const h = (hex || '').replace('#', '')
  if (!h) return `rgba(0,0,0,${alpha})`
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const r = parseInt(full.substring(0,2), 16)
  const g = parseInt(full.substring(2,4), 16)
  const b = parseInt(full.substring(4,6), 16)
  return `rgba(${isNaN(r)?0:r}, ${isNaN(g)?0:g}, ${isNaN(b)?0:b}, ${alpha})`
}

function UsageBar({ value = 0, max = 0 }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className="w-full h-2 rounded-md overflow-hidden" style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-primary)' }}>
      <div className="h-full" style={{ width: `${pct}%`, background: 'var(--brand-spending-hex)' }} />
    </div>
  )
}

// Function to get brand color from institution name
const getBrandColor = (institutionName) => {
  if (!institutionName) return null;
  
  const name = institutionName.toLowerCase();
  
  // Bank of America - Red
  if (name.includes('bank of america') || name.includes('bofa')) {
    return 'linear-gradient(135deg, #E31837 0%, #C41230 100%)';
  }
  
  // Chase - Blue
  if (name.includes('chase') || name.includes('jpmorgan')) {
    return 'linear-gradient(135deg, #117ACA 0%, #0E5FA3 100%)';
  }
  
  // Wells Fargo - Red
  if (name.includes('wells fargo')) {
    return 'linear-gradient(135deg, #D71E28 0%, #B71C1C 100%)';
  }
  
  // Citibank - Blue
  if (name.includes('citi') || name.includes('citibank')) {
    return 'linear-gradient(135deg, #0066CC 0%, #004499 100%)';
  }
  
  // Capital One - Orange
  if (name.includes('capital one')) {
    return 'linear-gradient(135deg, #FF6600 0%, #E55A00 100%)';
  }
  
  // American Express - Blue
  if (name.includes('american express') || name.includes('amex')) {
    return 'linear-gradient(135deg, #006FCF 0%, #0056A3 100%)';
  }
  
  // Discover - Orange
  if (name.includes('discover')) {
    return 'linear-gradient(135deg, #FF6000 0%, #E55A00 100%)';
  }
  
  // US Bank - Green
  if (name.includes('us bank') || name.includes('usbank')) {
    return 'linear-gradient(135deg, #006633 0%, #004D26 100%)';
  }
  
  // PNC - Yellow/Orange
  if (name.includes('pnc')) {
    return 'linear-gradient(135deg, #FFB81C 0%, #E6A600 100%)';
  }
  
  // TD Bank - Green
  if (name.includes('td bank') || name.includes('tdbank')) {
    return 'linear-gradient(135deg, #53A318 0%, #3F7A12 100%)';
  }
  
  // Ally Bank - Blue
  if (name.includes('ally')) {
    return 'linear-gradient(135deg, #0066CC 0%, #004499 100%)';
  }
  
  // Charles Schwab - Blue
  if (name.includes('schwab') || name.includes('charles schwab')) {
    return 'linear-gradient(135deg, #004D99 0%, #003366 100%)';
  }
  
  // Fidelity - Green
  if (name.includes('fidelity')) {
    return 'linear-gradient(135deg, #00A651 0%, #007A3D 100%)';
  }
  
  // Vanguard - Blue
  if (name.includes('vanguard')) {
    return 'linear-gradient(135deg, #0066CC 0%, #004499 100%)';
  }
  
  // Robinhood - Green
  if (name.includes('robinhood')) {
    return 'linear-gradient(135deg, #00C805 0%, #00A004 100%)';
  }
  
  return null;
};

// Function to extract dominant color from an image
const extractDominantColor = (imageUrl) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const colorCounts = {};
        
        // Sample pixels and count colors
        for (let i = 0; i < imageData.length; i += 4) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const rgb = `${r},${g},${b}`;
          colorCounts[rgb] = (colorCounts[rgb] || 0) + 1;
        }
        
        // Find the most common color
        let dominantColor = 'var(--color-gradient-primary)'; // fallback
        let maxCount = 0;
        
        for (const [rgb, count] of Object.entries(colorCounts)) {
          if (count > maxCount) {
            const [r, g, b] = rgb.split(',').map(Number);
            // Skip very light or very dark colors
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            if (brightness > 50 && brightness < 200) {
              dominantColor = `rgb(${r}, ${g}, ${b})`;
              maxCount = count;
            }
          }
        }
        
        resolve(dominantColor);
      } catch (error) {
        console.warn('[COLOR] Could not extract color from image:', error);
        resolve('var(--color-gradient-primary)');
      }
    };
    img.onerror = (error) => {
      console.error('[COLOR] Failed to load image:', error);
      resolve('var(--color-gradient-primary)');
    };
    img.src = imageUrl;
  });
};

const AccountDetail = ({ maxWidth = 700, account: propAccount, inBottomSheet = false, onBack }) => {
  const { accountId } = useParams();

  const { accounts, transactions = [], loading, plaidItems, refreshAccounts } = useContext(FinancialContext) || {};
  const account = propAccount || accounts?.find(acc => String(acc.id) === String(accountId));

  const [editingName, setEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [localName, setLocalName] = useState(account?.name || '');
  const [cardColor, setCardColor] = useState('var(--color-gradient-primary)');
  const submitRef = useRef(false);

  const plaidItem = account?.item_id ? plaidItems?.[account.item_id] : null;

  // Update localName when account data loads
  useEffect(() => {
    if (account?.name && account.name !== localName) {
      setLocalName(account.name);
    }
  }, [account?.name, localName]);

  // Extract color from institution logo when account changes
  useEffect(() => {
    // First try to get brand color from institution name
    const brandColor = getBrandColor(account?.institution_name);
    if (brandColor) {
      setCardColor(brandColor);
      return;
    }
    
    // If no brand color, try image extraction
    if (account?.institution_logo) {
      extractDominantColor(account.institution_logo).then(color => {
        setCardColor(color);
      });
    } else {
      // Use default gradient based on account type
      const type = (account?.type || '').toLowerCase();
      if (type === 'depository') {
        setCardColor('var(--color-gradient-success)');
      } else if (type === 'credit') {
        setCardColor('linear-gradient(135deg, var(--color-danger) 0%, var(--color-danger-light) 100%)');
      } else if (type === 'loan') {
        setCardColor('linear-gradient(135deg, var(--color-warning) 0%, var(--color-warning-light) 100%)');
      } else {
        setCardColor('var(--color-gradient-primary)');
      }
    }
  }, [account?.institution_logo, account?.type, account?.institution_name]);

  if (loading || (!accounts && !account)) {
    return (
      <div className="flex items-center justify-center h-[60vh] w-full">
        <Spinner label="Loading account..." />
      </div>
    );
  }

  if (!account) {
    return <div className="p-8 text-lg text-red-600">Account not found.</div>;
  }

  const lastFour = account.mask ? String(account.mask).slice(-4) : '';
  const balances = account.balances || {};
  const accountTransactions = transactions.filter(
    t => t.accounts?.account_id === account.account_id
  ).slice(0, 8);

  // Limit and usage (for credit/charge cards that report a limit)
  const limit = typeof balances?.limit === 'number' ? Math.max(0, balances.limit) : null
  // Used balance estimation: prefer limit - available; fallback to absolute current
  let usedBalance = null
  if (limit != null) {
    if (typeof balances?.available === 'number') {
      const avail = Math.max(0, balances.available)
      usedBalance = Math.max(0, limit - avail)
    } else if (typeof balances?.current === 'number') {
      usedBalance = Math.max(0, Math.abs(balances.current))
    }
  }

  const type = (account?.type || '').toLowerCase();
  let gradientStyle = { background: cardColor };
  
  // If we have a solid color from logo, create a gradient with it
  if (cardColor.startsWith('rgb(') && !cardColor.includes('gradient')) {
    gradientStyle = { 
      background: `linear-gradient(135deg, ${cardColor} 0%, ${cardColor}dd 100%)`
    };
  }

  function handleNameEditStart() {
    setEditedName(localName);
    setEditingName(true);
  }

  function handleNameSubmit() {
    if (submitRef.current) return;
    submitRef.current = true;
    
    const newName = (editedName || '').trim();
    if (!newName || newName === localName) {
      setEditingName(false);
      setEditedName('');
      submitRef.current = false;
      return;
    }

    // Optimistic update - update UI immediately
    const originalName = localName;
    setLocalName(newName);
    setEditingName(false);
    
    // Update the account object locally
    if (account) {
      account.name = newName;
    }

    setSavingName(true);
    const fullUrl = `${getApiBaseUrl()}/database/account/${account.account_id}/name`;
    fetch(fullUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then(data => {
        if (!data.success) {
          throw new Error('Failed to update account name');
        }
        // Success - name is already updated locally
      })
      .catch(err => {
        console.error('Failed to update account name:', err);
        // Revert optimistic update on error
        setLocalName(originalName);
        if (account) {
          account.name = originalName;
        }
      })
      .finally(() => {
        setSavingName(false);
        setEditedName('');
        submitRef.current = false;
      });
  }

  function handleNameCancel() {
    setEditingName(false);
    setEditedName('');
  }

  return (
    <div className="w-full h-full relative overflow-hidden rounded-2xl" style={{ background: 'var(--color-bg-primary)' }}>
      <SlideOver onBack={onBack} title="Account Details" showHeader={!!onBack}>
        <main className={`w-full max-w-[700px] mx-auto box-border pb-0 mb-0 overflow-hidden ${inBottomSheet ? 'px-4' : 'px-4 sm:px-6'}`}>
          <div className="w-full m-0">
            <div className="flex flex-col items-center pt-5 pb-2">
              <div className="w-full flex flex-wrap gap-4 mb-7">
                <AccountCard account={account} index={0} fitWidth className="w-full" />
              </div>

              {/* Limit usage summary (credit accounts) */}
              {limit != null && limit > 0 && usedBalance != null && (
                <div className="w-full px-4 py-3 mb-4 rounded-lg border" style={{ borderColor: 'var(--color-border-primary)', background: 'var(--color-bg-secondary)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>Balance</div>
                    <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>Limit {formatCurrency(limit)}</div>
                  </div>
                  <div className="flex items-end justify-between mb-1">
                    <div className="text-[18px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{formatCurrency(usedBalance)} <span className="text-[12px] font-normal" style={{ color: 'var(--color-text-secondary)' }}>/ {formatCurrency(limit)}</span></div>
                    <div className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{Math.min(100, Math.round((usedBalance / limit) * 100))}% used</div>
                  </div>
                  <UsageBar value={usedBalance} max={limit} />
                </div>
              )}

              <div className="w-full mb-2">
                <div className="text-[14px] pt-2 tracking-wide" style={{ color: 'var(--color-text-primary)' }}>
                  Recent Transactions
                </div>
                <div className="flex flex-col gap-0 w-full">
                  {accountTransactions.length === 0 ? (
                    <div className="text-center py-2 text-[12px]" style={{ color: 'var(--color-text-muted)' }}>No recent transactions</div>
                  ) : accountTransactions.map((txn, i) => {
                    const isPositive = txn.amount > 0
                    const amountColor = isPositive ? 'var(--color-success)' : 'var(--color-text-secondary)'
                    const amountPrefix = isPositive ? '+' : ''
                    return (
                      <div
                        key={txn.id || i}
                        className="flex items-center px-3 py-3 min-h-[56px] transition-colors duration-150"
                        style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-border-primary)', cursor: 'pointer', outline: '1px solid transparent' }}
                        onMouseEnter={(e) => {
                          const col = txn.category_color || '#64748b'
                          e.currentTarget.style.background = hexToRgba(col, 0.10)
                          e.currentTarget.style.outline = `1px solid ${hexToRgba(col, 0.25)}`
                          e.currentTarget.style.boxShadow = `inset 3px 0 0 ${hexToRgba(col, 0.8)}`
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.outline = '1px solid transparent'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                        onClick={() => navigate(`/transaction/${txn.id}`)}
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center" style={{ background: txn.icon_url ? 'transparent' : (txn.category_color || 'var(--color-bg-secondary)') }}>
                          {txn.icon_url ? (
                            <img src={txn.icon_url} alt="icon" className="w-full h-full object-cover" />
                          ) : txn.category_icon_lib && txn.category_icon_name ? (
                            <CategoryIcon lib={txn.category_icon_lib} name={txn.category_icon_name} size={14} color={'var(--color-text-white)'} />
                          ) : (
                            <FaChevronRight size={12} style={{ color: 'var(--color-text-white)' }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 px-3">
                          <div className="text-[13px] truncate" style={{ color: 'var(--color-text-primary)' }}>{txn.description}</div>
                          <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{formatDate(txn.datetime)}</div>
                        </div>
                        <div className="text-right text-[12px] font-medium" style={{ color: amountColor, fontVariantNumeric: 'tabular-nums' }}>
                          {amountPrefix}{formatCurrency(Math.abs(txn.amount))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>
      </SlideOver>
    </div>
  );
};

export default AccountDetail;
