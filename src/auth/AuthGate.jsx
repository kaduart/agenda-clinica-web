import { useEffect, useState } from 'react';
import LoginScreen from './LoginScreen';
import { getSession } from './session';

export default function AuthGate({ children }) {
    const [session, setSession] = useState(() => getSession());
    const [notice, setNotice] = useState('');

    useEffect(() => {
        const onEnd = (e) => {
            setNotice(e.detail?.reason === 'expired' ? 'Sua sessão expirou. Entre de novo.' : '');
            setSession(null);
        };
        window.addEventListener('agenda-session-ended', onEnd);
        return () => window.removeEventListener('agenda-session-ended', onEnd);
    }, []);

    if (!session) return <LoginScreen notice={notice} onLogged={(s) => { setNotice(''); setSession(s); }} />;
    return children;
}
