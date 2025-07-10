import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
  useNavigate,
  useParams,
  matchPath,
} from 'react-router-dom';
import { supabase } from './supabaseClient';
import { FinancialProvider } from './contexts/FinancialContext';
import {
  CollapsibleSidebar,
  Topbar,
  AccountsPanel,
  TransactionsPanel,
  MobileBottomBar,
  LoginModal,
  LogoutModal,
  Toast,
} from './components';
import { useMediaQuery } from 'react-responsive';
import { FaChartArea } from 'react-icons/fa';
import { IoFolderOpen } from 'react-icons/io5';
import { FaReceipt } from 'react-icons/fa';
import { FiArrowLeft } from 'react-icons/fi';
import { FinancialContext } from './contexts/FinancialContext';
import { RightDrawer } from './components/ui';
import AccountDetail from './components/layout/AccountDetail';

import LandingPage from './components/layout/LandingPage';
import TransactionDetail from './components/layout/TransactionDetail';

function App() {
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [loginOpen, setLoginOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userChecked, setUserChecked] = useState(false); // <-- NEW
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'default' });
  const [currentSimDate, setCurrentSimDate] = useState(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const isTablet = useMediaQuery({ maxWidth: 1024 });
  const isMobile = useMediaQuery({ maxWidth: 670 });
  const [circleUsers, setCircleUsers] = useState([]);

  const allTabs = [
    { label: 'Accounts', icon: <IoFolderOpen size={18} />, route: '/accounts/cash', hasContent: false, requiresAuth: true },
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
      console.log('[WebSocket] Connected');
      socket.send(JSON.stringify(form));
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log(msg);

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
          console.log('[UNKNOWN MESSAGE]', msg);
      }
    };

    socket.onerror = (err) => {
      console.error('[WebSocket Error]', err);
      setToast({ message: 'Something went wrong.', type: 'error' });
      setLoading(false);
    };

    socket.onclose = () => {
      console.log('[WebSocket] Disconnected');
    };
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        setUser(data.user);
      }
      setUserChecked(true); // <-- ✅ Set once auth check completes
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
  };

  return (
    <FinancialProvider setToast={setToast}>
      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
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
      </Router>
    </FinancialProvider>
  );
}

function AppContent({
  loading, loadingPhase, loginOpen, setLoginOpen, user, userChecked, setUser,
  result, setResult, toast, setToast, currentSimDate, setCurrentSimDate,
  logoutOpen, setLogoutOpen, isTablet, isMobile, allTabs, visibleTabs,
  form, setForm, handleChange, handleSubmit, circleUsers
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { accountId } = useParams();
  const { accounts } = useContext(FinancialContext) || {};
  const maxWidth = 700;

  const authenticatedRoutes = ['/accounts', '/transactions'];

  useEffect(() => {
    if (!userChecked) return; // ⏳ wait until auth check is done

    const routeRequiresAuth = authenticatedRoutes.includes(location.pathname);

    if (routeRequiresAuth && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, userChecked, location.pathname]);

  let currentPage = 'Zentari';
  let currentTab = null;
  if (location.pathname === '/accounts') {
    currentPage = 'Accounts';
    currentTab = '/accounts';
  } else if (location.pathname === '/transactions') {
    currentPage = 'Transactions';
    currentTab = '/transactions';
  } else if (matchPath('/accounts/:accountId', location.pathname)) {
    const account = accounts?.find(acc => String(acc.id) === String(accountId));
    if (account) {
      const lastFour = account.mask ? String(account.mask).slice(-4) : '';
      currentPage = `${account.name}${lastFour ? ' ••••' + lastFour : ''}`;
    } else {
      currentPage = 'Account';
    }
    currentTab = '/accounts';
  }

  const handleLoginSuccess = () => {
    navigate('/accounts');
  };

  const handleLogoutSuccess = () => {
    navigate('/simulate');
  };

  useEffect(() => {
    if (loginOpen) {
    }
  }, [loginOpen]);

  return (
    <Routes>
      <Route
        path="/accounts"
        element={user ? <Navigate to="/accounts/cash" replace /> : null}
      />
      <Route
        path="/accounts/cash"
        element={user ? (
          <div className="flex min-h-screen w-full relative" style={{ background: 'var(--color-bg-primary)' }}>
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
              <Topbar user={user} onLoginClick={() => setLoginOpen(true)} currentPage={'Accounts'} maxWidth={maxWidth} isMobile={isMobile} />
              <div className={`flex-1 ${isMobile ? 'pb-[60px]' : ''}`}>
                <AccountsPanel isMobile={isMobile} maxWidth={maxWidth} circleUsers={circleUsers} activeTab="cash" />
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
        path="/accounts/credit"
        element={user ? (
          <div className="flex min-h-screen w-full relative" style={{ background: 'var(--color-bg-primary)' }}>
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
              <Topbar user={user} onLoginClick={() => setLoginOpen(true)} currentPage={'Accounts'} maxWidth={maxWidth} isMobile={isMobile} />
              <div className={`flex-1 ${isMobile ? 'pb-[60px]' : ''}`}>
                <AccountsPanel isMobile={isMobile} maxWidth={maxWidth} circleUsers={circleUsers} activeTab="credit" />
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
        path="/accounts/investment"
        element={user ? (
          <div className="flex min-h-screen w-full relative" style={{ background: 'var(--color-bg-primary)' }}>
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
              <Topbar user={user} onLoginClick={() => setLoginOpen(true)} currentPage={'Accounts'} maxWidth={maxWidth} isMobile={isMobile} />
              <div className={`flex-1 ${isMobile ? 'pb-[60px]' : ''}`}>
                <AccountsPanel isMobile={isMobile} maxWidth={maxWidth} circleUsers={circleUsers} activeTab="investment" />
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
        path="/accounts/loan"
        element={user ? (
          <div className="flex min-h-screen w-full relative" style={{ background: 'var(--color-bg-primary)' }}>
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
              <Topbar user={user} onLoginClick={() => setLoginOpen(true)} currentPage={'Accounts'} maxWidth={maxWidth} isMobile={isMobile} />
              <div className={`flex-1 ${isMobile ? 'pb-[60px]' : ''}`}>
                <AccountsPanel isMobile={isMobile} maxWidth={maxWidth} circleUsers={circleUsers} activeTab="loan" />
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
          <div className="flex min-h-screen w-full relative" style={{ background: 'var(--color-bg-primary)' }}>
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
              <Topbar user={user} onLoginClick={() => setLoginOpen(true)} currentPage={'Transactions'} maxWidth={maxWidth} isMobile={isMobile} />
              <div className={`flex-1 ${isMobile ? 'pb-[60px]' : ''}`}>
                <TransactionsPanel isMobile={isMobile} maxWidth={maxWidth} circleUsers={circleUsers} />
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
        path="/accounts/:tab/:accountId"
        element={user ? (
          <AccountDrawerLayout
            user={user}
            isMobile={isMobile}
            isTablet={isTablet}
            visibleTabs={visibleTabs}
            form={form}
            handleChange={handleChange}
            handleSubmit={handleSubmit}
            setLoginOpen={setLoginOpen}
            maxWidth={maxWidth}
          />
        ) : null}
      />

      <Route
        path="/transaction/:transactionId"
        element={user ? (
          <TransactionDetailLayout
            user={user}
            isMobile={isMobile}
            isTablet={isTablet}
            visibleTabs={visibleTabs}
            form={form}
            handleChange={handleChange}
            handleSubmit={handleSubmit}
            setLoginOpen={setLoginOpen}
            maxWidth={maxWidth}
          />
        ) : null}
      />
      <Route path="/" element={user ? <Navigate to="/accounts/cash" /> : <LandingPage setLoginOpen={setLoginOpen} />} />
      <Route path="/login" element={user ? <Navigate to="/accounts/cash" /> : <LandingPage setLoginOpen={setLoginOpen} />} />
      <Route
        path="*"
        element={user ? <Navigate to="/accounts/cash" replace /> : <Navigate to="/simulate" replace />}
      />
    </Routes>
  );
}



function TransactionDetailLayout({ user, isMobile, isTablet, visibleTabs, form, handleChange, handleSubmit, setLoginOpen, maxWidth }) {
  const { transactionId } = useParams();
  const navigate = useNavigate();
  const { transactions } = useContext(FinancialContext) || {};
  const transaction = transactions?.find(txn => String(txn.id) === String(transactionId));
  return (
    <div className="flex min-h-screen w-full overflow-x-hidden relative" style={{ background: 'var(--color-bg-primary)' }}>
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
          currentPage={'Transaction'}
          maxWidth={maxWidth}
          showBackArrow={true}
          onBack={() => navigate('/transactions')}
          isMobile={isMobile}
        />
        <div className={`flex-1 ${isMobile ? 'pb-[60px]' : ''}`}> 
          <TransactionDetail maxWidth={maxWidth} transaction={transaction} />
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
  );
}

// Layout for account drawer
function AccountDrawerLayout({ user, isMobile, isTablet, visibleTabs, form, handleChange, handleSubmit, setLoginOpen, maxWidth }) {
  const { accountId, tab } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { accounts } = useContext(FinancialContext) || {};
  const account = accounts?.find(acc => String(acc.id) === String(accountId));
  
  // Determine which tab to go back to based on the tab parameter
  const getBackPath = () => {
    return `/accounts/${tab || 'cash'}`;
  };
  
  // Disable main page scroll when drawer is open on desktop
  useEffect(() => {
    if (!isMobile) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'auto';
      };
    }
  }, [isMobile]);
  
  // On mobile, show as full page instead of drawer
  if (isMobile) {
    return (
      <div className="flex min-h-screen w-full relative" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="flex-1 flex flex-col sm:pb-0 ml-[0px]">
          <Topbar 
            user={user} 
            onLoginClick={() => setLoginOpen(true)} 
            currentPage={'Accounts'} 
            maxWidth={maxWidth} 
            isMobile={isMobile}
            showBackArrow={true}
            onBack={() => navigate(getBackPath())}
          />
          <div className="flex-1 pb-[60px]">
            <AccountDetail account={account} />
          </div>
          <MobileBottomBar
            user={user}
            onLoginClick={() => setLoginOpen(true)}
            setLogoutOpen={() => {}}
            visibleTabs={visibleTabs}
            currentTab={'/accounts'}
          />
        </div>
      </div>
    );
  }
  
  // On desktop/tablet, show as drawer
  return (
    <>
      <div className="flex min-h-screen w-full relative" style={{ background: 'var(--color-bg-primary)' }}>
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
        <div className="flex-1 flex flex-col sm:pb-0 ml-[55px]">
          <Topbar user={user} onLoginClick={() => setLoginOpen(true)} currentPage={'Accounts'} maxWidth={maxWidth} isMobile={isMobile} />
          <div className="flex-1">
            <AccountsPanel isMobile={isMobile} maxWidth={maxWidth} circleUsers={[]} activeTab={tab || 'cash'} />
          </div>
        </div>
      </div>
      
      <RightDrawer 
        isOpen={true} 
        onClose={() => navigate(getBackPath())}
        header={account?.name || 'Account Details'}
      >
        <AccountDetail account={account} />
      </RightDrawer>
    </>
  );
}

export default App;
