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
  SimulationPanel,
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
import AccountDetail from './components/layout/AccountDetail';

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

  const allTabs = [
    { label: 'Accounts', icon: <IoFolderOpen size={18} />, route: '/accounts', hasContent: false, requiresAuth: true },
    { label: 'Transactions', icon: <FaReceipt size={18} />, route: '/transactions', hasContent: false, requiresAuth: true },
    { label: 'Simulation', icon: <FaChartArea size={18} />, route: '/simulate', hasContent: true, requiresAuth: false },
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

  useEffect(() => {
    console.log('[App] loginOpen state changed:', loginOpen);
  }, [loginOpen]);

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
        />
      </Router>
    </FinancialProvider>
  );
}

function AppContent({
  loading, loadingPhase, loginOpen, setLoginOpen, user, userChecked, setUser,
  result, setResult, toast, setToast, currentSimDate, setCurrentSimDate,
  logoutOpen, setLogoutOpen, isTablet, isMobile, allTabs, visibleTabs,
  form, setForm, handleChange, handleSubmit
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { accountId } = useParams();
  const { accounts } = useContext(FinancialContext) || {};
  const maxWidth = 700;

  // Memoize the account for detail page
  const accountDetailAccount = useMemo(() => {
    if (accountId && accounts) {
      return accounts.find(acc => String(acc.id) === String(accountId));
    }
    return null;
  }, [accountId, accounts]);

  const authenticatedRoutes = ['/accounts', '/transactions'];

  useEffect(() => {
    if (!userChecked) return; // ⏳ wait until auth check is done

    const routeRequiresAuth = authenticatedRoutes.includes(location.pathname);

    if (routeRequiresAuth && !user) {
      navigate('/simulate', { replace: true });
    }
  }, [user, userChecked, location.pathname]);

  useEffect(() => {
    console.log('[AppContent] loginOpen:', loginOpen);
  }, [loginOpen]);

  let currentPage = 'Zentari';
  let currentTab = null;
  if (location.pathname === '/accounts') {
    currentPage = 'Accounts';
    currentTab = '/accounts';
  } else if (location.pathname === '/transactions') {
    currentPage = 'Transactions';
    currentTab = '/transactions';
  } else if (location.pathname === '/simulate') {
    currentPage = 'Simulation';
    currentTab = '/simulate';
  } else if (matchPath('/accounts/:accountId', location.pathname)) {
    if (accountDetailAccount) {
      const lastFour = accountDetailAccount.mask ? String(accountDetailAccount.mask).slice(-4) : '';
      currentPage = `${accountDetailAccount.name}${lastFour ? ' ••••' + lastFour : ''}`;
    } else {
      currentPage = 'Account';
    }
    currentTab = '/accounts';
  }

  // Debug logging for account detail header
  console.log('[AppContent] accountId:', accountId);
  console.log('[AppContent] accounts:', accounts);
  console.log('[AppContent] accountDetailAccount:', accountDetailAccount);
  console.log('[AppContent] currentPage:', currentPage);

  const handleLoginSuccess = () => {
    navigate('/accounts');
  };

  const handleLogoutSuccess = () => {
    navigate('/simulate');
  };

  useEffect(() => {
    if (loginOpen) {
      console.log('[AppContent] LoginModal should be open now');
    }
  }, [loginOpen]);

  return (
    <Routes>
      <Route
        path="/simulate"
        element={
          <>
            {console.log('[AppContent] Rendering /simulate route, loginOpen:', loginOpen)}
            <div className="flex h-screen w-screen overflow-x-hidden overflow-y-hidden relative">
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
                  currentTab={'/simulate'}
                />
              )}
              <div className={`flex-1 h-full overflow-y-auto flex flex-col sm:pb-0 ${isMobile ? 'ml-[0px]' : 'ml-[55px]'}`}>
                <Topbar user={user} onLoginClick={() => setLoginOpen(true)} currentPage={'Simulation'} maxWidth={maxWidth} />
                <div className={`flex-1 overflow-y-auto ${isMobile ? 'pb-[60px]' : ''}`}>
                  <SimulationPanel
                    loading={loading}
                    loadingPhase={loadingPhase}
                    result={result}
                    currentSimDate={currentSimDate}
                    isMobile={isMobile}
                    form={form}
                    maxWidth={maxWidth}
                  />
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
            {loginOpen && console.log('[AppContent] Rendering LoginModal (loginOpen is true)')}
          </>
        }
      />
      <Route
        path="/accounts"
        element={user ? (
          <div className="flex h-screen w-screen overflow-x-hidden overflow-y-hidden relative">
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
            <div className={`flex-1 h-full overflow-y-auto flex flex-col sm:pb-0 ${isMobile ? 'ml-[0px]' : 'ml-[55px]'}`}>
              <Topbar user={user} onLoginClick={() => setLoginOpen(true)} currentPage={'Accounts'} maxWidth={maxWidth} />
              <div className={`flex-1 overflow-y-auto ${isMobile ? 'pb-[60px]' : ''}`}>
                <AccountsPanel isMobile={isMobile} maxWidth={maxWidth} />
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
          <div className="flex h-screen w-screen overflow-x-hidden overflow-y-hidden relative">
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
            <div className={`flex-1 h-full overflow-y-auto flex flex-col sm:pb-0 ${isMobile ? 'ml-[0px]' : 'ml-[55px]'}`}>
              <Topbar user={user} onLoginClick={() => setLoginOpen(true)} currentPage={'Transactions'} maxWidth={maxWidth} />
              <div className={`flex-1 overflow-y-auto ${isMobile ? 'pb-[60px]' : ''}`}>
                <TransactionsPanel isMobile={isMobile} maxWidth={maxWidth} />
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
        path="/accounts/:accountId"
        element={user ? (
          <AccountDetailLayout
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
        path="*"
        element={user ? <Navigate to="/accounts" replace /> : <Navigate to="/simulate" replace />}
      />
    </Routes>
  );
}

// Layout for account detail page
function AccountDetailLayout({ user, isMobile, isTablet, visibleTabs, form, handleChange, handleSubmit, setLoginOpen, maxWidth }) {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const { accounts } = useContext(FinancialContext) || {};
  const account = accounts?.find(acc => String(acc.id) === String(accountId));
  return (
    <div className="flex h-screen w-screen overflow-x-hidden overflow-y-hidden relative">
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
      <div className={`flex-1 h-full overflow-y-auto flex flex-col sm:pb-0 ${isMobile ? 'ml-[0px]' : 'ml-[55px]'}`}> 
        <Topbar
          user={user}
          onLoginClick={() => setLoginOpen(true)}
          currentPage={'Accounts'}
          maxWidth={maxWidth}
          showBackArrow={true}
          onBack={() => navigate('/accounts')}
        />
        <div className={`flex-1 overflow-y-auto ${isMobile ? 'pb-[60px]' : ''}`}> 
          <AccountDetail maxWidth={maxWidth} account={account} />
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
  );
}

export default App;
