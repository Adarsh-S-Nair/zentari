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
import {
  CollapsibleSidebar,
  Topbar,
  AccountsPanel,
  TransactionsPanel,
  DashboardPanel,
  MobileBottomBar,
  LoginModal,
  LogoutModal,
  Toast,
  CircleUserToggle,
  AccountDetail,
  LandingPage,
  TransactionDetail,
} from './components';
import { Button, RightDrawer, BottomSheet, Modal } from './components/ui';
import { TransactionFilterForm } from './components/forms';
import { useMediaQuery } from 'react-responsive';
import { FaChartArea, FaSearch, FaTachometerAlt } from 'react-icons/fa';
import { IoFolderOpen } from 'react-icons/io5';
import { FaReceipt } from 'react-icons/fa';
import { FiArrowLeft, FiFilter } from 'react-icons/fi';
import { FinancialContext } from './contexts/FinancialContext';

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
  const [drawerConfig, setDrawerConfig] = useState({
    isOpen: false,
    title: '',
    content: null,
    onClose: null,
    type: 'drawer' // 'drawer' or 'sheet'
  });

  const openDrawer = React.useCallback((config) => {
    setDrawerConfig({
      ...config,
      isOpen: true,
    });
  }, []);

  const closeDrawer = React.useCallback(() => {
    if (drawerConfig.onClose) {
      drawerConfig.onClose();
    }
    setDrawerConfig(prev => ({ ...prev, isOpen: false }));
  }, [drawerConfig.onClose]);

  return (
    <DrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      {children}
      <GlobalDrawer config={drawerConfig} onClose={closeDrawer} />
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
function GlobalDrawer({ config, onClose }) {
  const isMobile = useMediaQuery({ maxWidth: 670 });
  const { isOpen, title, content, type } = config;

  // Memoize the content to prevent unnecessary re-renders
  const memoizedContent = React.useMemo(() => content, [content]);

  if (!isOpen) return null;

  // On mobile, always use bottom sheet
  if (isMobile) {
    return (
      <BottomSheet 
        isOpen={isOpen} 
        onClose={onClose}
        maxHeight="80vh"
        header={title}
      >
        {memoizedContent}
      </BottomSheet>
    );
  }

  // On desktop, use right drawer
  return (
    <RightDrawer 
      isOpen={isOpen} 
      onClose={onClose}
      header={title}
    >
      {memoizedContent}
    </RightDrawer>
  );
}

function App() {
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [loginOpen, setLoginOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userChecked, setUserChecked] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'default' });
  const [currentSimDate, setCurrentSimDate] = useState(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const isTablet = useMediaQuery({ maxWidth: 1024 });
  const isMobile = useMediaQuery({ maxWidth: 670 });
  const [circleUsers, setCircleUsers] = useState([]);

  const allTabs = [
    { label: 'Dashboard', icon: <FaTachometerAlt size={18} />, route: '/dashboard', hasContent: false, requiresAuth: true },
    { label: 'Accounts', icon: <IoFolderOpen size={18} />, route: '/accounts', hasContent: false, requiresAuth: true },
    { label: 'Transactions', icon: <FaReceipt size={18} />, route: '/transactions', hasContent: false, requiresAuth: true },
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
    navigate('/dashboard');
  };

  return (
    <FinancialProvider setToast={setToast}>
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
            <Toast message={toast.message} type={toast.type} />
          </Router>
        </ModalProvider>
      </DrawerProvider>
    </FinancialProvider>
  );
}

function AppContent({
  loading, loadingPhase, loginOpen, setLoginOpen, user, userChecked, setUser,
  result, setResult, toast, setToast, currentSimDate, setCurrentSimDate,
  logoutOpen, setLogoutOpen, isTablet, isMobile, allTabs, visibleTabs,
  form, setForm, handleChange, handleSubmit, circleUsers
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { fetchFilteredTransactions } = useContext(FinancialContext);
  const { openDrawer } = useDrawer();
  const maxWidth = 700;

  // Toolbar state
  const [selectedCircleUser, setSelectedCircleUser] = useState(null);
  const [plaidModalOpen, setPlaidModalOpen] = useState(false);
  const [plaidLoading, setPlaidLoading] = useState(false);
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
      const searchQuery = searchParams.get('searchQuery');
      const accounts = searchParams.get('accounts');
      
      // Only create filters if there are URL parameters
      if (categories || transactionType || amountRange || dateRange || searchQuery || accounts) {
        setIsApplyingFilters(true);
        
        const urlFilters = {
          categories: categories ? [categories] : [],
          transactionType: transactionType || 'all',
          amountRange: amountRange || 'all',
          dateRange: dateRange || 'all',
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

  const authenticatedRoutes = ['/dashboard', '/accounts', '/transactions'];

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
  }

  const handleLoginSuccess = () => {
    navigate('/dashboard');
  };

  const handleLogoutSuccess = () => {
    navigate('/simulate');
  };

  const handleFilterClick = () => {
    openDrawer({
      title: 'Filter Transactions',
      content: (
        <TransactionFilterForm
          currentFilters={activeFilters}
          onApply={async (filters) => {
            console.log('Applied filters:', filters);
            setActiveFilters(filters);
            
            // Update URL with filters
            updateURLWithFilters(filters);
            
            // Fetch filtered transactions
            if (user?.id) {
              const filtered = await fetchFilteredTransactions(user.id, filters);
              setFilteredTransactions(filtered);
            }
          }}
          onReset={() => {
            console.log('Reset filters');
            setActiveFilters(null);
            setFilteredTransactions(null);
            
            // Clear URL parameters
            navigate('/transactions', { replace: true });
          }}
          onClose={() => {
            // Drawer will close automatically
          }}
        />
      ),
      onClose: () => {
        // No additional cleanup needed
      }
    });
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
                  <CircleUserToggle
                    users={circleUsers}
                    selectedUser={selectedCircleUser}
                    onSelectUser={setSelectedCircleUser}
                  />
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
      <Route
        path="/accounts"
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
                currentTab={'/accounts'}
              />
            )}
            <div className={`flex-1 flex flex-col sm:pb-0 ${isMobile ? 'ml-[0px]' : 'ml-[55px]'}`}>
              <Topbar 
                user={user} 
                onLoginClick={() => setLoginOpen(true)} 
                currentPage={'Accounts'} 
                maxWidth={maxWidth} 
                isMobile={isMobile}
                toolbarItems={
                  <div className="flex items-center justify-between gap-3">
                    <CircleUserToggle
                      users={circleUsers}
                      selectedUser={selectedCircleUser}
                      onSelectUser={setSelectedCircleUser}
                    />
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
                }
              />
              <div className={`flex-1 ${isMobile ? 'pb-[60px]' : ''}`}>
                <AccountsPanel isMobile={isMobile} maxWidth={maxWidth} circleUsers={circleUsers} />
              </div>
              {isMobile && (
                <MobileBottomBar
                  user={user}
                  onLoginClick={() => setLoginOpen(true)}
                  setLogoutOpen={() => {}}
                  visibleTabs={visibleTabs}
                  currentTab={'/accounts'}
                />
              )}
            </div>
          </div>
        ) : null}
      />
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
