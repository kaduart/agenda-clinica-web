// components/ReminderList.jsx - VERSÃO API V2 (entidade Reminder real)
import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getReminders, updateReminder } from '../services/remindersRepo';
import { toast } from 'react-toastify';

export default function ReminderList() {
  const [lembretes, setLembretes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarLembretes();

    // Atualizar a cada 5 minutos
    const interval = setInterval(carregarLembretes, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const carregarLembretes = async () => {
    try {
      setLoading(true);

      // Busca lembretes pendentes do dia atual
      const hoje = new Date().toISOString().split('T')[0];
      const reminders = await getReminders({ status: 'pending', dueDate: hoje });
      const lista = Array.isArray(reminders) ? reminders : [];

      // Ordena por data/hora
      lista.sort((a, b) => {
        const dateA = `${a.dueDate || ''}T${a.dueTime || '00:00'}`;
        const dateB = `${b.dueDate || ''}T${b.dueTime || '00:00'}`;
        return dateA.localeCompare(dateB);
      });

      setLembretes(lista);
    } catch (error) {
      console.error('[carregarLembretes]', error);
      toast.error('Erro ao carregar lembretes');
      setLembretes([]);
    } finally {
      setLoading(false);
    }
  };

  const marcarFeito = async (id) => {
    try {
      await updateReminder(id, { status: 'done' });

      setLembretes(prev => prev.filter(l => (l._id || l.id) !== id));
      toast.success('Lembrete marcado como feito!');
    } catch (error) {
      console.error('[marcarFeito]', error);
      toast.error('Erro ao marcar lembrete');
    }
  };

  const formatarDataHora = (reminder) => {
    const dateStr = reminder.dueDate;
    if (!dateStr) return 'N/A';
    try {
      const iso = typeof dateStr === 'string' ? dateStr : new Date(dateStr).toISOString();
      return format(parseISO(iso.split('T')[0]), 'dd/MM', { locale: ptBR }) +
        (reminder.dueTime ? ` ${reminder.dueTime}` : '');
    } catch {
      return 'N/A';
    }
  };

  if (loading) return (
    <div className="p-4 text-center">
      <i className="fas fa-spinner fa-spin text-gray-400"></i>
      <p className="text-sm text-gray-500 mt-2">Carregando...</p>
    </div>
  );

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        Lembretes de Hoje ({lembretes.length})
      </h2>

      {lembretes.length === 0 && (
        <p className="text-gray-500">Nenhum lembrete pendente</p>
      )}

      {lembretes.map(l => (
        <div key={l._id || l.id} className="border p-3 mb-2 rounded bg-yellow-50">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold">{l.patient || 'Paciente não informado'}</p>
              <p className="text-sm text-gray-600">
                Consulta: {formatarDataHora(l)}
              </p>
              <p className="mt-2 text-sm font-medium">{l.text}</p>
              {l.professional && (
                <p className="text-xs text-gray-500 mt-1">Profissional: {l.professional}</p>
              )}
            </div>
            <button
              onClick={() => marcarFeito(l._id || l.id)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              ✓ Feito
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={carregarLembretes}
        className="mt-4 text-sm text-blue-600 hover:text-blue-800"
      >
        ↻ Atualizar
      </button>
    </div>
  );
}
