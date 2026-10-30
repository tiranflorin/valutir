import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AppFooter: React.FC = () => {
    const { isAuthenticated } = useAuth();

    return (
        <footer className="site-footer">
            <div className="site-footer-inner">
                <nav aria-label="Footer navigation">
                    <a href="/#how-it-works">How it works</a>
                    <a href="/#business">For business</a>
                    <RouterLink to="/my-subs">Subscriptions</RouterLink>
                    <RouterLink to="/calendar">Calendar</RouterLink>
                    <RouterLink to="/plans">Plan</RouterLink>
                    {isAuthenticated ? (
                        <RouterLink to="/contact">Contact</RouterLink>
                    ) : (
                        <RouterLink to="/login">Log in</RouterLink>
                    )}
                </nav>
                <div className="site-footer-registration">
                    <span>® </span>
                    <a href="https://techdivision.eu/" target="_blank" rel="noreferrer">TechDivision</a>
                </div>
            </div>
        </footer>
    );
};

export default AppFooter;
