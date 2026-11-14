import React from 'react';
import { Link as RouterLink } from 'react-router';
import { useAuth } from '../context/AuthContext';

const AppFooter: React.FC = () => {
    const { isAuthenticated } = useAuth();

    return (
        <footer className="site-footer">
            <div className="site-footer-inner">
                <nav aria-label="Footer navigation">
                    <a href="/#the-app">How it works</a>
                    <RouterLink to="/calculator">Calculator</RouterLink>
                    <RouterLink to="/privacy">Privacy</RouterLink>
                    <RouterLink to="/terms">Terms</RouterLink>
                    <RouterLink to="/refunds">Refunds</RouterLink>
                    <RouterLink to="/plans">Plan</RouterLink>
                    {isAuthenticated ? (
                        <RouterLink to="/contact">Contact</RouterLink>
                    ) : (
                        <RouterLink to="/login">Log in</RouterLink>
                    )}
                </nav>
                <div className="site-footer-registration">
                    <span>&copy; </span>
                    <a href="https://techdivision.eu/" target="_blank" rel="noreferrer">TechDivision</a>
                </div>
            </div>
        </footer>
    );
};

export default AppFooter;
