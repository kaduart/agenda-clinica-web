import React from "react";
import { formatDateLocal, extractDateForInput } from "../utils/date";
import { resolveSpecialtyKey } from "../utils/specialty";

export default function AppointmentModal({ appointment, professionals, patients, onSave, onClose, onReloadPatients, authError }) {
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
        professionalId: "",
        specialty: appointment?.specialty || "Fonoaudiologia",
        specialtyKey: appointment?.specialtyKey || resolveSpecialtyKey(appointment?.specialty || "Fonoaudiologia"),
        operationalStatus: appointment?.operationalStatus || "scheduled",
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
            sessionType: appointment?.crm?.sessionType || "avaliacao",
            paymentMethod: appointment?.crm?.paymentMethod || "pix",
            paymentAmount: Number(appointment?.crm?.paymentAmount || 0),
            usePackage: !!appointment?.crm?.usePackage,
        },
        visualFlag: "",
        metadata: null,
    });

    React.useEffect(() => {
        console.log("📝 [AppointmentModal] useEffect - appointment:", JSON.stringify(appointment, null, 2));
        console.log("📝 [AppointmentModal] useEffect - appointment?.id:", appointment?.id);
        const today = formatDateLocal(new Date());

        if (appointment) {
            // Extract patient data carefully - patient pode ser objeto ou ID string
            const pObj = (typeof appointment.patient === 'object' && appointment.patient !== null) 
                ? appointment.patient 
                : {};
            
            // Tenta obter o nome de várias fontes possíveis
            const pName = pObj.fullName || 
                          appointment.patientName || 
                          (typeof appointment.patient === 'string' ? appointment.patient : '') ||
                          '';
            
            // Tenta obter o telefone de várias fontes possíveis
            const pPhone = appointment.phone || 
                           pObj.phone || 
                           appointment.patientPhone ||
                           '';
            
            // Para pré-agendamentos, os dados estão em originalData.patientInfo
            const prePatientInfo = appointment.originalData?.patientInfo || {};
            
            // Para pré-agendamentos, o patientId pode estar em originalData.patientId
            const prePatientId = appointment.originalData?.patientId || "";

            // Extract professional data
            const dObj = (typeof appointment.doctor === 'object' && appointment.doctor !== null) 
                ? appointment.doctor 
                : {};
            const profName = dObj.fullName || appointment.professional || appointment.professionalName;

            const formDataToSet = {
                // Dados do paciente
                patient: pName || "",
                patientName: pName || "",  // alias para o backend
                phone: pPhone || prePatientInfo.phone || "",
                birthDate: extractDateForInput(appointment.birthDate) || 
                           extractDateForInput(pObj.dateOfBirth) || 
                           extractDateForInput(prePatientInfo.birthDate) || 
                           "",
                email: appointment.email || pObj.email || prePatientInfo.email || "",
                responsible: appointment.responsible || "",
                patientId: pObj._id || appointment.patientId || prePatientId || "",
                
                // Dados do agendamento
                date: appointment.date || today,
                time: appointment.time || "08:00",
                professional: profName || (professionals?.[0]?.fullName || ""),
                professionalName: profName || (professionals?.[0]?.fullName || ""),  // alias para o backend
                professionalId: dObj._id || appointment.professionalId || "",
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
                
                // Dados do CRM
                crm: {
                    serviceType: appointment.crm?.serviceType || "individual_session",
                    sessionType: appointment.crm?.sessionType || "avaliacao",
                    paymentMethod: appointment.crm?.paymentMethod || "pix",
                    paymentAmount: Number(appointment.crm?.paymentAmount || 0),
                    usePackage: !!appointment.crm?.usePackage,
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
                professional: professionals?.[0]?.fullName || "",
                professionalId: "",
                specialty: "Fonoaudiologia",
                specialtyKey: resolveSpecialtyKey("Fonoaudiologia"),
                operationalStatus: "scheduled",
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
                    sessionType: "avaliacao",
                    paymentMethod: "pix",
                    paymentAmount: 0,
                    usePackage: false,
                },
                visualFlag: "",
                metadata: null,
            });
        }
    }, [appointment, professionals]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [filteredPatients, setFilteredPatients] = React.useState([]);
    
    // Estado para controlar se é paciente novo ou existente
    const [isNewPatient, setIsNewPatient] = React.useState(() => {
        // Se já tem patientId (direto ou em originalData para pré-agendamentos), é existente
        const hasPatientId = appointment?.patientId || 
                            appointment?.originalData?.patientId ||
                            (typeof appointment?.patient === 'object' && appointment?.patient?._id);
        const hasPatientName = appointment?.patientName || (typeof appointment?.patient === 'string' ? appointment?.patient : '');
        // Se tem ID ou está editando com nome preenchido, não é novo
        if (hasPatientId) return false;
        // Se está criando novo e não tem nada, assume novo por padrão
        if (!appointment?.id && !hasPatientName) return true;
        // Se tem nome mas não tem ID, pode ser novo
        return !hasPatientName;
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
    const handlePatientBlur = () => {
        // Pequeno delay para permitir que o clique na sugestão seja processado primeiro
        setTimeout(() => {
            setShowSuggestions(false);
            
            if (formData.patient && !formData.patientId) {
                const exactMatch = (patients || []).find(p => 
                    p.fullName.toLowerCase().trim() === formData.patient.toLowerCase().trim()
                );
                if (exactMatch) {
                    console.log("[AppointmentModal] Auto-selecionando paciente existente:", exactMatch.fullName);
                    setFormData(prev => ({
                        ...prev,
                        patient: exactMatch.fullName,
                        patientId: exactMatch._id,
                        phone: exactMatch.phone || prev.phone,
                        birthDate: exactMatch.dateOfBirth ? exactMatch.dateOfBirth.split('T')[0] : prev.birthDate,
                        email: exactMatch.email || prev.email,
                    }));
                }
            }
        }, 200);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name === "specialty") {
            setFormData((prev) => ({
                ...prev,
                specialty: value,
                specialtyKey: resolveSpecialtyKey(value),
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

        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isLoading) return;

        setIsLoading(true);

        try {
            console.log("🚀 [AppointmentModal] SUBMIT iniciado");
            console.log("🚀 [AppointmentModal] isNewPatient:", isNewPatient);
            console.log("🚀 [AppointmentModal] formData.patientId:", formData.patientId);
            console.log("🚀 [AppointmentModal] formData.patient:", formData.patient);

            // Validação: se não é novo paciente, precisa ter selecionado um da lista
            if (!isNewPatient && !formData.patientId) {
                console.error("❌ [AppointmentModal] ERRO: Tentou salvar paciente existente sem patientId!");
                alert("Por favor, selecione um paciente existente da lista ou marque 'Criando novo paciente'");
                setIsLoading(false);
                return;
            }

            // Montar payload completo com todos os campos
            const dataToSave = {
                // Dados do paciente
                patient: formData.patient,
                patientName: formData.patient,
                patientId: isNewPatient ? null : formData.patientId,  // Só envia ID se for existente
                isNewPatient: isNewPatient,  // Flag para o backend saber
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
                
                // Dados CRM
                crm: formData.crm,
                
                // ID se estiver editando
                ...(appointment?.id ? { id: appointment.id } : {})
            };
            
            console.log("✅ [AppointmentModal] =========================================");
            console.log("✅ [AppointmentModal] ENVIANDO PARA onSave:");
            console.log("✅ [AppointmentModal] patientId:", dataToSave.patientId);
            console.log("✅ [AppointmentModal] isNewPatient:", dataToSave.isNewPatient);
            console.log("✅ [AppointmentModal] patientName:", dataToSave.patientName);
            console.log("✅ [AppointmentModal] Payload completo:", JSON.stringify(dataToSave, null, 2));
            await onSave(dataToSave);
        } catch (error) {
            console.error("Erro ao salvar:", error);
        } finally {
            setIsLoading(false);
        }
    };


    const isPre = !!appointment?.__isPreAgendamento || appointment?.operationalStatus === 'pre_agendado';
    const isEdit = !!appointment?.id && !isPre;
    const source = appointment?.source || appointment?.metadata?.origin?.source || appointment?.originalData?.source;

    // Se for pré-agendamento, mapeamos de preferredDate/Time
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative ${isLoading ? "opacity-80 pointer-events-none" : ""}`}>

                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                                {isPre ? "Confirmar Pré-Agendamento" : isEdit ? "Editar Agendamento" : "Novo Agendamento"}
                            </h3>
                            {source && (
                                <p className="text-xs text-indigo-600 font-medium">
                                    Origem: <span className="uppercase">{source}</span>
                                </p>
                            )}
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <i className="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="px-6 py-4 space-y-4">
                        <div className="space-y-3">
                            {/* Checkbox para definir se é novo paciente */}
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <input
                                    id="isNewPatient"
                                    type="checkbox"
                                    checked={isNewPatient}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        console.log("☑️ [AppointmentModal] Checkbox 'Novo Paciente' alterado:", checked);
                                        setIsNewPatient(checked);
                                        if (checked) {
                                            // Limpa o patientId ao marcar como novo
                                            console.log("☑️ [AppointmentModal] Modo NOVO PACIENTE - Limpando patientId");
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                patientId: "",
                                                patient: "",
                                                phone: "",
                                                birthDate: "",
                                                email: ""
                                            }));
                                        } else {
                                            // Ao desmarcar, limpa para forçar seleção
                                            console.log("☑️ [AppointmentModal] Modo PACIENTE EXISTENTE - Aguardando seleção");
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                patientId: "",
                                                patient: ""
                                            }));
                                        }
                                    }}
                                    className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                                />
                                <label htmlFor="isNewPatient" className="text-sm font-semibold text-gray-700 cursor-pointer">
                                    {isNewPatient ? "✨ Criando novo paciente" : "🔍 Selecionar paciente existente"}
                                </label>
                            </div>

                            {/* Se for novo paciente: input livre */}
                            {isNewPatient ? (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
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
                                /* Se for existente: select com busca */
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Selecione o paciente *
                                        {formData.patientId && (
                                            <span className="ml-2 text-xs font-normal text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                                ✓ Selecionado
                                            </span>
                                        )}
                                    </label>
                                    
                                    {/* Verifica se tem erro de autenticação */}
                                    {authError ? (
                                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                                            <p className="text-red-600 text-sm font-medium">
                                                <i className="fas fa-lock mr-2"></i>
                                                Erro de autenticação
                                            </p>
                                            <p className="text-red-500 text-xs mt-1">
                                                Token inválido. Verifique o VITE_API_TOKEN no arquivo .env
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => onReloadPatients && onReloadPatients()}
                                                className="mt-2 text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded font-medium"
                                            >
                                                <i className="fas fa-sync-alt mr-1"></i>
                                                Tentar novamente
                                            </button>
                                        </div>
                                    ) : /* Verifica se tem pacientes carregados */
                                    (!patients || patients.length === 0) ? (
                                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                            <p className="text-amber-800 text-sm font-medium text-center">
                                                <i className="fas fa-exclamation-triangle mr-2"></i>
                                                Lista de pacientes não carregou (Erro de autenticação)
                                            </p>
                                            <p className="text-amber-600 text-xs mt-1 text-center">
                                                A rota /api/patients retornou 401. Use uma das opções:
                                            </p>
                                            
                                            {/* Opção 1: Criar novo paciente */}
                                            <div className="mt-3 p-3 bg-white rounded border border-amber-200">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="patientMode"
                                                        checked={isNewPatient}
                                                        onChange={() => {
                                                            console.log("☑️ [AppointmentModal] Modo NOVO PACIENTE selecionado (lista vazia)");
                                                            setIsNewPatient(true);
                                                            setFormData(prev => ({ 
                                                                ...prev, 
                                                                patientId: "",
                                                                patient: "",
                                                                phone: "",
                                                                birthDate: "",
                                                                email: ""
                                                            }));
                                                        }}
                                                        className="text-teal-600"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">🆕 Criar novo paciente</span>
                                                </label>
                                            </div>

                                            {/* Opção 2: Usar ID existente */}
                                            <div className="mt-2 p-3 bg-white rounded border border-amber-200">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="patientMode"
                                                        checked={!isNewPatient}
                                                        onChange={() => {
                                                            console.log("☑️ [AppointmentModal] Modo PACIENTE EXISTENTE selecionado (vai digitar ID)");
                                                            setIsNewPatient(false);
                                                            setFormData(prev => ({ 
                                                                ...prev, 
                                                                patientId: "",
                                                                patient: ""
                                                            }));
                                                        }}
                                                        className="text-teal-600"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">📝 Usar paciente existente (digite o ID)</span>
                                                </label>
                                            </div>

                                            {/* Campos baseado na seleção */}
                                            {isNewPatient ? (
                                                <div className="mt-3">
                                                    <input
                                                        type="text"
                                                        value={formData.patient}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, patient: e.target.value }))}
                                                        placeholder="Nome completo do novo paciente"
                                                        className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                                                        required
                                                    />
                                                </div>
                                            ) : (
                                                <div className="mt-3 space-y-2">
                                                    <input
                                                        type="text"
                                                        value={formData.patientId}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, patientId: e.target.value }))}
                                                        placeholder="Cole o ID do paciente (MongoDB ObjectId)"
                                                        className="w-full p-2 text-sm border border-gray-300 rounded font-mono text-xs focus:ring-2 focus:ring-teal-500"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={formData.patient}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, patient: e.target.value }))}
                                                        placeholder="Nome do paciente (para exibição)"
                                                        className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                                                    />
                                                    <p className="text-xs text-gray-500">
                                                        💡 O ID pode ser encontrado no CRM ou na URL do perfil do paciente
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {/* Input de busca para filtrar */}
                                            <div className="relative mb-2">
                                                <input
                                                    type="text"
                                                    placeholder="Buscar paciente..."
                                                    value={showSuggestions ? undefined : (formData.patient || "")}
                                                    onChange={(e) => handlePatientChange(e.target.value)}
                                                    onFocus={() => {
                                                        setShowSuggestions(true);
                                                        setFilteredPatients(patients.slice(0, 10));
                                                    }}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                                />
                                                <i className="fas fa-search absolute right-3 top-3.5 text-gray-400"></i>
                                            </div>

                                            {/* Lista de pacientes */}
                                            {showSuggestions && (
                                                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto bg-white">
                                                    {filteredPatients.length === 0 ? (
                                                        <div className="p-3 text-gray-500 text-sm text-center">
                                                            Nenhum paciente encontrado
                                                        </div>
                                                    ) : (
                                                        filteredPatients.map((p) => (
                                                            <div
                                                                key={p._id}
                                                                className={`p-3 cursor-pointer border-b border-gray-100 last:border-0 hover:bg-teal-50 ${
                                                                    formData.patientId === p._id ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''
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
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Telefone *</label>
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
                                <label className="block text-sm font-bold text-gray-700 mb-1">Data de nascimento *</label>
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                <input
                                    type="text"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Responsável</label>
                                <input
                                    type="text"
                                    name="responsible"
                                    value={formData.responsible}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Data *</label>
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
                                <label className="block text-sm font-bold text-gray-700 mb-1">Horário *</label>
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Profissional *</label>
                                <select
                                    name="professional"
                                    value={formData.professional}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    required
                                >
                                    {(professionals || []).map((p, idx) => (
                                        <option key={idx} value={p.fullName}>
                                            {p.fullName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Especialidade *</label>
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
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Status Operacional *</label>
                            <select
                                name="operationalStatus"
                                value={formData.operationalStatus}
                                onChange={handleChange}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            >
                                <option value="confirmed">Confirmado</option>
                                <option value="scheduled">Pendente / Agendado</option>
                                <option value="pre_agendado">⭐ Pré-Agendado</option>
                                <option value="canceled">Cancelado</option>
                                <option value="missed">Faltou</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tipo (CRM)</label>
                                <select
                                    name="crm.serviceType"
                                    value={formData.crm.serviceType}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="individual_session">Sessão avulsa</option>
                                    <option value="package_session">Sessão de pacote</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tipo de sessão</label>
                                <select
                                    name="crm.sessionType"
                                    value={formData.crm.sessionType}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="avaliacao">Avaliação</option>
                                    <option value="sessao">Sessão</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Pagamento</label>
                                <select
                                    name="crm.paymentMethod"
                                    value={formData.crm.paymentMethod}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                >
                                    <option value="pix">Pix</option>
                                    <option value="cash">Dinheiro</option>
                                    <option value="credit_card">Cartão Crédito</option>
                                    <option value="debit_card">Cartão Débito</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Valor</label>
                                <input
                                    type="text"
                                    name="crm.paymentAmount"
                                    value={formData.crm.paymentAmount}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    min="0"
                                    step="1"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                id="usePackage"
                                type="checkbox"
                                name="crm.usePackage"
                                checked={!!formData.crm.usePackage}
                                onChange={handleChange}
                            />
                            <label htmlFor="usePackage" className="text-sm text-gray-700 font-semibold">
                                Usar pacote (se houver)
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Observações</label>
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
                    </div>

                    <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 sticky bottom-0">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2
        ${isLoading
                                    ? "bg-gray-400 cursor-not-allowed text-white"
                                    : "bg-teal-600 hover:bg-teal-700 text-white"
                                }`}
                        >
                            {isLoading && (
                                <svg
                                    className="animate-spin h-4 w-4 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v8H4z"
                                    />
                                </svg>
                            )}
                            {isLoading
                                ? "Processando..."
                                : isPre
                                    ? "Confirmar e Agendar"
                                    : isEdit
                                        ? "Atualizar Agendamento"
                                        : "Criar Agendamento"}
                        </button>

                    </div>
                </form>
            </div>
        </div>
    );
}
