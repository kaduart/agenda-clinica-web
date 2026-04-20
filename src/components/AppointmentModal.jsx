import React from "react";
import { formatDateLocal, extractDateForInput } from "../utils/date";
import { resolveSpecialtyKey } from "../utils/specialty";
import api from "../services/api";
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

export default function AppointmentModal({ appointment, professionals, patients, onSave, onConfirmPre, onClose, onReloadPatients, authError }) {
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
        specialty: appointment?.specialty || "Fonoaudiologia",
        specialtyKey: appointment?.specialtyKey || resolveSpecialtyKey(appointment?.specialty || "Fonoaudiologia"),
        operationalStatus: appointment?.operationalStatus || "pre_agendado",
        status: "",
        observations: "",
        createdAt: appointment?.createdAt || null,
        paymentStatus: "pending",
        billingType: "particular",
        insuranceProvider: "",
        insuranceValue: 0,
        authorizationCode: "",
        package: null,
        crm: {
            serviceType: appointment?.crm?.serviceType || "individual_session",
            sessionType: appointment?.crm?.sessionType || resolveSpecialtyKey(appointment),
            paymentMethod: appointment?.crm?.paymentMethod || "pix",
            paymentAmount: Number(appointment?.crm?.paymentAmount || appointment?.suggestedValue || 0),
            usePackage: !!appointment?.crm?.usePackage,
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
        console.log("👁️ [AppointmentModal] formData.operationalStatus AGORA É:", formData.operationalStatus);
    }, [formData.operationalStatus]);

    React.useEffect(() => {
        console.log("📝 [AppointmentModal] ========== useEffect PRINCIPAL ==========");
        console.log("📝 [AppointmentModal] appointment:", JSON.stringify(appointment, null, 2));
        console.log("📝 [AppointmentModal] patients disponíveis:", patients?.length || 0);
        const today = formatDateLocal(new Date());

        if (appointment) {
            // 🔧 UNIFICAÇÃO: Busca ID do paciente para encontrar na lista
            const pObj = (typeof appointment.patient === 'object' && appointment.patient !== null)
                ? appointment.patient
                : {};
            const prePatientId = appointment.originalData?.patientId || "";
            const patientStringId = typeof appointment.patient === 'string' ? appointment.patient : '';
            const foundPatientId = pObj._id || appointment.patientId || prePatientId || patientStringId || "";
            
            console.log("🔍 [AppointmentModal] Buscando paciente na lista:", { foundPatientId, patientsCount: patients?.length });
            const foundPatient = foundPatientId ? (patients || []).find(p => p._id === foundPatientId) : null;
            console.log("🔍 [AppointmentModal] Paciente encontrado na lista:", foundPatient ? "SIM" : "NÃO", foundPatient?.fullName);

            // 🔧 UNIFICAÇÃO: Extrai dados do paciente de forma consistente
            const patientData = resolvePatientData(appointment, foundPatient);
            console.log("👤 [AppointmentModal] Dados unificados do paciente:", patientData);

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
                specialty: appointment.specialty || "Fonoaudiologia",
                specialtyKey:
                    appointment.specialtyKey ||
                    resolveSpecialtyKey(appointment.specialty || "Fonoaudiologia"),
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
                        (appointment.serviceType === 'evaluation' ? 'individual_session' :
                            appointment.serviceType === 'session' ? 'package_session' :
                                appointment.package ? "package_session" : "individual_session"),
                    sessionType: appointment.crm?.sessionType || resolveSpecialtyKey(appointment),
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
            console.log("✅ [AppointmentModal] setFormData PRINCIPAL:", { 
                patientId: formDataToSet.patientId, 
                birthDate: formDataToSet.birthDate,
                phone: formDataToSet.phone 
            });
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
                specialty: "Fonoaudiologia",
                specialtyKey: resolveSpecialtyKey("Fonoaudiologia"),
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
    }, [appointment, professionals, patients]);

    // Quando patients carregar ou appointment mudar, busca dados do paciente
    React.useEffect(() => {
        console.log("🔄 [AppointmentModal] ========== useEffect PATIENTS ==========");
        
        // Tenta pegar patientId de várias fontes
        // appointment.patient pode ser string ID (não populado) ou objeto
        const pid = formData.patientId ||
                    appointment?.patientId ||
                    appointment?.patient?._id ||
                    (typeof appointment?.patient === 'string' ? appointment.patient : '') ||
                    appointment?.originalData?.patientId;
        
        console.log("🔍 [AppointmentModal] Verificando:", {
            formDataPatientId: formData.patientId,
            appointmentPatientId: appointment?.patientId,
            appointmentPatientObjId: appointment?.patient?._id,
            prePatientId: appointment?.originalData?.patientId,
            finalPid: pid,
            patientsCount: patients?.length,
            currentBirthDate: formData.birthDate
        });
        
        if (!pid) {
            console.log("⏳ [AppointmentModal] Sem patientId em nenhuma fonte");
            return;
        }
        
        if (!patients || patients.length === 0) {
            console.log("⏳ [AppointmentModal] Patients ainda não carregou");
            return;
        }
        
        if (formData.birthDate && formData.birthDate !== "") {
            console.log("✅ [AppointmentModal] Já tem data de nascimento:", formData.birthDate);
            return;
        }
        
        const patientFromList = patients.find(p => p._id === pid);
        if (!patientFromList) {
            console.log("❌ [AppointmentModal] Paciente não encontrado na lista:", pid);
            console.log("📋 [AppointmentModal] IDs disponíveis:", patients.slice(0, 5).map(p => p._id));
            return;
        }
        
        console.log("✅ [AppointmentModal] Paciente encontrado na lista:", patientFromList.fullName, "birthDate:", patientFromList.dateOfBirth);
        
        if (!patientFromList.dateOfBirth) {
            console.log("⚠️ [AppointmentModal] Paciente encontrado mas sem data de nascimento no cadastro");
            return;
        }
        
        console.log("🎯 [AppointmentModal] >>>>> Preenchendo data de nascimento:", patientFromList.dateOfBirth);
        
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

    // Busca detalhes completos quando abrir o modal de edição
    React.useEffect(() => {
        const fetchDetailsIfNeeded = async () => {
            // NÃO busca se for pré-agendamento da agenda externa (ainda não existe como agendamento real)
            const isPreAgendamento = appointment?.operationalStatus === 'pre_agendado';
            
            // Sempre busca dados atualizados da API para agendamentos existentes
            if (appointment?.id && !appointment.id.startsWith('ext_') && !isPreAgendamento) {
                console.log("🔍 [AppointmentModal] Buscando detalhes do agendamento no servidor...");
                setIsLoadingDetails(true);
                try {
                    const response = await api.get(`/api/v2/appointments/${appointment.id}`);
                    const data = response.data.data || response.data;

                    console.log("🔍 [AppointmentModal] Detalhes completos recebidos:", {
                        serviceType: data.serviceType,
                        sessionValue: data.sessionValue,
                        paymentMethod: data.paymentMethod,
                        package: data.package ? 'Sim' : 'Não',
                        paymentStatus: data.paymentStatus,
                        billingType: data.billingType
                    });

                    // Atualiza com os dados recebidos da API
                    setFormData(prev => {
                        console.log("🔍 [AppointmentModal] Atualizando dados do formulário:", {
                            sessionValue: data.sessionValue,
                            serviceType: data.serviceType,
                            paymentMethod: data.paymentMethod,
                            hasPackage: !!data.package
                        });
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
                                serviceType: data.serviceType === 'evaluation' ? 'individual_session' :
                                    data.serviceType === 'session' ? 'package_session' :
                                        prev.crm.serviceType,
                                sessionType: prev.specialtyKey || resolveSpecialtyKey(prev.specialty),
                                paymentMethod: data.paymentMethod || prev.crm.paymentMethod,
                                paymentAmount: Number(data.sessionValue ?? prev.crm.paymentAmount),
                                usePackage: data.serviceType === 'session' || !!data.package,
                            }
                        };
                    });
                } catch (error) {
                    console.error("❌ [AppointmentModal] Erro ao buscar detalhes:", error);
                } finally {
                    setIsLoadingDetails(false);
                }
            }
        };

        fetchDetailsIfNeeded();
    }, [appointment?.id]);

    const [isLoading, setIsLoading] = React.useState(false);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [filteredPatients, setFilteredPatients] = React.useState([]);

    // Estado para controlar se é paciente novo ou existente
    const [isNewPatient, setIsNewPatient] = React.useState(() => {
        // Detecta se é pré-agendamento da agenda externa
        const isPre = appointment?.operationalStatus === 'pre_agendado';

        // Se já tem patientId (direto ou em originalData para pré-agendamentos), é existente
        const hasPatientId = appointment?.patientId ||
            appointment?.originalData?.patientId ||
            (typeof appointment?.patient === 'object' && appointment?.patient?._id);
        const hasPatientName = appointment?.patientName || (typeof appointment?.patient === 'string' ? appointment?.patient : '');

        // Se tem ID, é paciente existente
        if (hasPatientId) return false;

        // Se é pré-agendamento e não tem patientId, força modo NOVO PACIENTE
        // (pois pré-agendamentos geralmente são de novos pacientes)
        if (isPre) return true;

        // Se está criando novo e não tem nada, assume novo por padrão
        if (!appointment?.id && !hasPatientName) return true;

        // Sem patientId → sempre novo paciente (será criado no submit)
        return true;
    });

    // Sincroniza isNewPatient quando formData.patientId muda (ex: ao carregar pré-agendamento)
    React.useEffect(() => {
        if (formData.patientId && isNewPatient) {
            console.log("[AppointmentModal] Auto-ajustando isNewPatient para false (patientId detectado)");
            setIsNewPatient(false);
        }
    }, [formData.patientId]);

    const handlePatientChange = (value) => {
        setFormData(prev => ({
            ...prev,
            patient: value,
            // Limpa o patientId quando o usuário está digitando manualmente
            patientId: ""
        }));

        if (value.length > 2) {
            const matches = (patients || []).filter(p =>
                p.fullName.toLowerCase().includes(value.toLowerCase())
            ).slice(0, 5);
            setFilteredPatients(matches);
            setShowSuggestions(matches.length > 0);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectPatient = (p) => {
        console.log("🎯 [AppointmentModal] Paciente SELECIONADO da lista:", {
            id: p._id,
            name: p.fullName,
            phone: p.phone,
            birthDate: p.dateOfBirth
        });
        setFormData(prev => ({
            ...prev,
            patient: p.fullName,
            patientId: p._id,  // Guarda o ID do paciente existente
            phone: p.phone || prev.phone,
            birthDate: p.dateOfBirth ? p.dateOfBirth.split('T')[0] : prev.birthDate,
            email: p.email || prev.email,
        }));
        setShowSuggestions(false);
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
                console.log("[AppointmentModal] Auto-selecionando paciente existente:", exactMatch.fullName);
                selectPatient(exactMatch);
                return;
            }

            // Fallback: se só há 1 sugestão filtrada, auto-seleciona também
            if (filteredPatients.length === 1) {
                console.log("[AppointmentModal] Auto-selecionando única sugestão:", filteredPatients[0].fullName);
                selectPatient(filteredPatients[0]);
            }
        }, 200);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        console.log("📝 [AppointmentModal] handleChange - name:", name, "value:", value, "type:", type);

        if (name === "operationalStatus") {
            console.log("🚨 [AppointmentModal] STATUS OPERACIONAL MUDANDO PARA:", value);
        }

        if (name === "specialty") {
            setFormData((prev) => ({
                ...prev,
                specialty: value,
                specialtyKey: resolveSpecialtyKey(value),
            }));
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
            console.log("📝 [AppointmentModal] handleChange - atualizando:", name, "=", newValue);
            return { ...prev, [name]: newValue };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isLoading) return;

        // Se for pré-agendamento existente, redireciona para confirmação
        if (appointment?.operationalStatus === 'pre_agendado' && appointment?.id) {
            console.log("🔄 [handleSubmit] Detectado pré-agendamento existente, redirecionando para handleConfirmPre");
            await handleConfirmPre();
            return;
        }

        setIsLoading(true);

        try {
            console.log("🚀 [AppointmentModal] SUBMIT iniciado");
            console.log("🚀 [AppointmentModal] formData.operationalStatus no SUBMIT:", formData.operationalStatus);
            console.log("🚀 [AppointmentModal] isNewPatient:", isNewPatient);
            console.log("🚀 [AppointmentModal] formData.patientId:", formData.patientId);
            console.log("🚀 [AppointmentModal] formData.patient:", formData.patient);
            console.log("🚀 [AppointmentModal] formData.crm:", formData.crm);
            console.log("🚀 [AppointmentModal] appointment?.id:", appointment?.id);

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

                // Dados CRM
                crm: formData.crm,

                // ID se estiver editando
                ...(appointment?.id ? { id: appointment.id } : {})
            };

            console.log("✅ [AppointmentModal] =========================================");
            console.log("✅ [AppointmentModal] ENVIANDO PARA onSave:");
            console.log("✅ [AppointmentModal] patientId:", dataToSave.patientId);
            console.log("✅ [AppointmentModal] effectiveIsNewPatient:", effectiveIsNewPatient, "| original:", isNewPatient);
            console.log("✅ [AppointmentModal] patientName:", dataToSave.patientName);
            console.log("✅ [AppointmentModal] Payload completo:", JSON.stringify(dataToSave, null, 2));
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
    const source = appointment?.source || appointment?.metadata?.origin?.source || appointment?.originalData?.source;

    // Handler para confirmar pré-agendamento com loading
    const handleConfirmPre = async () => {
        if (!onConfirmPre) {
            console.error("❌ [handleConfirmPre] onConfirmPre não está definido");
            return;
        }

        // Se o status foi alterado para cancelado, cancela em vez de confirmar
        if (formData.operationalStatus === 'canceled' || formData.operationalStatus === 'cancelado') {
            console.log("🚫 [handleConfirmPre] Status=canceled → chamando /cancelar");
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

        console.log("🚀 [AppointmentModal] handleConfirmPre - Iniciando...");
        console.log("🚀 [AppointmentModal] formData:", formData);
        console.log("🚀 [AppointmentModal] patientId:", formData.patientId);
        console.log("🚀 [AppointmentModal] birthDate:", formData.birthDate);
        
        try {
            // Se não tem patientId mas temos patients carregados, tenta buscar
            if (!formData.patientId && patients && patients.length > 0) {
                console.log("🔍 [AppointmentModal] Buscando paciente na lista pelo nome...");
                const foundByName = patients.find(p => 
                    p.fullName && p.fullName.toLowerCase().trim() === formData.patient?.toLowerCase?.().trim()
                );
                if (foundByName) {
                    console.log("✅ [AppointmentModal] Paciente encontrado na lista:", foundByName._id);
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
                console.log("⚠️ [AppointmentModal] Paciente NÃO encontrado na lista pelo nome");
            }
            
            // Determina se é novo paciente (mesma lógica do handleSubmit)
            const effectiveIsNewPatient = isNewPatient || (!formData.patientId && !!formData.patient?.trim());
            const dataToSend = { 
                ...formData, 
                appointmentId: appointment?.id || appointment?._id || null,
                isNewPatient: effectiveIsNewPatient,
                patientName: formData.patient || formData.patientName || ""
            };
            
            console.log("🚀 [AppointmentModal] Chamando onConfirmPre com:", dataToSend);
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
                            {isPre ? "Confirmar Pré-Agendamento" : isEdit ? "Editar Agendamento" : "Novo Agendamento"}
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
                    {/* Bloco: Dados do Paciente */}
                    <div className="bg-blue-50/30 rounded-lg p-4 border border-blue-100">
                        <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                            <i className="fas fa-user text-blue-600"></i> Identificação do Paciente
                        </h4>
                        <div className="space-y-4">
                            {/* Checkbox novo paciente (se não for edição) */}
                            {!isEdit && (
                                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200">
                                    <input
                                        id="isNewPatient"
                                        type="checkbox"
                                        checked={isNewPatient}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setIsNewPatient(checked);
                                            if (checked) {
                                                setFormData(prev => ({ ...prev, patientId: "", patient: "", phone: "", birthDate: "", email: "" }));
                                            } else {
                                                setFormData(prev => ({ ...prev, patientId: "", patient: "" }));
                                            }
                                        }}
                                        className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                                    />
                                    <label htmlFor="isNewPatient" className="text-sm font-medium text-gray-700 cursor-pointer">
                                        {isNewPatient ? "✨ Criando novo paciente" : "🔍 Selecionar paciente existente"}
                                    </label>
                                </div>
                            )}

                            {/* Bloco de paciente: conforme lógica existente */}
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
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nome do novo paciente *
                                    </label>
                                    <input
                                        type="text"
                                        name="patient"
                                        value={formData.patient}
                                        onChange={(e) => setFormData(prev => ({ ...prev, patient: e.target.value }))}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        required
                                        autoComplete="off"
                                        placeholder="Digite o nome completo..."
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
                                            onFocus={() => {
                                                setShowSuggestions(true);
                                                setFilteredPatients(patients.slice(0, 10));
                                            }}
                                            onBlur={(e) => handlePatientBlur(e.target.value)}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                            required
                                        />
                                        <i className="fas fa-search absolute right-3 top-3.5 text-gray-400"></i>
                                    </div>
                                    {/* Lista de sugestões */}
                                    {showSuggestions && (
                                        <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto bg-white mb-2">
                                            {filteredPatients.length === 0 ? (
                                                <div className="p-3 text-gray-500 text-sm text-center">
                                                    Nenhum paciente encontrado
                                                </div>
                                            ) : (
                                                filteredPatients.map((p) => (
                                                    <div
                                                        key={p._id}
                                                        className={`p-3 cursor-pointer border-b border-gray-100 last:border-0 hover:bg-teal-50 ${formData.patientId === p._id ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''
                                                            }`}
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
                                    onChange={(e) => { console.log("🚨 SELECT OPERACIONAL onChange:", e.target.value); handleChange(e); }}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="scheduled">Agendado</option>
                                    <option value="pre_agendado">⭐ Pré-Agendado</option>
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
                                            const data = response.data.data || response.data;
                                            setFormData(prev => ({
                                                ...prev,
                                                paymentStatus: data.paymentStatus || prev.paymentStatus,
                                                billingType: data.billingType || prev.billingType,
                                                insuranceProvider: data.insuranceProvider || prev.insuranceProvider,
                                                insuranceValue: data.insuranceValue ?? prev.insuranceValue,
                                                authorizationCode: data.authorizationCode || prev.authorizationCode,
                                                crm: {
                                                    serviceType: data.serviceType === 'evaluation' ? 'individual_session' :
                                                        data.serviceType === 'session' ? 'package_session' : prev.crm.serviceType,
                                                    sessionType: prev.specialtyKey || resolveSpecialtyKey(prev.specialty),
                                                    paymentMethod: data.paymentMethod || prev.crm.paymentMethod,
                                                    paymentAmount: Number(data.sessionValue ?? prev.crm.paymentAmount),
                                                    usePackage: data.serviceType === 'session' || !!data.package,
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Serviço *</label>
                                <select
                                    value={formData.crm.serviceType || 'individual_session'}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setFormData(prev => ({
                                            ...prev,
                                            crm: {
                                                ...prev.crm,
                                                serviceType: value,
                                                // sessionType SEMPRE é a especialidade clínica
                                                sessionType: prev.specialtyKey || resolveSpecialtyKey(prev.specialty),
                                                usePackage: value === 'package_session' || value === 'sessao'
                                            }
                                        }));
                                    }}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="individual_session">Avaliação</option>
                                    <option value="package_session">Sessão (Pacote)</option>
                                    <option value="sessao_avulsa">Sessão Avulsa</option>
                                    <option value="retorno">Retorno</option>
                                </select>
                            </div>
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
                                    disabled={formData.paymentStatus === 'paid'}
                                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${formData.paymentStatus === 'paid'
                                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-300'
                                            : 'border-gray-300'
                                        }`}
                                    min="0"
                                    step="0.01"
                                    placeholder="0,00"
                                />
                                {formData.package?.sessionValue && formData.crm.paymentAmount != formData.package.sessionValue && (
                                    <p className="text-xs text-amber-600 mt-1">
                                        <i className="fas fa-exclamation-triangle mr-1"></i>
                                        Valor diferente do pacote (R$ {formData.package.sessionValue})
                                    </p>
                                )}
                                {formData.crm.paymentAmount === 0 && (formData.paymentStatus === 'paid' || formData.paymentStatus === 'pending_receipt') && !formData.package && (
                                    <p className="text-xs text-red-500 mt-1 font-semibold">
                                        <i className="fas fa-exclamation-circle mr-1"></i>
                                        Atenção: Valor zerado mas status é '{formData.paymentStatus}'. Verifique se o valor foi carregado corretamente do banco.
                                    </p>
                                )}
                            </div>
                        </div>

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
                        
                        {isPre ? (
                            // Pré-agendamento: botão único que confirma (já envia dados atualizados)
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
                            // Botão normal para agendamentos
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`px-5 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 ${isLoading
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
