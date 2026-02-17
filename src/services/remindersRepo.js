import api from "./api";
import io from 'socket.io-client';

// Gerenciamento de Socket para Lembretes
let socket;
const getSocket = () => {
    if (!socket) {
        socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
            transports: ['websocket'],
            autoConnect: true,
        });
    }
    return socket;
};

export const listenReminders = (onData) => {
    // 1. Busca inicial via API
    const fetchList = async () => {
        try {
            const res = await api.get('/api/reminders');
            onData(res.data);
        } catch (e) {
            console.error('Erro ao buscar lembretes:', e);
            onData([]);
        }
    };
    fetchList();

    // 2. Escuta mudanças via Socket (Backend deve emitir ao alterar Reminder)
    const s = getSocket();
    const handleUpdate = () => fetchList();

    s.on('reminderCreated', handleUpdate);
    s.on('reminderUpdated', handleUpdate);
    s.on('reminderDeleted', handleUpdate);

    return () => {
        s.off('reminderCreated', handleUpdate);
        s.off('reminderUpdated', handleUpdate);
        s.off('reminderDeleted', handleUpdate);
    };
};

export const addReminder = async (payload) => {
    try {
        const res = await api.post('/api/reminders', payload);
        return res.data._id;
    } catch (e) {
        console.error('Erro ao adicionar lembrete:', e);
        throw e;
    }
};

export const updateReminder = async (id, patch) => {
    try {
        await api.patch(`/api/reminders/${id}`, patch);
    } catch (e) {
        console.error('Erro ao atualizar lembrete:', e);
        throw e;
    }
};

export const markReminderDone = async (id) => {
    await updateReminder(id, { status: "done" });
};

export const cancelReminder = async (id) => {
    await updateReminder(id, { status: "canceled" });
};

export const snoozeReminderDays = async (id, days = 7) => {
    try {
        const res = await api.get(`/api/reminders/${id}`);
        const r = res.data;
        if (!r?.dueDate) return;

        const [y, m, d] = String(r.dueDate).split("-").map(Number);
        const dt = new Date(y, (m || 1) - 1, d || 1);
        dt.setDate(dt.getDate() + Number(days || 0));

        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const dd = String(dt.getDate()).padStart(2, "0");

        await updateReminder(id, {
            dueDate: `${yyyy}-${mm}-${dd}`,
            status: "pending",
            snoozedAt: new Date()
        });
    } catch (e) {
        console.error('Erro ao adiar lembrete:', e);
    }
};
