import React from 'react';
import { Button } from '@deriv-com/ui';
import { startLogin, startSignup } from '@/lib/auth';

const AuthButtons: React.FC = () => {
    const handleLogin = () => {
        startLogin();
    };

    const handleSignup = () => {
        startSignup();
    };

    return (
        <div style={{ display: 'flex', gap: '10px' }}>
            <Button onClick={handleLogin}>Login</Button>
            <Button onClick={handleSignup} variant="outlined">Signup</Button>
        </div>
    );
};

export default AuthButtons;