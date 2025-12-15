// components/ReminderList.jsx
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ReminderList() {
  const [lembretes, setLembretes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarLembretes();
  }, []);

  const carregarLembretes = async () => {
    try {
      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999);

      const q = query(
        collection(db, 'appointments'),
        where('reminderDate', '<=', Timestamp.fromDate(hoje)),
        where('reminderDone', '==', false),
        orderBy('reminderDate', 'asc')
      );

      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setLembretes(lista);
    } catch (error) {
      console.error('[carregarLembretes]', error);
    } finally {
      setLoading(false);
    }
  };

  const marcarFeito = async (id) => {
    try {
      const ref = doc(db, 'appointments', id);
      await updateDoc(ref, { reminderDone: true });
      setLembretes(prev => prev.filter(l => l.id !== id));
    } catch (error) {
      console.error('[marcarFeito]', error);
    }
  };

  if (loading) return <p>Carregando...</p>;

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
              <p className="font-semibold">{l.patientName}</p>
              <p className="text-sm text-gray-600">
                Consulta: {format(l.date.toDate(), 'dd/MM HH:mm', { locale: ptBR })}
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
    </div>
  );
}