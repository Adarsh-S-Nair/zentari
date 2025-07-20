import React, { useContext, useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MdEdit } from 'react-icons/md';
import { FaChevronRight } from 'react-icons/fa';
import IconButton from '../ui/IconButton';
import CategoryIcon from '../ui/CategoryIcon';
import { FinancialContext } from '../../contexts/FinancialContext';
import { formatCurrency, capitalizeWords, formatDate } from '../../utils/formatters';
import Spinner from '../ui/Spinner';
import BalanceTabs from '../ui/BalanceTabs';
import { getApiBaseUrl } from '../../utils/api';

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
  console.log('[COLOR] Starting color extraction for:', imageUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      console.log('[COLOR] Image loaded successfully, dimensions:', img.width, 'x', img.height);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const colorCounts = {};
        
        console.log('[COLOR] Analyzing', imageData.length / 4, 'pixels');
        
        // Sample pixels and count colors
        for (let i = 0; i < imageData.length; i += 4) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          const rgb = `${r},${g},${b}`;
          colorCounts[rgb] = (colorCounts[rgb] || 0) + 1;
        }
        
        console.log('[COLOR] Found', Object.keys(colorCounts).length, 'unique colors');
        
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
              console.log('[COLOR] New dominant color:', dominantColor, 'count:', count, 'brightness:', brightness);
            }
          }
        }
        
        console.log('[COLOR] Final dominant color:', dominantColor);
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

const AccountDetail = ({ maxWidth = 700, account: propAccount, inBottomSheet = false }) => {
  const { accountId } = useParams();
  const navigate = useNavigate();
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
    console.log('[ACCOUNT] Account changed, institution_logo:', account?.institution_logo, 'type:', account?.type, 'institution_name:', account?.institution_name);
    
    // First try to get brand color from institution name
    const brandColor = getBrandColor(account?.institution_name);
    if (brandColor) {
      console.log('[ACCOUNT] Using brand color for institution:', account?.institution_name, 'color:', brandColor);
      setCardColor(brandColor);
      return;
    }
    
    // If no brand color, try image extraction
    if (account?.institution_logo) {
      console.log('[ACCOUNT] Extracting color from logo:', account.institution_logo);
      extractDominantColor(account.institution_logo).then(color => {
        console.log('[ACCOUNT] Color extraction completed, setting card color to:', color);
        setCardColor(color);
      });
    } else {
      console.log('[ACCOUNT] No institution logo, using default color based on type:', account?.type);
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

  // Debug: Log transaction icon data
  if (accountTransactions.length > 0) {
    console.log('[ACCOUNT] Transaction icon data sample:', {
      first: {
        icon_url: accountTransactions[0].icon_url,
        category_icon_lib: accountTransactions[0].category_icon_lib,
        category_icon_name: accountTransactions[0].category_icon_name,
        category_name: accountTransactions[0].category_name,
        category_color: accountTransactions[0].category_color
      },
      total: accountTransactions.length,
      withIcons: accountTransactions.filter(t => t.icon_url || (t.category_icon_lib && t.category_icon_name)).length,
      withCategories: accountTransactions.filter(t => t.category_name).length
    });
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
    <main className={`w-full max-w-[700px] mx-auto box-border pb-0 mb-0 overflow-hidden ${inBottomSheet ? 'px-4' : 'px-4 sm:px-6'}`}>
      <div className="w-full m-0">
        <div className="flex flex-col items-center pt-5 pb-2">
          <div className="w-full flex flex-wrap gap-4 mb-7">
            <div
              className="w-full min-w-0 rounded-2xl text-white px-4 py-7 sm:px-7 shadow-lg transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl relative overflow-hidden flex flex-col gap-4 overflow-x-hidden"
              style={gradientStyle}
            >
              <div className="absolute -bottom-16 -left-16 w-48 h-52 rounded-full opacity-20 pointer-events-none" style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '45% 55% 52% 48% / 48% 52% 48% 52%' }} />
              <div className="absolute -top-12 -right-12 w-56 h-48 rounded-full opacity-15 pointer-events-none" style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '52% 48% 48% 52% / 52% 48% 52% 48%' }} />
              <div className="absolute -bottom-34 -right-20 w-60 h-56 rounded-full opacity-15 pointer-events-none" style={{ background: 'rgba(0,0,0,0.22)', borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%' }} />

              <div className="flex justify-between w-full items-start">
                <div className="flex-1 max-w-full overflow-hidden">
                  <BalanceTabs balances={balances} />
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ml-4 mt-[2px]" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  {account.institution_logo && (
                    <img
                      src={account.institution_logo}
                      alt={account.institution_name || 'Bank'}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-end justify-between w-full mt-auto flex-wrap gap-y-3">
                <div className="flex flex-col min-w-0 flex-1 mr-4">
                  <div className="flex items-center min-w-0 h-[28px] max-h-[28px]" style={{ color: 'var(--color-text-white)' }}>
                    {editingName ? (
                      <form onSubmit={(e) => { e.preventDefault(); handleNameSubmit(); }}>
                        <input
                          className="px-3 py-1.5 text-[17px] font-semibold focus:ring-2 outline-none min-w-0 flex-1 shadow-none transition-all duration-150 h-[28px] max-h-[28px]"
                          style={{ background: 'rgba(255,255,255,0.2)', color: 'var(--color-text-white)', borderColor: 'var(--color-primary)' }}
                          value={editedName}
                          autoFocus
                          onChange={e => setEditedName(e.target.value)}
                          onBlur={handleNameSubmit}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleNameSubmit();
                            } else if (e.key === 'Escape') {
                              handleNameCancel();
                            }
                          }}
                        />
                      </form>
                    ) : (
                      <div
                        className="flex items-center min-w-0 cursor-pointer group"
                        onClick={handleNameEditStart}
                      >
                        <span className="text-[17px] font-semibold -tracking-[0.5px] overflow-hidden text-ellipsis whitespace-nowrap flex-shrink-0 group-hover:underline max-w-[200px] sm:max-w-[300px]">
                          {localName}
                        </span>
                        <IconButton className="ml-2 flex-shrink-0">
                          <MdEdit size={18} style={{ color: 'var(--color-text-white)', opacity: 0.85 }} />
                        </IconButton>
                      </div>
                    )}
                  </div>
                  {account.subtype && (
                    <span className="text-[12px] font-medium rounded-full px-3 py-1 inline-block tracking-wide w-fit mt-1" style={{ color: 'var(--color-text-white)', background: 'rgba(255,255,255,0.15)' }}>
                      {capitalizeWords(account.subtype)}
                    </span>
                  )}
                </div>
                {lastFour && (
                  <span className="text-[13px] font-semibold rounded-full px-4 py-1 tracking-widest inline-block min-w-[36px] text-center font-mono shadow-sm" style={{ color: 'var(--color-text-white)', background: 'rgba(255,255,255,0.15)' }}>
                    {'●'.repeat(4)}{lastFour}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="w-full mb-2">
            <div className="text-[16px] pt-4 tracking-wide" style={{ color: 'var(--color-text-primary)' }}>
              Recent Transactions
            </div>
            <div className="flex flex-col gap-0 w-full">
              {accountTransactions.length === 0 ? (
                <div className="text-center py-3 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>No recent transactions</div>
              ) : accountTransactions.map((txn, i) => {
                const isPositive = txn.amount > 0;
                const amountColor = isPositive ? 'var(--color-success)' : 'var(--color-text-secondary)';
                const amountPrefix = isPositive ? '+' : '';
                return (
                  <div
                    key={txn.id || i}
                    className="flex items-center px-2 py-4 min-h-[70px] box-border border-b transition-all duration-200 cursor-pointer w-full max-w-full overflow-x-hidden transform hover:scale-[1.01] hover:shadow-md"
                    style={{ 
                      background: 'var(--color-bg-primary)', 
                      borderColor: 'var(--color-border-primary)',
                      borderRadius: '8px',
                      margin: '4px 0'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-bg-hover)';
                      e.currentTarget.style.transform = 'translateY(-1px) scale(1.01)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--color-bg-primary)';
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    }}
                    onClick={() => navigate(`/transaction/${txn.id}`)}
                  >
                    {/* Icon/avatar - made smaller */}
                    <div className="flex-shrink-0 mr-2 sm:mr-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center overflow-hidden self-center transition-all duration-200 transform hover:scale-110" style={{ 
                      background: txn.icon_url ? 'transparent' : (txn.category_color || 'var(--color-primary)'), 
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                      filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.1))'
                    }}>
                      {txn.icon_url ? (
                        <img src={txn.icon_url} alt="icon" className="w-full h-full rounded-full object-cover block" />
                      ) : txn.category_icon_lib && txn.category_icon_name ? (
                        <CategoryIcon lib={txn.category_icon_lib} name={txn.category_icon_name} size={16} color={'var(--color-text-white)'} />
                      ) : txn.category_name ? (
                        <span className="text-[12px] font-semibold" style={{ color: 'var(--color-text-white)' }}>
                          {txn.category_name.charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <FaChevronRight size={14} style={{ color: 'var(--color-text-white)' }} />
                      )}
                    </div>
                    {/* Main info and category */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center px-2">
                      <div className="text-[14px] sm:text-[16px] truncate max-w-[180px] sm:max-w-none" style={{ color: 'var(--color-text-primary)' }}>{txn.description}</div>
                      {txn.category_name && (
                        <div className="flex items-center gap-1 sm:gap-2 mt-1">
                          <span className="inline-block w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0" style={{ background: txn.category_color || 'var(--color-primary)' }} />
                          <span className="text-[9px] sm:text-[10px] tracking-wide truncate max-w-[100px] sm:max-w-none" style={{ color: 'var(--color-text-secondary)' }}>{txn.category_name}</span>
                        </div>
                      )}
                    </div>
                    {/* Amount */}
                    <div className="flex-shrink-0 text-right text-[12px] sm:text-[14px] min-w-[60px] sm:min-w-[80px] ml-2 sm:ml-3 whitespace-nowrap transition-colors duration-150 flex items-center justify-center self-center" style={{ color: amountColor }}>
                      {amountPrefix}{formatCurrency(Math.abs(txn.amount))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AccountDetail;
