import { useState } from 'react';
import axios from 'axios';
import { saveSession } from './session';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function LoginScreen({ onLogged, notice }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('secretary');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function submit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await axios.post(`${API_URL}/api/login`, { email: email.trim(), password, role }, { timeout: 20000 });
            if (!data?.token) throw new Error('sem token');
            onLogged(saveSession(data.token, data.user));
        } catch (err) {
            const status = err?.response?.status;
            setError(status === 400 || status === 401
                ? 'E-mail, senha ou perfil não conferem.'
                : 'Não foi possível entrar agora. Tente de novo em instantes.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#0d9387] flex items-center justify-center px-4">
            <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <img className="w-10 h-10 object-contain" src="/images/cabeca-logo-verde-clara.png" alt="" />
                    <div>
                        <h1 className="font-head text-lg font-bold text-slate-800 leading-tight">Agenda externa</h1>
                        <p className="text-sm text-slate-500">Entre com a sua conta do ERP</p>
                    </div>
                </div>

                {notice && <p className="text-sm rounded-lg bg-amber-50 text-amber-800 px-3 py-2">{notice}</p>}

                <div className="inline-flex rounded-xl bg-slate-100 p-0.5" role="group" aria-label="Perfil">
                    {[['secretary', 'Secretária'], ['admin', 'Admin']].map(([value, label]) => (
                        <button key={value} type="button" aria-pressed={role === value} onClick={() => setRole(value)}
                            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-semibold ${role === value ? 'bg-white text-[#0b7d73] shadow-sm' : 'text-slate-500'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    E-mail
                    <input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)}
                        className="h-10 rounded-lg border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#0d9387]" />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Senha
                    <input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)}
                        className="h-10 rounded-lg border border-slate-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#0d9387]" />
                </label>

                {error && <p className="text-sm text-red-700" role="alert">{error}</p>}

                <button type="submit" disabled={loading}
                    className="h-10 rounded-lg bg-[#0d9387] text-white font-semibold hover:bg-[#0b7d73] disabled:opacity-60">
                    {loading ? 'Entrando…' : 'Entrar'}
                </button>
                <p className="text-xs text-slate-500">Quem não tem acesso pede ao admin para cadastrar em Gestão › Secretárias no ERP.</p>
            </form>
        </div>
    );
}
