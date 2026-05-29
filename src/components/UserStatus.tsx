import React, { useEffect,useState } from 'react';
import AuthButtons from '@/components/AuthButtons';
import { connectAuthenticatedWS,getAuthenticatedWSUrl } from '@/lib/ws';
import { Button } from '@deriv-com/ui';

const UserStatus: React.FC = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [accounts, setAccounts] = useState<Record<string, unknown>[]>([]);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [accountId, setAccountId] = useState('');

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const authToken = localStorage.getItem('authToken');
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (authToken) {
                headers.Authorization = `Bearer ${authToken}`;
            }

            const response = await fetch('/api/accounts', { headers });
            if (response.ok) {
                const data = await response.json();
                setAccounts(data.accounts || data.data || []);
                setIsLoggedIn(true);
            } else {
                setIsLoggedIn(false);
            }
        } catch {
            setIsLoggedIn(false);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        setIsLoggedIn(false);
        setAccounts([]);
        setWs(null);
    };

    const handleGetOTP = async () => {
        if (!accountId) return;
        try {
            const otpUrl = await getAuthenticatedWSUrl(accountId);
            const newWs = connectAuthenticatedWS(otpUrl);
            setWs(newWs);

            newWs.onopen = () => {
                console.log('WebSocket connected');
                // Send a test message
                newWs.send(JSON.stringify({
                    proposal: 1,
                    symbol: 'R_10',
                    contract_type: 'CALL',
                    duration: 1,
                    duration_unit: 'm',
                    amount: 1,
                    currency: 'USD',
                    basis: 'stake'
                }));
            };

            newWs.onmessage = (event) => {
                console.log('Received:', event.data);
            };

            newWs.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            newWs.onclose = () => {
                console.log('WebSocket closed');
            };
        } catch (error) {
            console.error('Failed to get OTP:', error);
        }
    };

    const handleCloseWS = () => {
        if (ws) {
            ws.close();
            setWs(null);
        }
    };

    if (!isLoggedIn) {
        return (
            <div style={{ padding: '20px' }}>
                <h2>Please log in</h2>
                <AuthButtons />
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            <h2>Logged in</h2>
            <p>Accounts: {accounts.length}</p>
            <Button onClick={handleLogout}>Logout</Button>

            <div style={{ marginTop: '20px' }}>
                <h3>Get OTP for WebSocket</h3>
                <input
                    type="text"
                    placeholder="Account ID (e.g., demo)"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    style={{ marginRight: '10px' }}
                />
                <Button onClick={handleGetOTP} disabled={!accountId}>Get OTP & Connect WS</Button>
                {ws && <Button onClick={handleCloseWS} style={{ marginLeft: '10px' }}>Close WS</Button>}
            </div>
        </div>
    );
};

export default UserStatus;