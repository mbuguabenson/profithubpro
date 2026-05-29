import React from 'react';
import UserStatus from '@/components/UserStatus';

const AuthPage: React.FC = () => {
    return (
        <div>
            <h1>Authentication</h1>
            <UserStatus />
        </div>
    );
};

export default AuthPage;