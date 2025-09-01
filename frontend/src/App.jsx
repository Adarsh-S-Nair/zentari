import React, { useState, useEffect, useContext, useMemo, createContext } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
  useNavigate,
  useParams,
  matchPath,
  useSearchParams,
} from 'react-router-dom';
import { supabase } from './supabaseClient';
import { FinancialProvider } from './contexts/FinancialContext';
import { PortfolioProvider } from './contexts/PortfolioContext';
import { usePortfolio } from './contexts/PortfolioContext';
import {
  CollapsibleSidebar,
  Topbar,
  AccountsPanel,
  TransactionsPanel,
  DashboardPanel,
  GptTradingPanel,
  MobileBottomBar,
  LoginModal,
  LogoutModal,
  Toast,
  CircleUserToggle,
  AccountDetail,
  LandingPage,
  TransactionDetail,
} from './components';
import { PortfolioCreateForm } from './components/forms';
import { Button, Modal, MatrixOverlay } from './components/ui';
import ToggleTabs from './components/ui/ToggleTabs';
import { TransactionFilterForm } from './components/forms';
import { PlaidLinkModal } from './components/modals';
import { useMediaQuery } from 'react-responsive';
import { FaChartArea, FaSearch } from 'react-icons/fa';
import { MdDashboard } from 'react-icons/md';
import { IoFolderOpen } from 'react-icons/io5';
import { FaReceipt } from 'react-icons/fa';
import { FiArrowLeft, FiFilter } from 'react-icons/fi';
import { IoMdSettings } from 'react-icons/io';
import { FinancialContext } from './contexts/FinancialContext';
import SimpleDrawer from './components/ui/SimpleDrawer';

// Modal Context
const ModalContext = createContext();

// Global Drawer Context
const DrawerContext = createContext();

export function ModalProvider({ children }) {
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    header: '',
    description: '',
    headerIcon: null,
    buttons: [
      { 
        text: 'Cancel', 
        color: 'gray', 
        onClick: null,
        icon: null
      },
      { 
        text: 'Confirm', 
        color: 'networth', 
        onClick: null,
        icon: null
      }
    ]
  });

  const showModal = (config) => {
    setModalConfig({
      ...config,
      isOpen: true,
    });
  };

  const hideModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  const handleButtonClick = (button) => {
    if (button.onClick) {
      button.onClick();
    }
    hideModal();
  };

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={hideModal}
        header={modalConfig.header}
        description={modalConfig.description}
        headerIcon={modalConfig.headerIcon}
        buttons={modalConfig.buttons}
      />
    </ModalContext.Provider>
  );
}

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

export function DrawerProvider({ children }) {
  const [drawerState, setDrawerState] = useState({
    isOpen: false,
    type: 'drawer', // 'drawer' or 'sheet'
    stack: [], // [{ title, content }]
    lastAction: null // 'open' | 'push' | 'replace' | 'back' | 'close'
  });

  const openDrawer = React.useCallback((config) => {
    // open with a fresh stack
    console.log('[DrawerProvider] openDrawer', { title: config?.title })
    setDrawerState({
      isOpen: true,
      type: config?.type || 'drawer',
      stack: [{ title: config?.title || '', content: config?.content || null }],
      lastAction: 'open'
    });
  }, []);

  const pushDrawer = React.useCallback((config) => {
    console.log('[DrawerProvider] pushDrawer', { title: config?.title })
    // First push with new title and temporary null content to update header immediately
    setDrawerState(prev => ({
      ...prev,
      isOpen: true,
      stack: [...(prev.stack || []), { title: config?.title || '', content: null }],
      lastAction: 'push'
    }))
    // Then, in next tick, replace top with the actual content while keeping the same title
    setTimeout(() => {
      setDrawerState(prev => {
        const next = [...(prev.stack || [])]
        if (next.length === 0) return prev
        next[next.length - 1] = { title: config?.title || '', content: config?.content || null }
        return { ...prev, stack: next }
      })
    }, 0)
  }, [])

  const replaceTop = React.useCallback((config) => {
    setDrawerState(prev => {
      const next = [...(prev.stack || [])]
      if (next.length === 0) return { ...prev, stack: [{ title: config?.title || '', content: config?.content || null }], isOpen: true, lastAction: 'open' }
      next[next.length - 1] = { title: config?.title || '', content: config?.content || null }
      console.log('[DrawerProvider] replaceTop', { title: config?.title })
      return { ...prev, stack: next, lastAction: 'replace' }
    })
  }, [])

  const goBack = React.useCallback(() => {
    console.log('[DrawerProvider] goBack')
    setDrawerState(prev => {
      const next = [...(prev.stack || [])]
      next.pop()
      const stillOpen = next.length > 0
      return { ...prev, isOpen: stillOpen, stack: next, lastAction: 'back' }
    })
  }, [])

  const closeDrawer = React.useCallback(() => {
    console.log('[DrawerProvider] closeDrawer')
    setDrawerState(prev => ({ ...prev, isOpen: false, lastAction: 'close' }))
  }, [])

  const top = drawerState.stack[drawerState.stack.length - 1] || { title: '', content: null }

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer, pushDrawer, replaceTop, goBack }}>
      {children}
      {/* Drawer UI removed intentionally; will be reimplemented later */}
    </DrawerContext.Provider>
  );
}

export const useDrawer = () => {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error('useDrawer must be used within a DrawerProvider');
  }
  return context;
}

// Global Drawer/Sheet Component
function GlobalDrawer({ config, onClose, onBack }) {
  const isMobile = useMediaQuery({ maxWidth: 670 });
  const { isOpen, type, stack, top, lastAction } = config;

  // Memoize the content to prevent unnecessary re-renders
  const memoizedContent = React.useMemo(() => top?.content, [top]);
  const title = top?.title || ''
  const canGoBack = (stack?.length || 0) > 1

  // Determine nav direction based on lastAction
  const computedDir = lastAction === 'back' ? 'back' : 'forward'

  // Inline unified panel (drawer or sheet) with full-page sliding
  const TRANSITION_MS = 140
  const TRANSITION_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
  const PAGE_TRANSITION_MS = 200
  const [isVisible, setIsVisible] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)
  const [interactionsArmed, setInteractionsArmed] = React.useState(false)
  const panelRef = React.useRef(null)
  const overlayRef = React.useRef(null)
  const closeTimeoutRef = React.useRef(null)

  // Track staged content for transitions
  const [renderedChild, setRenderedChild] = React.useState(memoizedContent)
  const [headerTitle, setHeaderTitle] = React.useState(title)
  const [prevChild, setPrevChild] = React.useState(null)
  const [incomingChild, setIncomingChild] = React.useState(null)
  const [isAnimating, setIsAnimating] = React.useState(false)
  const prevRef = React.useRef(null)
  const currRef = React.useRef(null)

  React.useEffect(() => {
    if (isOpen) {
      if (closeTimeoutRef.current) { clearTimeout(closeTimeoutRef.current); closeTimeoutRef.current = null }
      setIsMounted(true)
      // start hidden, then reveal for slide-in
      setIsVisible(false)
      setInteractionsArmed(false)
      requestAnimationFrame(() => {
        // double RAF ensures initial style is committed before transition
        requestAnimationFrame(() => {
          setIsVisible(true)
          // arm interactions shortly after mount to avoid initial click closing
          setTimeout(() => { setInteractionsArmed(true); console.log('[GlobalDrawer] interactions armed') }, 0)
        })
      })
      document.body.style.overflow = 'hidden'
      console.log('[GlobalDrawer] open mount', { isMobile, stackLen: stack?.length, title })
    } else if (isMounted) {
      // trigger slide-out
      setIsVisible(false)
      setInteractionsArmed(false)
      const t = setTimeout(() => {
        setIsMounted(false)
        document.body.style.overflow = ''
      }, TRANSITION_MS + 20)
      closeTimeoutRef.current = t
      console.log('[GlobalDrawer] close start')
      return () => { if (t) clearTimeout(t) }
    }
  }, [isOpen, isMounted])

  // Animate on stack length change
  React.useEffect(() => {
    if (!isOpen) return
    const stackLen = stack?.length || 0
    const pageAnimEnabled = (lastAction === 'push' || lastAction === 'replace' || lastAction === 'back')

    // Snapshot current/next for this transition to avoid stale state
    const prevChildSnap = renderedChild
    const nextChild = memoizedContent
    const nextTitle = title

    // Prepare new targets
    setPrevChild(prevChildSnap)
    setIncomingChild(nextChild)

    if (!pageAnimEnabled) {
      // No page-to-page animation on first view; just update and exit
      setRenderedChild(nextChild)
      setHeaderTitle(nextTitle)
      setIsAnimating(false)
      setPrevChild(null)
      setIncomingChild(null)
      return
    }

    setIsAnimating(true)
    const dir = computedDir === 'forward' ? 1 : -1
    console.log('[GlobalDrawer] nav start', { dir: computedDir, stackLen, to: nextTitle })

    const attemptRef = { count: 0, max: 20 }

    requestAnimationFrame(() => {
      const tryAnimate = () => {
        attemptRef.count++
        const prevEl = prevRef.current
        const curEl = currRef.current
        if (!prevEl || !curEl) {
          if (attemptRef.count < attemptRef.max) {
            if (attemptRef.count === 1 || attemptRef.count % 5 === 0) {
              console.log('[GlobalDrawer] refs not ready, retry frame', attemptRef.count)
            }
            return requestAnimationFrame(tryAnimate)
          }
          console.warn('[GlobalDrawer] refs never became ready, skipping page animation')
          setRenderedChild(nextChild)
          setHeaderTitle(nextTitle)
          setIsAnimating(false)
          setPrevChild(null)
          setIncomingChild(null)
          return
        }
        console.log('[GlobalDrawer] anim elements ready in', attemptRef.count, 'frames')
        prevEl.style.transition = 'none'
        prevEl.style.transform = 'translateX(0%)'
        curEl.style.transition = 'none'
        curEl.style.transform = `translateX(${dir * 100}%)`
        // Force reflow to ensure initial transforms are applied
        void prevEl.offsetHeight
        void curEl.offsetHeight
        requestAnimationFrame(() => {
          prevEl.style.transition = `transform ${PAGE_TRANSITION_MS}ms ${TRANSITION_EASE}`
          curEl.style.transition = `transform ${PAGE_TRANSITION_MS}ms ${TRANSITION_EASE}`
          prevEl.style.transform = `translateX(${dir * -100}%)`
          curEl.style.transform = 'translateX(0%)'
          console.log('[GlobalDrawer] anim launched')
        })
      }
      tryAnimate()
    })

    const t = setTimeout(() => {
      setRenderedChild(nextChild)
      setHeaderTitle(nextTitle)
      setIsAnimating(false)
      setPrevChild(null)
      setIncomingChild(null)
      console.log('[GlobalDrawer] nav settle', { current: nextTitle })
    }, PAGE_TRANSITION_MS + 40)
    return () => clearTimeout(t)
  }, [stack?.length, lastAction, isOpen, memoizedContent, title])

  // Static header (non-animated) with reserved space for back and close
  const Header = () => (
    <div className="grid grid-cols-[40px_1fr_40px] items-center px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-primary)' }}>
      <div className="flex items-center justify-start">
        {canGoBack ? (
          <button onClick={onBack} className="p-2 rounded-md cursor-pointer transition-colors" title="Back" aria-label="Back" style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e)=> e.currentTarget.style.background = 'var(--color-bg-hover)'}
            onMouseLeave={(e)=> e.currentTarget.style.background = 'transparent'}
          >
            <FiArrowLeft size={18} />
          </button>
        ) : (
          <span className="block" style={{ width: 28, height: 28 }} />
        )}
      </div>
      <div className="truncate">
        {headerTitle && (
          <h2 className="text-[14px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {headerTitle}
          </h2>
        )}
      </div>
      <div className="flex items-center justify-end">
        <button onClick={onClose} className="p-2 rounded-md cursor-pointer transition-colors" title="Close" aria-label="Close" style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e)=> e.currentTarget.style.background = 'var(--color-bg-hover)'}
          onMouseLeave={(e)=> e.currentTarget.style.background = 'transparent'}
        >
          ✕
        </button>
      </div>
    </div>
  )

  if (!isMounted) return null;

  // Backdrop + container with mobile/desktop positioning
  return (
    <div ref={overlayRef} className="fixed inset-0 z-[200]" style={{ background: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e)=>{ if (!interactionsArmed) return; if (e.target === overlayRef.current) onClose?.() }}
    >
      <div onClick={(e)=> e.stopPropagation()} className={`absolute ${isMobile ? 'inset-x-0 bottom-0' : 'inset-y-8 right-4'} z-[300] ${isMobile ? 'w-full' : 'w-[420px]'} ${isMobile ? '' : 'rounded-2xl'} shadow-2xl border overflow-hidden flex flex-col h-full`}
        ref={panelRef}
        style={{
          height: isMobile ? '80vh' : 'calc(100vh - 4rem)',
          transform: isVisible ? 'translate(0, 0)' : (isMobile ? 'translateY(100%)' : 'translateX(100%)'),
          transition: `transform ${TRANSITION_MS}ms ${TRANSITION_EASE}`,
          willChange: 'transform',
          borderColor: 'var(--color-border-primary)',
          background: 'var(--color-bg-primary)'
        }}
      >
        {/* Static header */}
        <Header />
        {/* Animated content area below header */}
        <div className="relative flex-1 overflow-hidden">
          {isAnimating && prevChild && (
            <div ref={prevRef} className="absolute inset-0 w-full h-full overflow-y-auto">
              {prevChild}
            </div>
          )}
          {isAnimating && incomingChild && (
            <div ref={currRef} className="absolute inset-0 w-full h-full overflow-y-auto">
              {incomingChild}
            </div>
          )}
          {!isAnimating && (
            <div className="absolute inset-0 w-full h-full overflow-y-auto">
              {renderedChild}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function App() {
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [loginOpen, setLoginOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userChecked, setUserChecked] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'default' });
  const [currentSimDate, setCurrentSimDate] = useState(new Date());
  const [logoutOpen, setLogoutOpen] = useState(false);
  const isTablet = useMediaQuery({ maxWidth: 1024 });
  const isMobile = useMediaQuery({ maxWidth: 670 });
  const [circleUsers, setCircleUsers] = useState([]);
  const [plaidModalOpen, setPlaidModalOpen] = useState(false);
  const [plaidLoading, setPlaidLoading] = useState(false);

  const allTabs = [
    { label: 'Dashboard', icon: <MdDashboard size={18} />, route: '/dashboard', hasContent: false, requiresAuth: true },
    { label: 'Transactions', icon: <FaReceipt size={18} />, route: '/transactions', hasContent: false, requiresAuth: true },
    { label: 'GPT Trading', icon: <FaChartArea size={18} />, route: '/gpt-trading', hasContent: false, requiresAuth: true },
  ];

  const visibleTabs = allTabs.filter(tab => !tab.requiresAuth || user);

  const [form, setForm] = useState({
    start_date: '2023-01-01',
    end_date: '2023-12-31',
    lookback_months: 12,
    skip_recent_months: 1,
    hold_months: 1,
    top_n: 10,
    starting_value: 10000,
    benchmark: 'SPY',
    strategy: 'momentum',
    tp_threshold: 18,
    sl_threshold: 3,
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setToast({ message: '', type: 'default' });
    setLoading(true);
    setLoadingPhase('init');
    setCurrentSimDate(null);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000';
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${baseUrl.replace(/^https?:\/\//, '')}/simulate/ws`);

    socket.onopen = () => {
      socket.send(JSON.stringify(form));
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'status':
          if (msg.payload.toLowerCase().includes('starting simulation')) {
            setLoadingPhase('');
          }
          break;

        case 'daily':
          setCurrentSimDate(msg.payload.date);
          setResult((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              daily_values: [...(prev.daily_values || []), {
                date: msg.payload.date,
                portfolio_value: msg.payload.portfolio_value
              }],
              daily_benchmark_values: [...(prev.daily_benchmark_values || []), {
                date: msg.payload.date,
                benchmark_value: msg.payload.benchmark_value
              }]
            };
          });
          break;

        case 'done':
          setResult((prev) => ({
            ...(prev || {}),
            ...msg.payload
          }));
          setLoading(false);
          setToast({ message: 'Simulation completed!', type: 'success' });
          break;

        case 'error':
          setToast({ message: msg.payload || 'Something went wrong.', type: 'error' });
          setLoading(false);
          setResult(null);
          break;

        default:
          // Unknown message type - ignore
          break;
      }
    };

    socket.onerror = (err) => {
      console.error('[WebSocket Error]', err);
      setToast({ message: 'Something went wrong.', type: 'error' });
      setLoading(false);
    };

    socket.onclose = () => {
      // WebSocket disconnected
    };
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        setUser(data.user);
      }
      setUserChecked(true);
    };

    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Fetch avatar_url for authenticated user and build circleUsers array
  useEffect(() => {
    const buildCircleUsers = async () => {
      let avatarUrl = null;
      if (user) {
        // Try user_metadata first
        avatarUrl = user.user_metadata?.avatar_url;
        // If not present, fetch from profiles
        if (!avatarUrl) {
          const { data } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();
          if (data && data.avatar_url) {
            avatarUrl = data.avatar_url;
          }
        }
      }
      setCircleUsers([
        { id: 'combined', name: 'Combined' },
        user ? {
          id: user.id,
          name: user.user_metadata?.display_name || user.email || 'User',
          avatar_url: avatarUrl,
        } : null,
        { id: 'user1', name: 'Alice' },
        { id: 'user2', name: 'Bob' },
        { id: 'user3', name: 'Charlie' },
      ].filter(Boolean));
    };
    buildCircleUsers();
  }, [user]);

  const handleLoginSuccess = () => {
    setLoginOpen(false);
    setUserChecked(true);
  };

  const handlePlaidSuccess = () => {
    setPlaidModalOpen(false);
    setPlaidLoading(false);
    setToast({ message: 'Accounts added successfully!', type: 'success' });
  };

  const handlePlaidClose = () => {
    setPlaidModalOpen(false);
    setPlaidLoading(false);
  };

  const authenticatedRoutes = ['/dashboard', '/accounts', '/transactions', '/gpt-trading'];

  return (
    <FinancialProvider setToast={setToast}>
      <PortfolioProvider>
        <DrawerProvider>
          <ModalProvider>
          <Router>
            <AppContent
              loading={loading}
              loadingPhase={loadingPhase}
              loginOpen={loginOpen}
              setLoginOpen={setLoginOpen}
              user={user}
              userChecked={userChecked}
              setUser={setUser}
              result={result}
              setResult={setResult}
              toast={toast}
              setToast={setToast}
              currentSimDate={currentSimDate}
              setCurrentSimDate={setCurrentSimDate}
              logoutOpen={logoutOpen}
              setLogoutOpen={setLogoutOpen}
              isTablet={isTablet}
              isMobile={isMobile}
              allTabs={allTabs}
              visibleTabs={visibleTabs}
              form={form}
              setForm={setForm}
              handleChange={handleChange}
              handleSubmit={handleSubmit}
              circleUsers={circleUsers}
              plaidModalOpen={plaidModalOpen}
              setPlaidModalOpen={setPlaidModalOpen}
              plaidLoading={plaidLoading}
              setPlaidLoading={setPlaidLoading}
              handlePlaidSuccess={handlePlaidSuccess}
              handlePlaidClose={handlePlaidClose}
            />
            <LoginModal
              isOpen={loginOpen}
              onClose={() => setLoginOpen(false)}
              onLoginSuccess={handleLoginSuccess}
            />
            <LogoutModal
              isOpen={logoutOpen}
              onClose={() => setLogoutOpen(false)}
              onConfirm={() => {
                supabase.auth.signOut();
                setLogoutOpen(false);
              }}
            />
            <PlaidLinkModal
              isOpen={plaidModalOpen}
              onClose={handlePlaidClose}
              onSuccess={handlePlaidSuccess}
              onError={(error) => {
                setToast({ message: error, type: 'error' });
                setPlaidLoading(false);
              }}
            />
            <Toast message={toast.message} type={toast.type} />
          </Router>
          {/* AI matrix overlay only while LLM is running */}
          <OverlayWhileLLM />
          </ModalProvider>
        </DrawerProvider>
      </PortfolioProvider>
    </FinancialProvider>
  );
}

function AppContent({
  loading, loadingPhase, loginOpen, setLoginOpen, user, userChecked, setUser,
  result, setResult, toast, setToast, currentSimDate, setCurrentSimDate,
  logoutOpen, setLogoutOpen, isTablet, isMobile, allTabs, visibleTabs,
  form, setForm, handleChange, handleSubmit, circleUsers,
  plaidModalOpen, setPlaidModalOpen, plaidLoading, setPlaidLoading,
  handlePlaidSuccess, handlePlaidClose
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { fetchFilteredTransactions, portfolio } = useContext(FinancialContext);
  const { openDrawer, pushDrawer, replaceTop, goBack } = useDrawer();
  const maxWidth = 700;

  function DeletePortfolioButton({ onDeleted }) {
    const { user } = useContext(FinancialContext);
    const { portfolio, fetchPortfolio } = useContext(FinancialContext);
    const handleDelete = async () => {
      try {
        if (!portfolio?.id) return
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
        const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
        const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, '')
        const url = `${protocol}://${cleanBaseUrl}/database/portfolios/${encodeURIComponent(portfolio.id)}`
        const resp = await fetch(url, { method: 'DELETE' })
        if (!resp.ok) {
          const err = await resp.json().catch(()=>({}))
          throw new Error(err?.detail || `HTTP ${resp.status}`)
        }
        if (user?.id) await fetchPortfolio(user.id)
        onDeleted && onDeleted()
      } catch (e) {
        console.error('delete portfolio error', e)
      }
    }
    return (
      <Button label="Delete" danger={true} className="h-9" onClick={handleDelete} />
    )
  }

  // Simple drawer for GPT Trading actions (scoped to AppContent)
  const [simpleDrawerOpen, setSimpleDrawerOpen] = useState(false)
  const [simpleDrawerStack, setSimpleDrawerStack] = useState([])
  const [tradeMode, setTradeMode] = useState('PAPER')

  // Toolbar state
  const [selectedCircleUser, setSelectedCircleUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTransactions, setFilteredTransactions] = useState(null);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState(() => {
    // Load filters from localStorage on component mount
    const saved = localStorage.getItem('transactionFilters');
    return saved ? JSON.parse(saved) : null;
  });

  // Handle URL parameters for filters
  useEffect(() => {
    if (location.pathname === '/transactions') {
      const categories = searchParams.get('categories');
      const transactionType = searchParams.get('transactionType');
      const amountRange = searchParams.get('amountRange');
      const dateRange = searchParams.get('dateRange');
      const startDate = searchParams.get('start_date');
      const endDate = searchParams.get('end_date');
      const searchQuery = searchParams.get('searchQuery');
      const accounts = searchParams.get('accounts');
      
      // Only create filters if there are URL parameters
      if (categories || transactionType || amountRange || dateRange || startDate || endDate || searchQuery || accounts) {
        setIsApplyingFilters(true);
        
        const urlFilters = {
          categories: categories ? [categories] : [],
          transactionType: transactionType || 'all',
          amountRange: amountRange || 'all',
          dateRange: dateRange || 'all',
          customStartDate: startDate || '',
          customEndDate: endDate || '',
          searchQuery: searchQuery || '',
          accounts: accounts ? accounts.split(',') : []
        };
        
        // Apply URL filters
        setActiveFilters(urlFilters);
        setFilteredTransactions(null); // Reset to trigger new fetch
      }
    }
  }, [location.pathname, searchParams]);

  // Function to update URL with current filters
  const updateURLWithFilters = (filters) => {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.categories?.length > 0) {
        // For now, just use the first category ID
        params.set('categories', filters.categories[0]);
      }
      if (filters.transactionType && filters.transactionType !== 'all') {
        params.set('transactionType', filters.transactionType);
      }
      if (filters.amountRange && filters.amountRange !== 'all') {
        params.set('amountRange', filters.amountRange);
      }
      if (filters.dateRange && filters.dateRange !== 'all') {
        params.set('dateRange', filters.dateRange);
        if (filters.dateRange === 'custom') {
          if (filters.customStartDate) params.set('start_date', filters.customStartDate);
          if (filters.customEndDate) params.set('end_date', filters.customEndDate);
        }
      }
      if (filters.searchQuery?.trim()) {
        params.set('searchQuery', filters.searchQuery);
      }
      if (filters.accounts?.length > 0) {
        params.set('accounts', filters.accounts.join(','));
      }
    }
    
    const newURL = params.toString() ? `/transactions?${params.toString()}` : '/transactions';
    navigate(newURL, { replace: true });
  };

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (activeFilters) {
      localStorage.setItem('transactionFilters', JSON.stringify(activeFilters));
    } else {
      localStorage.removeItem('transactionFilters');
    }
  }, [activeFilters]);

  // Apply saved filters when user is available
  useEffect(() => {
    if (user?.id && activeFilters && !filteredTransactions) {
      // Apply saved filters on page load
      fetchFilteredTransactions(user.id, activeFilters).then(filtered => {
        setFilteredTransactions(filtered);
        setIsApplyingFilters(false);
      });
    }
  }, [user?.id, activeFilters, filteredTransactions]);

  // Function to count active filters for badge
  const getActiveFilterCount = () => {
    if (!activeFilters) return 0;
    let count = 0;
    if (activeFilters.categories?.length > 0) count++;
    if (activeFilters.transactionType !== 'all') count++;
    if (activeFilters.amountRange !== 'all') count++;
    if (activeFilters.dateRange !== 'all') count++;
    if (activeFilters.searchQuery?.trim()) count++;
    if (activeFilters.accounts?.length > 0) count++;
    return count;
  };

  const authenticatedRoutes = ['/dashboard', '/accounts', '/transactions', '/gpt-trading'];

  useEffect(() => {
    if (!userChecked) return;

    const routeRequiresAuth = authenticatedRoutes.includes(location.pathname);

    if (routeRequiresAuth && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, userChecked, location.pathname]);

  let currentPage = 'Zentari';
  let currentTab = null;
  if (location.pathname === '/dashboard') {
    currentPage = 'Dashboard';
    currentTab = '/dashboard';
  } else if (location.pathname === '/accounts') {
    currentPage = 'Accounts';
    currentTab = '/accounts';
  } else if (location.pathname === '/transactions') {
    currentPage = 'Transactions';
    currentTab = '/transactions';
  } else if (location.pathname === '/gpt-trading') {
    currentPage = 'GPT Trading';
    currentTab = '/gpt-trading';
  }

  const handleLoginSuccess = () => {
    navigate('/dashboard');
  };

  const handleLogoutSuccess = () => {
    navigate('/simulate');
  };

  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filterPages, setFilterPages] = useState([]);

  const handleFilterClick = () => {
    // Open filter drawer with SimpleDrawer stack
    setFilterPages([{
      title: 'Filter Transactions',
      element: (
        <TransactionFilterForm
          currentFilters={activeFilters}
          onApply={async (filters) => {
            setActiveFilters(filters);
            updateURLWithFilters(filters);
            if (user?.id) {
              const filtered = await fetchFilteredTransactions(user.id, filters);
              setFilteredTransactions(filtered);
            }
            setFilterDrawerOpen(false)
          }}
          onReset={() => {
            setActiveFilters(null);
            setFilteredTransactions(null);
            navigate('/transactions', { replace: true });
            setFilterDrawerOpen(false)
          }}
          onClose={() => setFilterDrawerOpen(false)}
        />
      )
    }])
    setFilterDrawerOpen(true)
  };

  return (
    <Routes>
      <Route
        path="/dashboard"
        element={user ? (
          <div className="flex min-h-screen w-full relative overflow-auto" style={{ background: 'var(--color-bg-primary)' }}>
            {!isMobile && (
              <CollapsibleSidebar
                visibleTabs={visibleTabs}
                form={form}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                onLoginClick={() => setLoginOpen(true)}
                user={user}
                isTablet={isTablet}
                isMobile={isMobile}
                currentTab={'/dashboard'}
              />
            )}
            <div className={`flex-1 flex flex-col sm:pb-0 ${isMobile ? 'ml-[0px]' : 'ml-[55px]'}`}>
              <Topbar 
                user={user} 
                onLoginClick={() => setLoginOpen(true)} 
                currentPage={'Dashboard'} 
                maxWidth={maxWidth} 
                isMobile={isMobile}
                toolbarItems={
                  <div className="w-full flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <CircleUserToggle
                        users={circleUsers}
                        selectedUser={selectedCircleUser}
                        onSelectUser={setSelectedCircleUser}
                      />
                    </div>
                    <div className="flex-shrink-0">
                      <Button
                        label="Add Accounts"
                        onClick={() => setPlaidModalOpen(true)}
                        width="w-32"
                        loading={plaidLoading}
                        disabled={plaidLoading}
                        className="h-8"
                        color="networth"
                      />
                    </div>
                  </div>
                }
              />
              <div className={`flex-1 ${isMobile ? 'pb-[60px]' : ''}`}>
                <DashboardPanel isMobile={isMobile} maxWidth={maxWidth} circleUsers={circleUsers} />
              </div>
              {isMobile && (
                <MobileBottomBar
                  user={user}
                  onLoginClick={() => setLoginOpen(true)}
                  setLogoutOpen={() => {}}
                  visibleTabs={visibleTabs}
                  currentTab={'/dashboard'}
                />
              )}
            </div>
          </div>
        ) : null}
      />
      {/* Removed /accounts route; accounts are accessible via drawer on Dashboard */}
      <Route
        path="/transactions"
        element={user ? (
          <div className="flex min-h-screen w-full relative overflow-auto" style={{ background: 'var(--color-bg-primary)' }}>
            {!isMobile && (
              <CollapsibleSidebar
                visibleTabs={visibleTabs}
                form={form}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                onLoginClick={() => setLoginOpen(true)}
                user={user}
                isTablet={isTablet}
                isMobile={isMobile}
                currentTab={'/transactions'}
              />
            )}
            <div className={`flex-1 flex flex-col sm:pb-0 ${isMobile ? 'ml-[0px]' : 'ml-[55px]'}`}>
              <Topbar 
                user={user} 
                onLoginClick={() => setLoginOpen(true)} 
                currentPage={'Transactions'} 
                maxWidth={maxWidth} 
                isMobile={isMobile}
                toolbarItems={
                  <>
                    <div className="flex items-center justify-between w-full gap-3">
                      <CircleUserToggle
                        users={circleUsers}
                        selectedUser={selectedCircleUser}
                        onSelectUser={setSelectedCircleUser}
                        onAddAccounts={() => {}}
                        addLoading={false}
                        maxWidth={maxWidth - 120}
                      />
                      <Button
                        label="Filters"
                        icon={<FiFilter size={16} />}
                        width="w-32"
                        className="h-8 relative"
                        color="networth"
                        onClick={handleFilterClick}
                        badge={getActiveFilterCount() > 0 ? getActiveFilterCount() : null}
                      />
                    </div>
                    <div className="mt-2">
                      <div 
                        className="flex items-center py-2.5 px-3 min-h-[40px] w-full" 
                        style={{ 
                          background: 'var(--color-bg-secondary)',
                          borderRadius: '8px',
                          boxShadow: '0 1px 2px 0 var(--color-shadow-light)'
                        }}
                      >
                        <FaSearch size={14} className="mr-3" style={{ color: 'var(--color-text-muted)' }} />
                        <input
                          type="text"
                          placeholder="Search transactions"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="border-none outline-none flex-1 text-[14px] bg-transparent min-w-0 h-6 w-full"
                          style={{ 
                            fontFamily: 'inherit', 
                            color: 'var(--color-text-primary)',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </div>
                  </>
                }
              />
              <div className={`flex-1 ${isMobile ? 'pb-[60px]' : ''}`}>
                <TransactionsPanel 
                  isMobile={isMobile} 
                  maxWidth={maxWidth} 
                  circleUsers={circleUsers}
                  filteredTransactions={filteredTransactions}
                  activeFilters={activeFilters}
                  isApplyingFilters={isApplyingFilters}
                  searchQuery={searchQuery}
                />
              </div>
              {isMobile && (
                <MobileBottomBar
                  user={user}
                  onLoginClick={() => setLoginOpen(true)}
                  setLogoutOpen={() => {}}
                  visibleTabs={visibleTabs}
                  currentTab={'/transactions'}
                />
              )}
            </div>
            {/* Filters Drawer */}
            <SimpleDrawer
              isOpen={filterDrawerOpen}
              stack={filterPages}
              onClose={() => setFilterDrawerOpen(false)}
              onBack={() => setFilterDrawerOpen(false)}
            />
          </div>
        ) : null}
      />
      <Route
        path="/gpt-trading"
        element={user ? (
          <div className="flex min-h-screen w-full relative overflow-auto" style={{ background: 'var(--color-bg-primary)' }}>
            {!isMobile && (
              <CollapsibleSidebar
                visibleTabs={visibleTabs}
                form={form}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                onLoginClick={() => setLoginOpen(true)}
                user={user}
                isTablet={isTablet}
                isMobile={isMobile}
                currentTab={'/gpt-trading'}
              />
            )}
            <div className={`flex-1 flex flex-col sm:pb-0 ${isMobile ? 'ml-[0px]' : 'ml-[55px]'}`}>
              <Topbar 
                user={user} 
                onLoginClick={() => setLoginOpen(true)} 
                currentPage={'GPT Trading'} 
                maxWidth={maxWidth} 
                isMobile={isMobile}
                toolbarItems={
                  <div className="w-full flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ToggleTabs 
                        options={[{ label: 'PAPER', value: 'PAPER' }, { label: 'LIVE', value: 'LIVE', disabled: true }]}
                        value={tradeMode}
                        onChange={setTradeMode}
                        className="max-w-[240px]"
                        activeStyles={{
                          PAPER: { background: 'linear-gradient(90deg, var(--brand-income-hex), var(--color-primary))', color: 'var(--color-text-white)' },
                          LIVE: { background: 'var(--color-danger)', color: 'var(--color-text-white)' }
                        }}
                      />
                    </div>
                    {!portfolio ? (
                      <Button 
                        label="Create Portfolio" 
                        width="w-auto" 
                        color="networth" 
                        className="h-8 px-3" 
                        onClick={() => {
                          setSimpleDrawerStack([{
                            title: 'Create Portfolio',
                            element: (
                              <PortfolioCreateForm onClose={() => setSimpleDrawerOpen(false)} />
                            )
                          }])
                          setSimpleDrawerOpen(true)
                        }}
                      />
                    ) : (
                      <Button 
                        icon={<IoMdSettings size={18} />} 
                        width="w-auto" 
                        color="white" 
                        className="h-8 px-3" 
                        onClick={() => {
                          setSimpleDrawerStack([{
                            title: 'Portfolio Settings',
                            element: (
                              <div className="p-4 space-y-3">
                                <div className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
                                  Manage your portfolio settings.
                                </div>
                                <Button 
                                  label="Delete Portfolio" 
                                  danger={true}
                                  width="w-full" 
                                  className="h-9"
                                  onClick={() => {
                                    setSimpleDrawerStack(prev => ([
                                      ...prev,
                                      {
                                        title: 'Confirm Deletion',
                                        element: (
                                          <div className="p-4 space-y-4">
                                            <div className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                                              Are you sure you want to delete this portfolio? This action cannot be undone.
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                              <Button 
                                                label="Cancel" 
                                                color="white" 
                                                className="h-9"
                                                onClick={() => { setSimpleDrawerStack(prev => prev.slice(0, -1)) }}
                                              />
                                              <DeletePortfolioButton onDeleted={() => { setSimpleDrawerOpen(false); setSimpleDrawerStack([]) }} />
                                            </div>
                                          </div>
                                        )
                                      }
                                    ]))
                                  }}
                                />
                              </div>
                            )
                          }])
                          setSimpleDrawerOpen(true)
                        }}
                      />
                    )}
                  </div>
                }
              />
              <div className={`flex-1 ${isMobile ? 'pb-[60px]' : ''}`}>
                <GptTradingPanel isMobile={isMobile} maxWidth={maxWidth} tradeMode={tradeMode} />
              </div>
              {/* Simple drawer for GPT Trading */}
              <SimpleDrawer
                isOpen={simpleDrawerOpen}
                stack={simpleDrawerStack}
                onClose={() => setSimpleDrawerOpen(false)}
                onBack={() => setSimpleDrawerOpen(false)}
              />
              {isMobile && (
                <MobileBottomBar
                  user={user}
                  onLoginClick={() => setLoginOpen(true)}
                  setLogoutOpen={() => {}}
                  visibleTabs={visibleTabs}
                  currentTab={'/gpt-trading'}
                />
              )}
            </div>
          </div>
        ) : null}
      />
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage setLoginOpen={setLoginOpen} />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LandingPage setLoginOpen={setLoginOpen} />} />
      <Route
        path="*"
        element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/simulate" replace />}
      />
    </Routes>
  );
}

export default App;

// Renders the matrix overlay only while LLM is running
function OverlayWhileLLM() {
  try {
    const { llmStatus } = usePortfolio()
    const running = String(llmStatus?.status || '').toLowerCase() === 'running'
    if (!running) return null
    return <MatrixOverlay />
  } catch {
    // Portfolio context may not be available on some routes
    return null
  }
}
