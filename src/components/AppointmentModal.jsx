import React from "react";
import { formatDateLocal, extractDateForInput } from "../utils/date";
import { resolveSpecialtyKey } from "../utils/specialty";

export default function AppointmentModal({ appointment, professionals, patients, onSave, onClose }) {
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
                patientId: pObj._id || appointment.patientId || "",
                
                // Dados do agendamento
                date: appointment.date || today,
                time: appointment.time || "08:00",
                professional: profName || (professionals?.[0] || ""),
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
                professional: professionals?.[0] || "",
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

    const handlePatientChange = (value) => {
        setFormData(prev => ({ ...prev, patient: value }));

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
        setFormData(prev => ({
            ...prev,
            patient: p.fullName,
            phone: p.phone || prev.phone,
            birthDate: p.dateOfBirth ? p.dateOfBirth.split('T')[0] : prev.birthDate,
            email: p.email || prev.email,
        }));
        setShowSuggestions(false);
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
            // Montar payload completo com todos os campos
            const dataToSave = {
                // Dados do paciente
                patient: formData.patient,
                patientName: formData.patient,
                phone: formData.phone,
                birthDate: formData.birthDate,
                email: formData.email,
                responsible: formData.responsible,
                
                // Dados do agendamento
                date: formData.date,
                time: formData.time,
                professional: formData.professional,
                professionalName: formData.professional,
                specialty: formData.specialty,
                operationalStatus: formData.operationalStatus,
                observations: formData.observations,
                
                // Dados CRM
                crm: formData.crm,
                
                // ID se estiver editando
                ...(appointment?.id ? { id: appointment.id } : {})
            };
            
            console.log("[AppointmentModal] Enviando dados:", dataToSave);
            await onSave(dataToSave);
        } catch (error) {
            console.error("Erro ao salvar:", error);
        } finally {
            setIsLoading(false);
        }
    };


    const isEdit = !!appointment?.id && !appointment?.__isPreAgendamento;
    const isPre = !!appointment?.__isPreAgendamento;
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
                        <div className="relative">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Paciente *</label>
                            <input
                                type="text"
                                name="patient"
                                value={formData.patient}
                                onChange={(e) => handlePatientChange(e.target.value)}
                                onFocus={() => formData.patient.length > 2 && setShowSuggestions(true)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                required
                                autoComplete="off"
                            />
                            {showSuggestions && (
                                <div className="absolute z-[60] left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {filteredPatients.map((p) => (
                                        <div
                                            key={p._id}
                                            className="p-3 hover:bg-teal-50 cursor-pointer border-b border-gray-100 last:border-0"
                                            onClick={() => selectPatient(p)}
                                        >
                                            <div className="font-semibold text-gray-800">{p.fullName}</div>
                                            <div className="text-xs text-gray-500 flex justify-between">
                                                <span>{p.phone}</span>
                                                {p.dateOfBirth && <span>{new Date(p.dateOfBirth).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                    ))}
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
                                    <option value="Fonoaudiologia">Fonoaudiologia</option>
                                    <option value="Psicologia">Psicologia</option>
                                    <option value="Terapia Ocupacional">Terapia Ocupacional</option>
                                    <option value="Fisioterapia">Fisioterapia</option>
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
