// components/ReminderList.jsx - VERSÃO API (sem Firebase)
import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../services/api';
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
      
      // Buscar agendamentos com lembretes pendentes
      const hoje = new Date().toISOString().split('T')[0];
      const response = await api.get('/api/appointments', {
        params: {
          startDate: hoje,
          endDate: hoje,
          hasReminder: true,
          reminderDone: false
        }
      });
      
      // Filtrar apenas os que têm lembretes
      const comLembretes = response.data.filter(apt => 
        apt.reminder && !apt.reminderDone
      );
      
      setLembretes(comLembretes);
    } catch (error) {
      console.error('[carregarLembretes]', error);
      toast.error('Erro ao carregar lembretes');
    } finally {
      setLoading(false);
    }
  };

  const marcarFeito = async (id) => {
    try {
      await api.patch(`/api/appointments/${id}/reminder`, {
        reminderDone: true
      });
      
      setLembretes(prev => prev.filter(l => l.id !== id));
      toast.success('Lembrete marcado como feito!');
    } catch (error) {
      console.error('[marcarFeito]', error);
      toast.error('Erro ao marcar lembrete');
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
        <div key={l.id} className="border p-3 mb-2 rounded bg-yellow-50">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold">{l.patientName || l.patient?.fullName}</p>
              <p className="text-sm text-gray-600">
                Consulta: {l.date ? format(parseISO(l.date), 'dd/MM HH:mm', { locale: ptBR }) : 'N/A'}
              </p>
              <p className="mt-2 text-sm font-medium">{l.reminder}</p>
            </div>
            <button 
              onClick={() => marcarFeito(l.id)}
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
