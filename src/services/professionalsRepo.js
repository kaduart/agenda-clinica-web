
import * as v2 from "../api/v2/agendaV2Client";

export const listenProfessionals = (onData) => {
  const fetchData = async () => {
    try {
      const response = await v2.getActiveDoctors();
      const doctors = (response?.data?.doctors || [])
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
  const response = await v2.createDoctor(payload);
  return response;
};

export const deleteProfessional = async (id) => {
  const response = await v2.deleteDoctor(id);
  return response;
};
