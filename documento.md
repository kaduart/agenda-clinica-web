curl 'http://localhost:5000/api/pre-agendamento/69b9da644cbdcdf6ddc1a378/importar' \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Accept-Language: pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7' \
  -H 'Authorization: Bearer agenda_export_token_fono_inova_2025_secure_abc123' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Origin: http://localhost:5174' \
  -H 'Referer: http://localhost:5174/' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-site' \
  -H 'User-Agent: Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36' \
  -H 'sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"' \
  -H 'sec-ch-ua-mobile: ?1' \
  -H 'sec-ch-ua-platform: "Android"' \
  --data-raw '{"doctorId":"689815f43e7468e2d7faa2ef","date":"2026-03-17","time":"14:00","sessionValue":1,"serviceType":"evaluation","paymentMethod":"pix","notes":"","patientId":"","birthDate":"2026-03-16","phone":"61992013573","email":"ricardosantos.ti15@gmail.com","responsible":""}' {"success":false,"error":"Não foi possível criar/encontrar o paciente"}        
⚡ Novo cliente conectado: MVGtoSEz9HETEABoAAAK
👥 Total de clientes: 6
⚡ Novo cliente conectado: 6bvPf944FLx7cG5YAAAL
👥 Total de clientes: 6
[INFO] 2026-03-17T22:47:40.746Z — [MetaAds Cron] Primeira sincronização (cache vazio ou expirado)...
[INFO] 2026-03-17T22:47:40.746Z — [MetaAds Cron] Iniciando sincronização diária...
[INFO] 2026-03-17T22:47:40.746Z — [MetaAds] Iniciando sincronização de campanhas...
[INFO] 2026-03-17T22:47:40.746Z — [MetaAds] Token carregado: EAF47VGixPlgBQyv38l2p34ZAGmiWJ... (196 chars)
[INFO] 2026-03-17T22:47:40.746Z — [MetaAds] Buscando campanhas de 2 conta(s): act_976430640058336, act_1313865209694265
[INFO] 2026-03-17T22:47:40.746Z — [MetaAds] Buscando da conta act_976430640058336...
[INFO] 2026-03-17T22:47:41.062Z — [MetaAds] Conta act_976430640058336: 17 campanhas
[INFO] 2026-03-17T22:47:41.062Z — [MetaAds] Buscando da conta act_1313865209694265...
[INFO] 2026-03-17T22:47:41.397Z — [MetaAds] Conta act_1313865209694265: 18 campanhas
[INFO] 2026-03-17T22:47:41.397Z — [MetaAds] Total: 35 campanhas de 2 conta(s)
[INFO] 2026-03-17T22:47:42.440Z — [MetaAds] Sincronização concluída: 35 sincronizadas, 0 erros
[INFO] 2026-03-17T22:47:42.441Z — [MetaAds] Atualizando contagem de leads...
[INFO] 2026-03-17T22:47:43.358Z — [MetaAds] Contagem de leads atualizada
[INFO] 2026-03-17T22:47:43.359Z — [MetaAds Cron] Sincronização concluída: { synced: 35, cached: undefined, errors: 0 }
⚠️ Cliente desconectado (transport close)
⚠️ Cliente desconectado (transport close)
[2026-03-17T22:48:00.216Z] GET → /api/doctors
[2026-03-17T22:48:00.220Z] GET → /api/patients
[PATIENTS LIST] Search: "undefined", Limit: 1000
[2026-03-17T22:48:00.229Z] GET → /api/appointments
[GET /appointments] Query: {
  patientId: undefined,
  doctorId: undefined,
  status: undefined,
  specialty: undefined,
  startDate: '2026-03-17',
  endDate: '2026-03-17',
  excludePreAgendamentos: undefined
}
[2026-03-17T22:48:00.234Z] GET → /api/reminders
[PATIENTS LIST] Encontrados: 178 pacientes
[GET /appointments] PreAgendamentos não importados: 1
[GET /appointments] Retornando 9 eventos (8 appointments + 1 pré-agendamentos)
⚡ Novo cliente conectado: 3g--zsvXPSlmCXnzAAAO
👥 Total de clientes: 6
[2026-03-17T22:48:00.777Z] GET → /api/doctors
[2026-03-17T22:48:00.782Z] GET → /api/patients
[PATIENTS LIST] Search: "undefined", Limit: 1000
[2026-03-17T22:48:00.792Z] GET → /api/appointments
[GET /appointments] Query: {
  patientId: undefined,
  doctorId: undefined,
  status: undefined,
  specialty: undefined,
  startDate: '2026-03-17',
  endDate: '2026-03-17',
  excludePreAgendamentos: undefined
}
(node:333884) Warning: Label 'appointments.query' already exists for console.time()
[2026-03-17T22:48:00.807Z] GET → /api/reminders
[PATIENTS LIST] Encontrados: 178 pacientes
[GET /appointments] PreAgendamentos não importados: 1
[GET /appointments] Retornando 9 eventos (8 appointments + 1 pré-agendamentos)
⚡ Novo cliente conectado: GUUoNDMg2IQNNxIFAAAP
👥 Total de clientes: 6
[2026-03-17T22:48:36.926Z] GET → /api/pre-agendamento
[2026-03-17T22:48:37.493Z] GET → /api/pre-agendamento
[2026-03-17T22:49:08.215Z] POST → /api/import-from-agenda
=== AUTH DEBUG ===
Header completo: "Bearer agenda_export_token_fono_inova_2025_secure_abc123"
Token extraído: "agenda_export_token_fono_inova_2025_secure_abc123"
Token esperado: "agenda_export_token_fono_inova_2025_secure_abc123"
Tamanho token recebido: 49
Tamanho token esperado: 49
São iguais?: true
✅ TOKEN VÁLIDO!
[IMPORT-FROM-AGENDA] 💾 Criando PreAgendamento: {
  patient: 'kkkk',
  date: '2026-03-17',
  time: '14:00',
  specialty: 'fonoaudiologia',
  suggestedValue: 1
}
[IMPORT-FROM-AGENDA] ✅ PreAgendamento criado: 69b9da644cbdcdf6ddc1a378
📡 Socket emitido (tentativa 1): preagendamento:new 69b9da644cbdcdf6ddc1a378
[2026-03-17T22:49:09.062Z] GET → /api/appointments
[GET /appointments] Query: {
  patientId: undefined,
  doctorId: undefined,
  status: undefined,
  specialty: undefined,
  startDate: '2026-03-17',
  endDate: '2026-03-17',
  excludePreAgendamentos: undefined
}
(node:333884) Warning: Label 'appointments.query' already exists for console.time()
[2026-03-17T22:49:09.331Z] GET → /api/pre-agendamento
[GET /appointments] PreAgendamentos não importados: 2
[GET /appointments] Retornando 10 eventos (8 appointments + 2 pré-agendamentos)
[2026-03-17T22:49:09.631Z] GET → /api/appointments
[GET /appointments] Query: {
  patientId: undefined,
  doctorId: undefined,
  status: undefined,
  specialty: undefined,
  startDate: '2026-03-17',
  endDate: '2026-03-17',
  excludePreAgendamentos: undefined
}
(node:333884) Warning: Label 'appointments.query' already exists for console.time()
[2026-03-17T22:49:09.895Z] GET → /api/pre-agendamento
[GET /appointments] PreAgendamentos não importados: 2
[GET /appointments] Retornando 10 eventos (8 appointments + 2 pré-agendamentos)
[2026-03-17T22:49:10.205Z] GET → /api/appointments
[GET /appointments] Query: {
  patientId: undefined,
  doctorId: undefined,
  status: undefined,
  specialty: undefined,
  startDate: '2026-03-17',
  endDate: '2026-03-17',
  excludePreAgendamentos: undefined
}
(node:333884) Warning: Label 'appointments.query' already exists for console.time()
[GET /appointments] PreAgendamentos não importados: 2
[GET /appointments] Retornando 10 eventos (8 appointments + 2 pré-agendamentos)
[2026-03-17T22:49:10.778Z] GET → /api/appointments
[GET /appointments] Query: {
  patientId: undefined,
  doctorId: undefined,
  status: undefined,
  specialty: undefined,
  startDate: '2026-03-17',
  endDate: '2026-03-17',
  excludePreAgendamentos: undefined
}
(node:333884) Warning: Label 'appointments.query' already exists for console.time()
📡 Socket emitido (tentativa 99): preagendamento:new 69b9da644cbdcdf6ddc1a378
[GET /appointments] PreAgendamentos não importados: 2
[GET /appointments] Retornando 10 eventos (8 appointments + 2 pré-agendamentos)
[2026-03-17T22:49:11.343Z] GET → /api/appointments
[GET /appointments] Query: {
  patientId: undefined,
  doctorId: undefined,
  status: undefined,
  specialty: undefined,
  startDate: '2026-03-17',
  endDate: '2026-03-17',
  excludePreAgendamentos: undefined
}
(node:333884) Warning: Label 'appointments.query' already exists for console.time()
[2026-03-17T22:49:11.379Z] GET → /api/pre-agendamento
[GET /appointments] PreAgendamentos não importados: 2
[GET /appointments] Retornando 10 eventos (8 appointments + 2 pré-agendamentos)
[2026-03-17T22:49:11.912Z] GET → /api/appointments
[GET /appointments] Query: {
  patientId: undefined,
  doctorId: undefined,
  status: undefined,
  specialty: undefined,
  startDate: '2026-03-17',
  endDate: '2026-03-17',
  excludePreAgendamentos: undefined
}
(node:333884) Warning: Label 'appointments.query' already exists for console.time()
[2026-03-17T22:49:11.931Z] GET → /api/pre-agendamento
📡 Force refresh emitido para 69b9da644cbdcdf6ddc1a378
[GET /appointments] PreAgendamentos não importados: 2
[GET /appointments] Retornando 10 eventos (8 appointments + 2 pré-agendamentos)
⚠️ Cliente desconectado (client namespace disconnect)
⚠️ Cliente desconectado (client namespace disconnect)
[2026-03-17T22:49:37.250Z] GET → /api/pre-agendamento
⚡ Novo cliente conectado: RuZz81FVkeqlx5ReAAAS
👥 Total de clientes: 6
[2026-03-17T22:49:37.816Z] GET → /api/pre-agendamento
⚡ Novo cliente conectado: waMz5CTzFMN3PCcWAAAT
👥 Total de clientes: 6
🚀 Primeira execução do Lead Recovery (warmup)...
🔁 Recovery habilitado para 0 leads existentes
[2026-03-17T22:49:40.719Z] POST → /api/pre-agendamento/69b9da644cbdcdf6ddc1a378/importar
[IMPORTAR] Dados recebidos do frontend: {
  birthDate: '2026-03-16',
  phone: '61992013573',
  email: 'ricardosantos.ti15@gmail.com',
  responsible: '',
  body: {
    doctorId: '689815f43e7468e2d7faa2ef',
    date: '2026-03-17',
    time: '14:00',
    sessionValue: 1,
    serviceType: 'evaluation',
    paymentMethod: 'pix',
    notes: '',
    patientId: '',
    birthDate: '2026-03-16',
    phone: '61992013573',
    email: 'ricardosantos.ti15@gmail.com',
    responsible: ''
  }
}
[IMPORTAR] Dados atuais do pré-agendamento: {
  patientInfo: {
    fullName: 'kkkk',
    phone: '61992013573',
    email: 'ricardosantos.ti15@gmail.com',
    birthDate: '2026-03-16',
    ageUnit: 'anos'
  }
}
[IMPORTAR] Atualizando birthDate: 2026-03-16
[IMPORTAR] Dados após atualização: {
  patientInfo: {
    fullName: 'kkkk',
    phone: '61992013573',
    email: 'ricardosantos.ti15@gmail.com',
    birthDate: '2026-03-16',
    ageUnit: 'anos'
  }