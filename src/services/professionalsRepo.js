
import api from "./api";

export const listenProfessionals = (onData) => {
  const fetchData = async () => {
    try {
      const response = await api.get('/api/v2/doctors/active');
      const doctors = (response.data?.data?.doctors || [])
        .map(doc => ({
          id: doc._id?.toString() || doc.id,
          fullName: doc.fullName,
          name: doc.name || doc.fullName,
          specialty: doc.specialty,
          phoneNumber: doc.phoneNumber || ''
        }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName));
      onData(doctors);
    } catch (error) {
      console.error("Erro ao buscar profissionais:", error);
      onData([]);
    }
  };

  fetchData();

  // Retorna função de "unsubscribe" síncrona
  return () => { };
};

export const addProfessional = async (payload) => {
  const response = await api.post('/api/v2/doctors', payload);
  return response.data;
};

export const deleteProfessional = async (id) => {
  const response = await api.delete(`/api/v2/doctors/${id}`);
  return response.data;
};
