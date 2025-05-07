import * as ReactDOM from 'react-dom/client';
import { HashRouter as Router, Link, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';

const App = () => (
  <Router>
    <div className='flex h-screen w-screen flex-col gap-4 p-4'>
      <nav className='mb-4 flex items-center justify-between gap-2 pb-2' style={{ borderBottom: '0.2px solid #D9D9D9' }}>
        <div id='logo' className='flex gap-2'>
          <img src={'/assets/images/logo-white.svg'} className='w-8'></img>
          <p className='text-xxs'>
            <span className='text-sm font-semibold'>Video Master</span> by CSA
          </p>
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
      </Routes>

      {/* FOOTER */}
    </div>
  </Router>
);

function render() {
  const root = ReactDOM.createRoot(document.getElementById('app'));
  root.render(<App />);
}

render();
