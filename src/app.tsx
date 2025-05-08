import * as ReactDOM from 'react-dom/client';
import { HashRouter as Router, Link, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import { CssBaseline, IconButton, ThemeProvider } from '@mui/material';
import { KeyboardBackspace } from '@mui/icons-material';
import { useEffect, useMemo, useState } from 'react';
import Join from './pages/Join';
import Convert from './pages/Convert';
import { getTheme } from './styles/theme';

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'light' | 'dark'>('dark');
  const theme = useMemo(() => getTheme(mode), [mode]);

  useEffect(() => {
    console.log('theme', theme);
    console.log(location);
  }, [location]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className='flex h-screen w-screen flex-col gap-4 p-4'>
        <nav className='mb-4 flex h-12 items-center justify-between gap-2 pb-2' style={{ borderBottom: '0.2px solid #D9D9D9' }}>
          <div id='logo' className='flex select-none gap-1'>
            {location.pathname !== '/' && (
              <IconButton color='inherit' onClick={() => navigate(-1)}>
                <KeyboardBackspace />
              </IconButton>
            )}

            <div className='flex cursor-pointer items-center justify-between gap-2' onClick={() => navigate('/')}>
              <img src={'/assets/icons/logo-white.svg'} className='w-8'></img>
              <p className='text-xxs'>
                <span className='text-sm font-semibold'>Video Master</span> by CSA
              </p>
            </div>
          </div>

          <div id='menu' className='space-x-4'>
            <Link to='/' className='hover:underline'>
              Home
            </Link>
            <Link to='/about' className='hover:underline'>
              About
            </Link>
          </div>
        </nav>

        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/join' element={<Join />} />
          <Route path='/convert' element={<Convert />} />
          <Route path='*' element={<Navigate to='/' />} />
        </Routes>

        {/* FOOTER */}
      </div>
    </ThemeProvider>
  );
};

function render() {
  const root = ReactDOM.createRoot(document.getElementById('app'));
  root.render(
    <Router>
      <App />
    </Router>
  );
}

render();
