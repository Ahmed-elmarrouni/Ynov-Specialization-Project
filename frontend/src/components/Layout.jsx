import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, BookOpen, Settings,
  LogOut, Menu, ChevronLeft, UserCircle, Upload
} from 'lucide-react';
import GlobalLoader from './GlobalLoader';

import { getUserProfile } from '../services/user';
const Layout = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [userRole, setUserRole] = useState('User');
  const [userName, setUserName] = useState('Loading...');
  const location = useLocation();
  const navigation = useNavigation();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));

        if (payload.role) {
          const formattedRole = payload.role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          setUserRole(formattedRole);
        }

        if (payload.first_name) {
          const lastInitial = payload.last_name ? `${payload.last_name.charAt(0)}.` : '';
          setUserName(`${payload.first_name} ${lastInitial}`);
        }
      }
    } catch (e) {
      console.error("Failed to parse token", e);
    }
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getUserProfile();
        setUserName(`${data.first_name} ${data.last_name.charAt(0)}.`);

        const formattedRole = data.role.split('_')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        setUserRole(formattedRole);
      } catch (e) {
        console.error("Failed to fetch user profile", e);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Students', path: '/students', icon: Users },
    { name: 'Modules', path: '/modules', icon: BookOpen },
    { name: 'Import', path: '/import', icon: Upload },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background text-text-main font-sans overflow-hidden relative">
      {navigation.state === 'loading' && <GlobalLoader />}

      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isOpen ? '16rem' : '5rem' }}
        className="relative z-20 h-full bg-surface/70 backdrop-blur-2xl border-r border-border/50 flex flex-col shadow-2xl transition-all duration-300"
      >
        {/* Sidebar Header */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-border/50">
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.h1
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-lg font-bold text-primary tracking-tight whitespace-nowrap overflow-hidden"
              >
                EduTrack.
              </motion.h1>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-colors focus:outline-none cursor-pointer"
          >
            {isOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 space-y-2 overflow-y-auto px-3 scrollbar-hide">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                title={!isOpen ? item.name : ""}
                className={`flex items-center px-3 py-3 rounded-xl transition-all duration-200 group relative
                    ${isActive ? 'bg-primary/10 text-primary shadow-sm shadow-primary/5' : 'text-text-muted hover:bg-surface hover:text-text-main'}`}
              >
                {isActive && (
                  <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-8 bg-primary rounded-r-full" />
                )}
                <item.icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : 'group-hover:text-primary'}`} />
                <AnimatePresence mode="wait">
                  {isOpen && (
                    <motion.span
                      initial={{ opacity: 0, w: 0 }}
                      animate={{ opacity: 1, w: "auto" }}
                      exit={{ opacity: 0, w: 0 }}
                      className="ml-3 text-sm font-semibold whitespace-nowrap"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer - Logout Only */}
        <div className="p-4 border-t border-border/50">
          <button
            onClick={handleLogout}
            title={!isOpen ? "Logout" : ""}
            className={`w-full flex items-center ${!isOpen ? 'justify-center' : 'px-4'} py-2.5 text-sm font-semibold rounded-xl text-error hover:bg-error/10 hover:shadow-sm hover:shadow-error/10 transition-all duration-200 cursor-pointer`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isOpen && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative z-10">

        {/* Top Header - Profile moved here */}
        <header className="h-20 bg-surface/50 backdrop-blur-md border-b border-border/50 flex items-center justify-between px-8 z-10">
          <h2 className="text-xl font-bold text-secondary capitalize">
            {location.pathname === '/' ? 'Dashboard Overview' : location.pathname.substring(1).replace('-', ' ')}
          </h2>

          {/* Dynamic User Profile Block */}
          <div className="flex items-center space-x-4 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-text-main leading-none">{userName}</p>
              <p className="text-xs text-text-muted font-medium uppercase tracking-wider mt-1">{userRole}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-linear-to-tr from-primary to-emerald-400 p-0.5 shrink-0">
              <div className="w-full h-full rounded-full bg-surface flex items-center justify-center">
                <UserCircle className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-auto p-8 scrollbar-hide">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;