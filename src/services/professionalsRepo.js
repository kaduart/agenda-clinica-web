
import api from "./api";

export const listenProfessionals = (onData) => {
  const fetchData = async () => {
    try {
      const response = await api.get('/api/doctors');
      // Retorna objetos completos para permitir uso do ID em buscas de slots
      const professionals = response.data
        .map(doc => ({
          id: doc._id,
          fullName: doc.fullName,
          name: doc.name || doc.fullName,
          specialty: doc.specialty
        }))
        .sort((a, b) => a.fullName.localeCompare(b.fullName));
      onData(professionals);
    } catch (error) {
      console.error("Erro ao buscar profissionais:", error);
      onData([]);
    }
  };

  fetchData();

  // Retorna função de "unsubscribe" síncrona
  return () => { };
};

export const addProfessional = async (name) => {
  console.warn("Adicionar profissional via frontend web desabilitado na migração.");
};

export const deleteProfessionalByName = async (name) => {
  console.warn("Remover profissional via frontend web desabilitado na migração.");
};
