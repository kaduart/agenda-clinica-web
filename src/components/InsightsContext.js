import { createContext, useContext } from "react";

// Dados da inteligência comercial (histórico curto + índice por paciente + lista do dia)
export const InsightsContext = createContext({ index: null, history: [], dayList: [] });
export const useInsights = () => useContext(InsightsContext);
