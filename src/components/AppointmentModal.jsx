import React from "react";
import { formatDateLocal, extractDateForInput } from "../utils/date";
import { resolveSpecialtyKey } from "../utils/specialty";
import { SERVICE_TYPE_LABELS, mapBackendServiceType } from "../utils/serviceType";
import api from "../services/api";
import { searchPatients } from "../services/patientsRepo";
import { cancelPreAppointment } from "../services/preAppointmentsRepo";
import { sendWhatsAppMessage, generateConfirmationMessage, generateReminderMessage } from "../services/baileysApi";
import { getHolidays, holidaysToMap, isTimeBlockedByHoliday as checkHolidayBlock } from "../services/calendarService";

/**
 * 🔥 UNIFICAÇÃO: patient populado é a única fonte de verdade
 * Elimina dependência de patientInfo quebrado
 */
function resolvePatientData(appointment, foundPatient) {
    const pObj = (typeof appointment?.patient === 'object' && appointment?.patient !== null) ? appointment.patient : {};
    const preObj = appointment?.originalData?.patient || {};

    return {
        fullName: pObj.name ||
                  pObj.fullName ||
                  appointment?.patientName ||
                  preObj.name ||
                  preObj.fullName ||
                  (typeof appointment?.patient === 'string' ? appointment.patient : '') ||
                  '',
        phone: appointment?.phone ||
               pObj.phone ||
               preObj.phone ||
               foundPatient?.phone ||
               '',
        birthDate: appointment?.birthDate ||
                   pObj.dateOfBirth ||
                   preObj.dateOfBirth ||
                   foundPatient?.dateOfBirth ||
                   '',
        email: appointment?.email ||
               pObj.email ||
               preObj.email ||
               foundPatient?.email ||
               '',
        responsible: appointment?.responsible ||
                     foundPatient?.guardianName ||
                     foundPatient?.responsible ||
                     '',
        patientId: pObj._id ||
                   appointment?.patientId ||
                   appointment?.originalData?.patientId ||
                   (typeof appointment?.patient === 'string' ? appointment.patient : '') ||
                   ''
    };
}

export default function AppointmentModal({ appointment, professionals, patients, appointments, onSave, onConfirmPre, onClose, onReloadPatients, authError }) {
    // 🎯 Estado inicial LIMPO — sempre começa como novo pré-agendamento Fono
    // O useEffect principal abaixo sobrescreve quando estiver editando um existente
    const [formData, setFormData] = React.useState({
        patient: "",
        phone: "",
        birthDate: "",
        email: "",
        responsible: "",
        patientId: "",
        date: "",
        time: "",
        professional: "",
        professionalName: "",
        professionalId: "",
        specialty: "fonoaudiologia",
        specialtyKey: "fonoaudiologia",
        operationalStatus: "pre_agendado",
        status: "",
        observations: "",
        createdAt: null,
        paymentStatus: "pending",
        billingType: "particular",
        insuranceProvider: "",
        insuranceValue: 0,
        authorizationCode: "",
        package: null,
        crm: {
            serviceType: "individual_session",
            sessionType: "fonoaudiologia",
            paymentMethod: "pix",
            paymentAmount: 0,
            usePackage: false,
        },
        visualFlag: "",
        metadata: null,
    });

    // 🆕 Estado para feriados da API
    const [holidays, setHolidays] = React.useState({});
    const [currentYear, setCurrentYear] = React.useState(new Date().getFullYear());

    // 🆕 Busca feriados da API quando o ano muda
    React.useEffect(() => {
        const fetchHolidays = async () => {
            try {
                const holidaysList = await getHolidays(currentYear);
                const holidaysMap = holidaysToMap(holidaysList);
                setHolidays(holidaysMap);
            } catch (error) {
                console.error('[AppointmentModal] Erro ao buscar feriados:', error);
            }
        };
        fetchHolidays();
    }, [currentYear]);

    // 🆕 Atualiza o ano quando a data do formulário mudar
    React.useEffect(() => {
        if (formData.date) {
            const year = parseInt(formData.date.split('-')[0], 10);
            if (year !== currentYear) {
                setCurrentYear(year);
            }
        }
    }, [formData.date]);

    // Monitora mudanças no operationalStatus
    React.useEffect(() => {
    }, [formData.operationalStatus]);

    React.useEffect(() => {
        const today = formatDateLocal(new Date());

        if (appointment) {
            // 🔧 UNIFICAÇÃO: Busca ID do paciente para encontrar na lista
            const pObj = (typeof appointment.patient === 'object' && appointment.patient !== null)
                ? appointment.patient
                : {};
            const prePatientId = appointment.originalData?.patientId || "";
            const patientStringId = typeof appointment.patient === 'string' ? appointment.patient : '';
            const foundPatientId = pObj._id || appointment.patientId || prePatientId || patientStringId || "";
            
            const foundPatient = foundPatientId ? (patients || []).find(p => p._id === foundPatientId) : null;

            // 🔧 UNIFICAÇÃO: Extrai dados do paciente de forma consistente
            const patientData = resolvePatientData(appointment, foundPatient);

            // Extract professional data
            const dObj = (typeof appointment.doctor === 'object' && appointment.doctor !== null)
                ? appointment.doctor
                : {};
            
            // 🆕 Resolve professionalId quando doctor vem como string (não populado) — caso V2
            let resolvedProfId = dObj._id || appointment.professionalId || "";
            let resolvedProfName = dObj.fullName || appointment.professional || appointment.professionalName || "";
            
            if (!resolvedProfName && typeof appointment.doctor === 'string') {
                const matchedProf = (professionals || []).find(p => String(p.id) === String(appointment.doctor) || String(p._id) === String(appointment.doctor));
                if (matchedProf) {
                    resolvedProfId = matchedProf.id || matchedProf._id;
                    resolvedProfName = matchedProf.fullName;
                }
            }

            const formDataToSet = {
                // Dados do paciente - UNIFICADO
                patient: patientData.fullName,
                patientName: patientData.fullName,
                phone: patientData.phone,
                birthDate: extractDateForInput(patientData.birthDate) || "",
                email: patientData.email,
                responsible: patientData.responsible,
                patientId: patientData.patientId,

                // Dados do agendamento (date/time para agendamentos, preferredDate/preferredTime para pré-agendamentos)
                date: extractDateForInput(appointment.date) || 
                    extractDateForInput(appointment.preferredDate) || 
                    extractDateForInput(appointment.originalData?.preferredDate) || 
                    today,
                time: appointment.time || 
                    appointment.preferredTime || 
                    appointment.originalData?.preferredTime || 
                    "08:00",
                professional: resolvedProfName || "",
                professionalName: resolvedProfName || "",  // alias para o backend
                professionalId: resolvedProfId || "",
                specialty: resolveSpecialtyKey(appointment) || "fonoaudiologia",
                specialtyKey: resolveSpecialtyKey(appointment) || "fonoaudiologia",
                operationalStatus: appointment.operationalStatus || "scheduled",
                status: appointment.status || "",
                observations: appointment.observations || "",
                createdAt: appointment.createdAt || null,

                // Dados de pagamento/faturamento
                paymentStatus: appointment.paymentStatus || "pending",
                billingType: appointment.billingType || "particular",
                insuranceProvider: appointment.insuranceProvider || "",
                insuranceValue: appointment.insuranceValue || 0,
                authorizationCode: appointment.authorizationCode || "",
                package: appointment.package || null,

                // Dados do CRM - Backend retorna em campos DIRETOS (não dentro de objeto crm)
                // Mapeia: serviceType → crm.serviceType, sessionValue → crm.paymentAmount, etc
                crm: {
                    serviceType: appointment.crm?.serviceType ||
                        mapBackendServiceType(appointment.serviceType, !!appointment.package),
                    sessionType: resolveSpecialtyKey(appointment) || appointment.crm?.sessionType,
                    paymentMethod: appointment.crm?.paymentMethod ||
                        appointment.paymentMethod || "pix",
                    paymentAmount: Number(
                        appointment.crm?.paymentAmount ||
                        appointment.sessionValue ||
                        appointment.suggestedValue ||
                        appointment.package?.sessionValue ||
                        0
                    ),
                    usePackage: !!appointment.crm?.usePackage ||
                        !!appointment.package ||
                        appointment.serviceType === 'session',
                },

                // Metadados extras
                visualFlag: appointment.visualFlag || "",
                metadata: appointment.metadata || null,
            };
            setFormData(formDataToSet);
        } else {
            setFormData({
                patient: "",
                phone: "",
                birthDate: "",
                email: "",
                responsible: "",
                patientId: "",
                date: today,
                time: "08:00",
                professional: "",
                professionalId: "",
                specialty: "fonoaudiologia",
                specialtyKey: "fonoaudiologia",
                operationalStatus: "pre_agendado",
                status: "",
                observations: "",
                createdAt: null,
                paymentStatus: "pending",
                billingType: "particular",
                insuranceProvider: "",
                insuranceValue: 0,
                authorizationCode: "",
                package: null,
                crm: {
                    serviceType: "individual_session",
                    sessionType: resolveSpecialtyKey("Fonoaudiologia"),
                    paymentMethod: appointment?.crm?.paymentMethod || "pix",
                    paymentAmount: 0,
                    usePackage: false,
                },
                visualFlag: "",
                metadata: null,
            });
        }
    }, [appointment]);

    // Quando patients carregar ou appointment mudar, busca dados do paciente
    React.useEffect(() => {
        
        // Tenta pegar patientId de várias fontes
        // appointment.patient pode ser string ID (não populado) ou objeto
        const pid = formData.patientId ||
                    appointment?.patientId ||
                    appointment?.patient?._id ||
                    (typeof appointment?.patient === 'string' ? appointment.patient : '') ||
                    appointment?.originalData?.patientId;
        
        
        if (!pid) {
            return;
        }
        
        if (!patients || patients.length === 0) {
            return;
        }
        
        if (formData.birthDate && formData.birthDate !== "") {
            return;
        }
        
        const patientFromList = patients.find(p => p._id === pid);
        if (!patientFromList) {
            return;
        }
        
        
        if (!patientFromList.dateOfBirth) {
            return;
        }
        
        
        setFormData(prev => ({
            ...prev,
            birthDate: extractDateForInput(patientFromList.dateOfBirth),
            phone: prev.phone || patientFromList.phone || "",
            email: prev.email || patientFromList.email || "",
            responsible: prev.responsible || patientFromList.guardianName || patientFromList.responsible || ""
        }));
    }, [formData.patientId, patients, appointment]);

    // Estado para loading de detalhes (busca da API se necessário)
    const [isLoadingDetails, setIsLoadingDetails] = React.useState(false);
    const fetchedDetailsForId = React.useRef(null);
    const hasInteracted = React.useRef(false);

    // Busca detalhes completos quando abrir o modal de edição
    React.useEffect(() => {
        const id = appointment?.id;
        // NÃO busca se for pré-agendamento da agenda externa (ainda não existe como agendamento real)
        const isPreAgendamento = appointment?.operationalStatus === 'pre_agendado';

        // Evita buscar o mesmo ID duas vezes
        if (!id || id.startsWith('ext_') || isPreAgendamento || fetchedDetailsForId.current === id) {
            return;
        }

        fetchedDetailsForId.current = id;

        const fetchDetailsIfNeeded = async () => {
            setIsLoadingDetails(true);
            try {
                const response = await api.get(`/api/v2/appointments/${id}`);
                const payload = response.data.data || response.data;
                const data = payload.appointment || payload;

                // Só atualiza se o usuário ainda não interagiu com o formulário
                if (hasInteracted.current) return;

                // Atualiza com os dados recebidos da API
                setFormData(prev => {
                    return {
                        ...prev,
                        // Dados do pacote se existir
                        package: data.package || prev.package,
                        // Dados de faturamento
                        paymentStatus: data.paymentStatus || prev.paymentStatus,
                        billingType: data.billingType || prev.billingType,
                        insuranceProvider: data.insuranceProvider || prev.insuranceProvider,
                        insuranceValue: data.insuranceValue ?? prev.insuranceValue,
                        authorizationCode: data.authorizationCode || prev.authorizationCode,
                        // Dados CRM
                        crm: {
                            ...prev.crm,
                            serviceType: data.crm?.serviceType ||
                                mapBackendServiceType(data.serviceType, !!data.package || !!prev.package),
                            sessionType: prev.specialtyKey || resolveSpecialtyKey(prev.specialty),
                            paymentMethod: data.paymentMethod || prev.crm.paymentMethod,
                            paymentAmount: Number(
                                data.crm?.paymentAmount ||
                                data.sessionValue ||
                                data.suggestedValue ||
                                data.package?.sessionValue ||
                                prev.crm.paymentAmount ||
                                0
                            ),
                            usePackage: data.serviceType === 'session' || data.serviceType === 'package_session' || !!data.package,
                        }
                    };
                });
            } catch (error) {
                console.error("❌ [AppointmentModal] Erro ao buscar detalhes:", error);
            } finally {
                setIsLoadingDetails(false);
            }
        };

        fetchDetailsIfNeeded();
    }, [appointment?.id, appointment?.operationalStatus]);

    const [isLoading, setIsLoading] = React.useState(false);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [filteredPatients, setFilteredPatients] = React.useState([]);
    const [isSearching, setIsSearching] = React.useState(false);

    // Estado para controlar se é paciente novo ou existente
    const [isNewPatient, setIsNewPatient] = React.useState(() => {
        const isPre = appointment?.operationalStatus === 'pre_agendado';
        const hasPatientId = appointment?.patientId ||
            appointment?.originalData?.patientId ||
            (typeof appointment?.patient === 'object' && appointment?.patient?._id);

        if (hasPatientId) return false;

        // Pré-agendamento externo: chegou com nome pré-preenchido mas sem ID → novo paciente
        const prefilledName = (typeof appointment?.patient === 'string' && appointment.patient.trim()) ||
            appointment?.patientName?.trim() ||
            appointment?.originalData?.patientName?.trim();
        if (isPre && prefilledName) return true;

        // Novo pré-agendamento manual ou novo agendamento: começa no modo busca
        return false;
    });

    // Sincroniza isNewPatient quando formData.patientId muda (ex: ao carregar pré-agendamento)
    React.useEffect(() => {
        if (formData.patientId && isNewPatient) {
            setIsNewPatient(false);
        }
    }, [formData.patientId]);

    // Busca no backend com debounce de 300ms (igual ao CRM)
    React.useEffect(() => {
        const term = formData.patient?.trim();

        if (!term || term.length < 2 || formData.patientId || isNewPatient) {
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await searchPatients(term);
                setFilteredPatients(results);
                setShowSuggestions(true);
            } catch (err) {
                console.error('[AppointmentModal] Erro ao buscar pacientes:', err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [formData.patient, formData.patientId, isNewPatient]);

    const handlePatientChange = (value) => {
        hasInteracted.current = true;
        setFormData(prev => ({
            ...prev,
            patient: value,
            // Limpa o patientId quando o usuário está digitando manualmente
            patientId: ""
        }));

        if (value.length > 1) {
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
            setFilteredPatients([]);
        }
    };

    const selectPatient = async (p) => {
        setShowSuggestions(false);
        setFormData(prev => ({
            ...prev,
            patient: p.fullName,
            patientId: p._id,
            phone: p.phone || prev.phone,
            birthDate: p.dateOfBirth ? p.dateOfBirth.split('T')[0] : prev.birthDate,
            email: p.email || prev.email,
        }));
        try {
            const res = await api.get('/api/v2/appointments', { params: { patientId: p._id, limit: 4 } });
            const appts = res.data?.data?.appointments || [];
            const sorted = [...appts].sort((a, b) => new Date(b.date) - new Date(a.date));
            const responsible = sorted.find(a => a.responsible?.trim())?.responsible?.trim()
                || sorted.find(a => a.patientInfo?.responsible?.trim())?.patientInfo?.responsible?.trim()
                || '';
            if (responsible) setFormData(prev => ({ ...prev, responsible }));
        } catch (e) {
            console.error('[selectPatient] erro:', e);
        }
    };

    // Auto-seleciona paciente se o usuário digitou o nome completo e saiu do campo
    const handlePatientBlur = (currentValue) => {
        // Pequeno delay para permitir que o clique na sugestão seja processado primeiro
        setTimeout(() => {
            setShowSuggestions(false);

            const searchValue = (currentValue || formData.patient || "").trim();
            if (!searchValue || formData.patientId) return;

            const exactMatch = (patients || []).find(p =>
                p.fullName.toLowerCase().trim() === searchValue.toLowerCase()
            );
            if (exactMatch) {
                selectPatient(exactMatch);
                return;
            }

            // Fallback: se só há 1 sugestão filtrada, auto-seleciona também
            if (filteredPatients.length === 1) {
                selectPatient(filteredPatients[0]);
            }
        }, 200);
    };

    const handleChange = (e) => {
        hasInteracted.current = true;
        const { name, value, type, checked } = e.target;

        if (name === "specialty") {
            const newKey = resolveSpecialtyKey(value);
            // 🧠 Regra contextual: especialidades médicas defaultam para 'consultation'
            const isMedicalSpecialty = newKey === 'neuroped' || newKey === 'pediatria';
            setFormData((prev) => {
                const nextServiceType = isMedicalSpecialty ? 'consultation' : (prev.crm?.serviceType || 'individual_session');
                return {
                    ...prev,
                    specialty: value,
                    specialtyKey: newKey,
                    crm: {
                        ...prev.crm,
                        sessionType: newKey,
                        serviceType: nextServiceType,
                    },
                };
            });
            return;
        }

        if (name === "professional") {
            const selectedProf = (professionals || []).find(p => p.fullName === value);
            setFormData((prev) => ({
                ...prev,
                professional: value,
                professionalName: value,
                professionalId: selectedProf?.id || selectedProf?._id || "",
            }));
            return;
        }

        if (name.startsWith("crm.")) {
            const key = name.split(".")[1];
            setFormData((prev) => ({
                ...prev,
                crm: {
                    ...prev.crm,
                    [key]:
                        type === "checkbox"
                            ? checked
                            : key === "paymentAmount"
                                ? Number(value || 0)
                                : value,
                },
            }));
            return;
        }

        // Campos numéricos que precisam ser convertidos
        const numericFields = ["insuranceValue"];

        setFormData((prev) => {
            const newValue = numericFields.includes(name) ? Number(value || 0) : value;
            return { ...prev, [name]: newValue };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isLoading) return;

        // Agendamento de pacote: bloqueia edição nesta tela
        if (isPackagePreAgendado) {
            alert('Este agendamento pertence a um pacote de sessões e deve ser gerenciado pelo CRM.\n\nAcesse o CRM → paciente → pacote para editar ou usar esta sessão.');
            return;
        }

        // Se for pré-agendamento EXISTENTE (com id), redireciona para confirmação
        if (isPreExisting) {
            await handleConfirmPre();
            return;
        }

        setIsLoading(true);

        try {

            // 🆕 Validação: verifica se é feriado
            const holidayCheck = checkHolidayBlock(formData.date, formData.time, holidays);
            if (holidayCheck?.blocked) {
                const message = holidayCheck.note 
                    ? `🗓️ ${holidayCheck.name} (${holidayCheck.note})\n\nNão é possível agendar neste horário.`
                    : `🗓️ ${holidayCheck.name}\n\nNão é possível agendar em feriado.`;
                alert(message);
                setIsLoading(false);
                return;
            }

            // 🛡️ Se não tem patientId mas tem nome digitado, automaticamente cria como novo paciente
            const effectiveIsNewPatient = isNewPatient || (!formData.patientId && !!formData.patient?.trim());
            
            if (!effectiveIsNewPatient && !formData.patientId) {
                console.error("❌ [AppointmentModal] ERRO: Tentou salvar paciente existente sem patientId!");
                alert("Por favor, selecione um paciente existente da lista ou marque 'Criando novo paciente'");
                setIsLoading(false);
                return;
            }

            // Validação: telefone obrigatório com DDD (mínimo 10 dígitos)
            const phoneDigits = (formData.phone || '').replace(/\D/g, '');
            if (phoneDigits.length < 10) {
                alert("Telefone obrigatório com DDD (ex: 62981665539)");
                setIsLoading(false);
                return;
            }

            // Alerta quando valor é 0 mas status indica pagamento (pode ser dados não carregados do backend)
            const isEditing = !!appointment?.id;
            const valorZerado = formData.crm.paymentAmount === 0 || formData.crm.paymentAmount === '';
            const statusIndicaPagamento = ['paid', 'pending_receipt'].includes(formData.paymentStatus);

            if (isEditing && valorZerado && statusIndicaPagamento && !formData.package) {
                const confirmar = confirm(
                    "⚠️ ATENÇÃO!\n\n" +
                    "O valor da sessão está zerado (R$ 0), mas o status de pagamento é '" +
                    (formData.paymentStatus === 'paid' ? 'Pago' : 'Aguardando Recibo') +
                    "'.\n\n" +
                    "Isso pode significar que os dados não foram carregados corretamente do banco de dados.\n\n" +
                    "Se você continuar, o valor no banco será sobrescrito para ZERO (R$ 0).\n\n" +
                    "Deseja continuar mesmo assim?"
                );
                if (!confirmar) {
                    setIsLoading(false);
                    return;
                }
            }

            // Montar payload completo com todos os campos
            const dataToSave = {
                // Dados do paciente
                patientName: formData.patient,
                patientId: effectiveIsNewPatient ? null : formData.patientId,  // Só envia ID se for existente
                isNewPatient: effectiveIsNewPatient,  // Flag para o backend saber
                phone: formData.phone,
                birthDate: formData.birthDate,
                email: formData.email,
                responsible: formData.responsible,

                // Dados do agendamento
                serviceType: formData.crm?.serviceType || 'individual_session',
                date: formData.date,
                time: formData.time,
                professional: formData.professional,
                professionalName: formData.professional,
                professionalId: formData.professionalId,
                specialty: formData.specialty,
                specialtyKey: formData.specialtyKey,
                operationalStatus: formData.operationalStatus,
                observations: formData.observations,


                // Dados de pagamento/faturamento
                paymentStatus: formData.paymentStatus,
                billingType: formData.billingType,
                insuranceProvider: formData.insuranceProvider,
                insuranceValue: Number(formData.insuranceValue || 0),
                authorizationCode: formData.authorizationCode,
                package: formData.package,

                // 🩹 SEMPRE envia sessionValue = paymentAmount do CRM
                // O backend usa sessionValue como fonte de verdade do valor
                sessionValue: Number(formData.crm?.paymentAmount ?? formData.paymentAmount ?? 0),
                paymentMethod: formData.crm?.paymentMethod || formData.paymentMethod,
                paymentAmount: Number(formData.crm?.paymentAmount ?? formData.paymentAmount ?? 0),

                // Dados CRM
                crm: formData.crm,

                // Sessão Conjunta: permite mesmo profissional em dois slots simultâneos
                isJointSession: formData.crm?.serviceType === 'joint_session',

                // ID se estiver editando
                ...(appointment?.id ? { id: appointment.id } : {})
            };

            await onSave(dataToSave);
            // Só fecha o modal se deu sucesso (não throwou erro)
            onClose();
        } catch (error) {
            console.error("Erro ao salvar:", error);
            // Em caso de erro, mantém o modal aberto para o usuário corrigir
        } finally {
            setIsLoading(false);
        }
    };


    // isPre = pré-agendamentos (operationalStatus === 'pre_agendado')
    const isPre = appointment?.operationalStatus === 'pre_agendado';
    const isEdit = !!appointment?.id;
    const isPreExisting = isPre && isEdit;
    const isPreNew = isPre && !isEdit;
    const source = appointment?.source || appointment?.metadata?.origin?.source || appointment?.originalData?.source;
    // Agendamento de pacote: bloqueado nesta tela, deve ser gerenciado pelo CRM
    const isPackagePreAgendado = isPre && isEdit && !!(appointment?.package || formData.package);

    // Handler para confirmar pré-agendamento com loading
    const handleConfirmPre = async () => {
        if (!onConfirmPre) {
            console.error("❌ [handleConfirmPre] onConfirmPre não está definido");
            return;
        }

        // Se o status foi alterado para cancelado, cancela em vez de confirmar
        if (formData.operationalStatus === 'canceled' || formData.operationalStatus === 'cancelado') {
            setIsLoading(true);
            try {
                await cancelPreAppointment(appointment.id);
                onClose();
            } catch (err) {
                alert("Erro ao cancelar: " + (err.response?.data?.error || err.message));
            } finally {
                setIsLoading(false);
            }
            return;
        }

        
        try {
            // Se não tem patientId mas temos patients carregados, tenta buscar
            if (!formData.patientId && patients && patients.length > 0) {
                const foundByName = patients.find(p => 
                    p.fullName && p.fullName.toLowerCase().trim() === formData.patient?.toLowerCase?.().trim()
                );
                if (foundByName) {
                    const updatedFormData = { 
                        ...formData, 
                        appointmentId: appointment?.id || appointment?._id || null,
                        patientId: foundByName._id,
                        isNewPatient: false 
                    };
                    setFormData(prev => ({
                        ...prev,
                        patientId: foundByName._id
                    }));
                    
                    setIsLoading(true);
                    try {
                        await onConfirmPre(updatedFormData);
                    } finally {
                        setIsLoading(false);
                    }
                    return;
                }
            }
            
            // Determina se é novo paciente (mesma lógica do handleSubmit)
            const effectiveIsNewPatient = isNewPatient || (!formData.patientId && !!formData.patient?.trim());
            const dataToSend = { 
                ...formData, 
                appointmentId: appointment?.id || appointment?._id || null,
                isNewPatient: effectiveIsNewPatient,
                patientName: formData.patient || formData.patientName || ""
            };
            
            setIsLoading(true);
            try {
                await onConfirmPre(dataToSend);
            } finally {
                setIsLoading(false);
            }
        } catch (err) {
            console.error("❌ [handleConfirmPre] Erro inesperado:", err);
            alert("Erro inesperado ao confirmar: " + (err.message || "Verifique o console"));
            setIsLoading(false);
        }
    };

    // Se for pré-agendamento, mapeamos de preferredDate/Time
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative ${isLoading ? "opacity-80 pointer-events-none" : ""}`}>
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            {isPreExisting ? "Confirmar Pré-Agendamento" : isPreNew ? "Novo Pré-Agendamento" : isEdit ? "Editar Agendamento" : "Novo Agendamento"}
                        </h3>
                        {source && (
                            <p className="text-xs text-indigo-600 font-medium mt-0.5">
                                Origem: <span className="uppercase">{source}</span>
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                {/* Loading details */}
                {isLoadingDetails && (
                    <div className="mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                        <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        <span className="text-sm text-blue-800">Carregando dados completos do agendamento...</span>
                    </div>
                )}

                {/* Aviso de dados zerados */}
                {isEdit && !isLoadingDetails && formData.crm.paymentAmount === 0 && (
                    <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800 flex items-start gap-2">
                            <i className="fas fa-exclamation-triangle mt-0.5"></i>
                            <span>
                                <strong>Atenção:</strong> Os dados financeiros (valor, tipo de sessão, forma de pagamento)
                                podem não ter sido carregados corretamente. Use "Recarregar do servidor" se necessário.
                            </span>
                        </p>
                    </div>
                )}



                <form onSubmit={handleSubmit} className="px-6 py-4">
                    {/* Banner: agendamento de pacote — somente leitura nesta tela */}
                    {isPackagePreAgendado && (
                        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
                            <span className="text-amber-500 text-lg leading-none">⚠️</span>
                            <div>
                                <p className="text-sm font-semibold text-amber-800">Agendamento de pacote — gerenciado pelo CRM</p>
                                <p className="text-xs text-amber-700 mt-0.5">Este horário está vinculado a um pacote de sessões. Para editar ou registrar o atendimento, acesse o <strong>CRM → paciente → pacote</strong>.</p>
                            </div>
                        </div>
                    )}
                    {/* Bloco: Dados do Paciente */}
                    <div className="bg-blue-50/30 rounded-lg p-4 border border-blue-100">
                        <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                            <i className="fas fa-user text-blue-600"></i> Identificação do Paciente
                        </h4>
                        <div className="space-y-4">
                            {isEdit ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Paciente <span className="text-red-500">(não alterável)</span>
                                    </label>
                                    <div className="p-3 bg-gray-100 border border-gray-300 rounded-lg flex items-center gap-3">
                                        <i className="fas fa-user-lock text-gray-500"></i>
                                        <span className="font-medium text-gray-700">{formData.patient}</span>
                                    </div>
                                    <p className="text-xs text-amber-600 mt-1">
                                        <i className="fas fa-exclamation-triangle mr-1"></i>
                                        Para trocar, cancele este agendamento e crie um novo.
                                    </p>
                                </div>
                            ) : isNewPatient ? (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                                            <i className="fas fa-user-plus"></i> Novo paciente
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsNewPatient(false);
                                                setFormData(prev => ({ ...prev, patient: "", patientId: "", phone: "", birthDate: "", email: "" }));
                                            }}
                                            className="text-gray-400 hover:text-gray-600 p-1"
                                        >
                                            <i className="fas fa-times text-sm"></i>
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        name="patient"
                                        value={formData.patient}
                                        onChange={(e) => setFormData(prev => ({ ...prev, patient: e.target.value }))}
                                        className="w-full p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium bg-white"
                                        placeholder="Nome completo *"
                                        required
                                        autoComplete="off"
                                        autoFocus
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Selecione o paciente *
                                        {formData.patientId && (
                                            <span className="ml-2 text-xs font-normal text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                                ✓ Selecionado
                                            </span>
                                        )}
                                    </label>
                                    {/* Input de busca */}
                                    <div className="relative mb-2">
                                        <input
                                            type="text"
                                            placeholder="Buscar paciente..."
                                            value={formData.patient || ""}
                                            onChange={(e) => handlePatientChange(e.target.value)}
                                            onBlur={(e) => handlePatientBlur(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 pr-10"
                                            required
                                        />
                                        {isSearching ? (
                                            <svg className="animate-spin h-4 w-4 text-teal-500 absolute right-3 top-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <i className="fas fa-search absolute right-3 top-3.5 text-gray-400"></i>
                                        )}
                                    </div>
                                    {/* Dropdown de sugestões */}
                                    {showSuggestions && (
                                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white mb-2 shadow-md">
                                            {filteredPatients.length === 0 ? (
                                                <div className="p-3 text-gray-500 text-sm text-center">
                                                    Nenhum paciente encontrado
                                                </div>
                                            ) : (
                                                filteredPatients.map((p) => (
                                                    <div
                                                        key={p._id}
                                                        className={`p-3 cursor-pointer border-b border-gray-100 last:border-0 hover:bg-teal-50 ${formData.patientId === p._id ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''}`}
                                                        onClick={() => selectPatient(p)}
                                                    >
                                                        <div className="font-semibold text-gray-800">{p.fullName}</div>
                                                        <div className="text-xs text-gray-500 flex justify-between mt-1">
                                                            <span>{p.phone || "Sem telefone"}</span>
                                                            {p.dateOfBirth && (
                                                                <span>{new Date(p.dateOfBirth).toLocaleDateString()}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                            <button
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    setIsNewPatient(true);
                                                    setShowSuggestions(false);
                                                }}
                                                className="w-full px-3 py-2.5 text-left text-sm text-blue-700 hover:bg-blue-50 border-t border-gray-200 flex items-center gap-2 font-medium"
                                            >
                                                <i className="fas fa-user-plus text-blue-600"></i>
                                                {formData.patient?.trim()
                                                    ? `Criar novo: "${formData.patient}"`
                                                    : "Criar novo paciente"}
                                            </button>
                                        </div>
                                    )}
                                    {/* Resumo do paciente selecionado */}
                                    {formData.patientId && (
                                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <p className="text-sm font-medium text-green-800">
                                                <i className="fas fa-user-check mr-2"></i>
                                                {formData.patient}
                                            </p>
                                            <p className="text-xs text-green-600 mt-1">
                                                Telefone: {formData.phone || "-"} |
                                                Nasc: {formData.birthDate ? new Date(formData.birthDate).toLocaleDateString() : "-"}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Seção: Contato e Responsável */}
                    <div className="bg-purple-50/30 rounded-lg p-4 border border-purple-100">
                        <h4 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-2">
                            <i className="fas fa-phone-alt text-purple-600"></i> Contato
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
                                <input
                                    type="text"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data de nascimento *</label>
                                <input
                                    type="date"
                                    name="birthDate"
                                    value={formData.birthDate}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="text"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Responsável</label>
                                <input
                                    type="text"
                                    name="responsible"
                                    value={formData.responsible}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 🆕 Seção: Confirmação WhatsApp (Baileys - envio direto) */}
                    {formData.phone && formData.patient && (
                        <div className="bg-emerald-50/50 rounded-lg p-4 border border-emerald-200">
                            <h4 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                                <i className="fab fa-whatsapp text-emerald-600"></i> Confirmação WhatsApp
                            </h4>
                            
                            <div className="space-y-3">
                                <p className="text-xs text-emerald-700">
                                    ⚡ Envia mensagem direto pelo WhatsApp (sem abrir navegador)
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                const message = generateConfirmationMessage({
                                                    ...formData,
                                                    fullName: formData.patient,
                                                    professional: formData.professional
                                                });
                                                await sendWhatsAppMessage(formData.phone, message);
                                                // Toast sucesso
                                                const toast = document.createElement('div');
                                                toast.className = 'fixed bottom-4 right-4 bg-emerald-500 text-white px-4 py-3 rounded-lg text-sm z-50 shadow-lg flex items-center gap-2';
                                                toast.innerHTML = '<i class="fab fa-whatsapp text-lg"></i> <div><strong>✅ Enviado com sucesso!</strong><br>Confirmação enviada ao paciente</div>';
                                                document.body.appendChild(toast);
                                                setTimeout(() => toast.remove(), 3000);
                                            } catch (err) {
                                                // Toast erro
                                                const toast = document.createElement('div');
                                                toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg text-sm z-50 shadow-lg flex items-center gap-2';
                                                toast.innerHTML = `<i class="fas fa-exclamation-circle text-lg"></i> <div><strong>Erro ao enviar</strong><br>${err.error || 'WhatsApp não conectado'}</div>`;
                                                document.body.appendChild(toast);
                                                setTimeout(() => toast.remove(), 5000);
                                            }
                                        }}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        <i className="fab fa-whatsapp"></i>
                                        1️⃣ Enviar Confirmação
                                    </button>
                                    
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                const message = generateReminderMessage({
                                                    ...formData,
                                                    fullName: formData.patient
                                                });
                                                await sendWhatsAppMessage(formData.phone, message);
                                                // Toast sucesso
                                                const toast = document.createElement('div');
                                                toast.className = 'fixed bottom-4 right-4 bg-amber-500 text-white px-4 py-3 rounded-lg text-sm z-50 shadow-lg flex items-center gap-2';
                                                toast.innerHTML = '<i class="fab fa-whatsapp text-lg"></i> <div><strong>🔔 Enviado com sucesso!</strong><br>Lembrete enviado ao paciente</div>';
                                                document.body.appendChild(toast);
                                                setTimeout(() => toast.remove(), 3000);
                                            } catch (err) {
                                                // Toast erro
                                                const toast = document.createElement('div');
                                                toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg text-sm z-50 shadow-lg flex items-center gap-2';
                                                toast.innerHTML = `<i class="fas fa-exclamation-circle text-lg"></i> <div><strong>Erro ao enviar</strong><br>${err.error || 'WhatsApp não conectado'}</div>`;
                                                document.body.appendChild(toast);
                                                setTimeout(() => toast.remove(), 5000);
                                            }
                                        }}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-sm font-medium rounded-lg transition-colors"
                                    >
                                        <i className="far fa-clock"></i>
                                        2️⃣ Enviar Lembrete
                                    </button>
                                </div>
                                
                                <p className="text-xs text-gray-500">
                                    ⚠️ <strong>Aviso:</strong> Volume baixo (20-100/dia) = risco mínimo de banimento
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Seção: Dados do Agendamento */}
                    <div className="bg-amber-50/30 rounded-lg p-4 border border-amber-100">
                        <h4 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                            <i className="fas fa-calendar-alt text-amber-600"></i> Data e Hora
                        </h4>
                        
                        {/* 🆕 Alerta de feriado */}
                        {(() => {
                            const holidayCheck = checkHolidayBlock(formData.date, formData.time, holidays);
                            if (!holidayCheck?.blocked) return null;
                            return (
                                <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                                    <i className="fas fa-calendar-times text-red-500"></i>
                                    <div className="text-sm">
                                        <p className="font-medium text-red-800">
                                            🗓️ {holidayCheck.name}
                                        </p>
                                        <p className="text-red-600">
                                            {holidayCheck.note 
                                                ? `${holidayCheck.note} - Não é possível agendar neste horário.`
                                                : 'Feriado nacional - Não é possível agendar.'}
                                        </p>
                                    </div>
                                </div>
                            );
                        })()}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Horário *</label>
                                <input
                                    type="time"
                                    name="time"
                                    value={formData.time}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Dica: use horários múltiplos de 40min (08:00, 08:40, 09:20… 18:40)
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Seção: Profissional e Especialidade */}
                    <div className="bg-emerald-50/30 rounded-lg p-4 border border-emerald-100">
                        <h4 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                            <i className="fas fa-user-md text-emerald-600"></i> Profissional
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Profissional *</label>
                                <select
                                    name="professional"
                                    value={formData.professional}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    required
                                >
                                    <option value="">Selecione um profissional</option>
                                    {(professionals || []).map((p, idx) => (
                                        <option key={idx} value={p.fullName}>
                                            {p.fullName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Especialidade *</label>
                                <select
                                    name="specialty"
                                    value={formData.specialty}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="fonoaudiologia">Fonoaudiologia</option>
                                    <option value="psicologia">Psicologia</option>
                                    <option value="terapia_ocupacional">Terapia Ocupacional</option>
                                    <option value="fisioterapia">Fisioterapia</option>
                                    <option value="pediatria">Pediatria</option>
                                    <option value="neuroped">Neuropediatria</option>
                                    <option value="psicomotricidade">Psicomotricidade</option>
                                    <option value="musicoterapia">Musicoterapia</option>
                                    <option value="psicopedagogia">Psicopedagogia</option>
                                    <option value="tongue_tie_test">Teste da Linguinha</option>
                                    <option value="neuropsych_evaluation">Avaliação Neuropsicológica</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Seção: Status */}
                    <div className="bg-rose-50/30 rounded-lg p-4 border border-rose-100">
                        <h4 className="text-sm font-semibold text-rose-800 mb-3 flex items-center gap-2">
                            <i className="fas fa-flag text-rose-600"></i> Status
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status Operacional *</label>
                                <select
                                    name="operationalStatus"
                                    value={formData.operationalStatus}
                                    onChange={(e) => { handleChange(e); }}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="scheduled">Agendado</option>
                                    <option value="pre_agendado">⭐ Pré-Agendado</option>
                                    <option value="completed">Concluído</option>
                                    <option value="canceled">Cancelado</option>
                                    <option value="missed">Faltou</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Seção: Faturamento */}
                    <div className="bg-indigo-50/30 rounded-lg p-4 border border-indigo-100">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
                                <i className="fas fa-dollar-sign text-indigo-600"></i> Faturamento
                            </h4>
                            {isEdit && appointment?.operationalStatus !== 'pre_agendado' && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!appointment?.id) return;
                                        setIsLoadingDetails(true);
                                        try {
                                            const response = await api.get(`/api/v2/appointments/${appointment.id}`);
                                            const payload = response.data.data || response.data;
                                            const data = payload.appointment || payload;
                                            setFormData(prev => ({
                                                ...prev,
                                                paymentStatus: data.paymentStatus || prev.paymentStatus,
                                                billingType: data.billingType || prev.billingType,
                                                insuranceProvider: data.insuranceProvider || prev.insuranceProvider,
                                                insuranceValue: data.insuranceValue ?? prev.insuranceValue,
                                                authorizationCode: data.authorizationCode || prev.authorizationCode,
                                                crm: {
                                                    serviceType: data.crm?.serviceType ||
                                                        mapBackendServiceType(data.serviceType, !!data.package || !!prev.package),
                                                    sessionType: prev.specialtyKey || resolveSpecialtyKey(prev.specialty),
                                                    paymentMethod: data.paymentMethod || prev.crm.paymentMethod,
                                                    paymentAmount: Number(
                                                        data.crm?.paymentAmount ||
                                                        data.sessionValue ||
                                                        data.suggestedValue ||
                                                        data.package?.sessionValue ||
                                                        prev.crm.paymentAmount ||
                                                        0
                                                    ),
                                                    usePackage: data.serviceType === 'session' || data.serviceType === 'package_session' || !!data.package,
                                                }
                                            }));
                                            alert("Dados recarregados do servidor!");
                                        } catch (error) {
                                            console.error("❌ Erro ao recarregar:", error);
                                            alert("Erro ao recarregar dados");
                                        } finally {
                                            setIsLoadingDetails(false);
                                        }
                                    }}
                                    disabled={isLoadingDetails}
                                    className="text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-600 px-2 py-1 rounded flex items-center gap-1"
                                >
                                    {isLoadingDetails ? (
                                        <><i className="fas fa-spinner fa-spin"></i> Carregando...</>
                                    ) : (
                                        <><i className="fas fa-sync-alt"></i> Recarregar do servidor</>
                                    )}
                                </button>
                            )}
                        </div>

                        {formData.crm.serviceType !== 'return' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Faturamento *</label>
                                <select
                                    name="billingType"
                                    value={formData.billingType}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    required
                                >
                                    <option value="particular">Particular</option>
                                    <option value="convenio">Convênio</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status do Pagamento *</label>
                                <select
                                    name="paymentStatus"
                                    value={formData.paymentStatus}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    required
                                >
                                    <option value="pending">Pendente</option>
                                    <option value="paid">Pago</option>
                                    <option value="pending_receipt">Aguardando Recibo</option>
                                    <option value="canceled">Cancelado</option>
                                </select>
                            </div>
                        </div>
                        )}

                        {formData.billingType === 'convenio' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Convênio</label>
                                    <input
                                        type="text"
                                        name="insuranceProvider"
                                        value={formData.insuranceProvider}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="Nome do convênio"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                                    <input
                                        type="number"
                                        name="insuranceValue"
                                        value={formData.insuranceValue}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        min="0"
                                        step="0.01"
                                        placeholder="0,00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cód. Autorização</label>
                                    <input
                                        type="text"
                                        name="authorizationCode"
                                        value={formData.authorizationCode}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        placeholder="Código da autorização"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Info do Pacote */}
                        {formData.package && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <h5 className="text-sm font-bold text-blue-800 mb-2 flex items-center">
                                    <i className="fas fa-box mr-1"></i> Pacote Ativo
                                </h5>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div><span className="text-blue-600">Valor da Sessão:</span> R$ {formData.package.sessionValue}</div>
                                    <div><span className="text-blue-600">Total de Sessões:</span> {formData.package.totalSessions}</div>
                                    <div><span className="text-blue-600">Status:</span> {formData.package.financialStatus}</div>
                                    <div><span className="text-blue-600">Total Pago:</span> R$ {formData.package.totalPaid}</div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {formData.crm.serviceType !== 'return' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento (CRM)</label>
                                <select
                                    name="crm.paymentMethod"
                                    value={formData.crm.paymentMethod}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="pix">Pix</option>
                                    <option value="dinheiro">Dinheiro</option>
                                    <option value="cartao_credito">Cartão Crédito</option>
                                    <option value="cartao_debito">Cartão Débito</option>
                                    <option value="transferencia_bancaria">Transferência</option>
                                    <option value="outro">Outro</option>
                                </select>
                            </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Serviço *</label>
                                <select
                                    value={formData.crm.serviceType || 'individual_session'}
                                    onChange={(e) => {
                                        hasInteracted.current = true;
                                        const value = e.target.value;
                                        setFormData(prev => ({
                                            ...prev,
                                            paymentStatus: value === 'return' || value === 'return' ? 'not_applicable' : (prev.paymentStatus === 'not_applicable' ? 'pending' : prev.paymentStatus),
                                            crm: {
                                                ...prev.crm,
                                                serviceType: value,
                                                // sessionType SEMPRE é a especialidade clínica
                                                sessionType: prev.specialtyKey || resolveSpecialtyKey(prev.specialty),
                                                usePackage: value === 'package_session' || value === 'session'
                                            }
                                        }));
                                    }}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    {Object.entries(SERVICE_TYPE_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            {formData.crm.serviceType === 'return' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor da Sessão (R$)</label>
                                    <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        Retorno não gera cobrança — valor não aplicável.
                                    </p>
                                </div>
                            ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Valor da Sessão (R$)
                                    {formData.paymentStatus === 'paid' && (
                                        <span className="ml-2 text-xs font-normal text-green-600 bg-green-100 px-2 py-0.5 rounded">
                                            Pago
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="number"
                                    name="crm.paymentAmount"
                                    value={formData.crm.paymentAmount}
                                    onChange={handleChange}
                                    disabled={formData.paymentStatus === 'paid' || !!formData.package}
                                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                                        formData.paymentStatus === 'paid' || !!formData.package
                                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300'
                                            : 'border-gray-300'
                                    }`}
                                    min="0"
                                    step="0.01"
                                    placeholder="0,00"
                                />
                                {!!formData.package && (
                                    <p className="text-xs text-amber-700 mt-1 font-medium">
                                        🔒 Sessão de pacote — valor controlado pelo pacote (R$ {formData.package?.sessionValue ?? formData.crm.paymentAmount}). Para alterar, acesse o CRM → paciente → pacote.
                                    </p>
                                )}
                                {!formData.package && formData.crm.paymentAmount === 0 && (formData.paymentStatus === 'paid' || formData.paymentStatus === 'pending_receipt') && (
                                    <p className="text-xs text-red-500 mt-1 font-semibold">
                                        <i className="fas fa-exclamation-circle mr-1"></i>
                                        Atenção: Valor zerado mas status é '{formData.paymentStatus}'. Verifique se o valor foi carregado corretamente do banco.
                                    </p>
                                )}
                            </div>
                            )}
                        </div>

                        {formData.crm.serviceType !== 'return' && (
                        <div className="flex items-center gap-2 mt-4">
                            <input
                                id="usePackage"
                                type="checkbox"
                                name="crm.usePackage"
                                checked={!!formData.crm.usePackage}
                                onChange={handleChange}
                                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                            />
                            <label htmlFor="usePackage" className="text-sm text-gray-700 font-medium">
                                Usar pacote (se houver)
                            </label>
                        </div>
                        )}
                    </div>

                    {/* Seção: Observações */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                        <textarea
                            name="observations"
                            value={formData.observations}
                            onChange={handleChange}
                            rows="3"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>

                    {/* debug opcional */}
                    <div className="text-xs text-gray-400">
                        specialtyKey: <span className="font-mono">{formData.specialtyKey}</span>
                    </div>

                    {/* Botões de ação */}
                    <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 sticky bottom-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                        >
                            Cancelar
                        </button>
                        
                        {isPreExisting ? (
                            // Pré-agendamento EXISTENTE: botão que confirma/converte
                            <button
                                type="button"
                                onClick={handleConfirmPre}
                                disabled={isLoading}
                                className={`px-5 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 ${isLoading
                                        ? "bg-gray-400 cursor-not-allowed text-white"
                                        : "bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                                    }`}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Processando...
                                    </>
                                ) : "✅ Confirmar Agendamento"}
                            </button>
                        ) : (
                            // Novo pré-agendamento, novo agendamento ou edição
                            <button
                                type="submit"
                                disabled={isLoading || isPackagePreAgendado}
                                className={`px-5 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 ${isLoading || isPackagePreAgendado
                                        ? "bg-gray-400 cursor-not-allowed text-white"
                                        : "bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                                    }`}
                            >
                                {isLoading && (
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                )}
                                {isLoading
                                    ? "Processando..."
                                    : isPreNew
                                        ? "⭐ Criar Pré-Agendamento"
                                        : isEdit
                                            ? "Atualizar Agendamento"
                                            : "Criar Agendamento"}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );

}
