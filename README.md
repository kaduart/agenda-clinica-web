# 🗓️ Agenda Clínica Web

Sistema de agendamento para clínicas - Frontend da Fono Inova.

## 🚀 Tecnologias

- ⚛️ React 19
- 🎨 Tailwind CSS
- 📡 API REST (Axios)
- 🔌 Socket.io (real-time)
- 🔔 React Toastify

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn

## 🛠️ Instalação

```bash
# Clonar o repositório
git clone <url-do-repo>
cd agenda-clinica-web

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações
```

## ⚙️ Configuração (.env)

```env
# URL da API do CRM
VITE_API_URL=https://fono-inova-crm-back.onrender.com

# Token de autenticação (deve ser o mesmo do backend)
VITE_API_TOKEN=agenda_export_token_fono_inova_2025_secure_abc123
```

## 🧪 Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Abrir http://localhost:5173
```

## 📦 Build e Deploy

```bash
# Verificar antes do build
bash scripts/verify-build.sh

# Criar build de produção
npm run build

# Deploy na Vercel
npm run deploy
```

## 🏗️ Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── AppointmentModal.jsx
│   ├── AppointmentTable.jsx
│   ├── ExportButton.jsx
│   ├── ReminderList.jsx
│   └── ...
├── services/           # Serviços de API
│   ├── api.js         # Configuração do Axios
│   ├── crmApi.js      # API de integração com CRM
│   ├── appointmentsRepo.js
│   └── ...
├── utils/             # Utilitários
└── App.jsx           # Componente principal
```

## 🔌 APIs Utilizadas

### Integração com CRM

| Função | Endpoint | Descrição |
|--------|----------|-----------|
| `exportToCRM` | POST /api/import-from-agenda | Exporta agendamento confirmado |
| `syncUpdateToCRM` | POST /api/import-from-agenda/sync-update | Sincroniza edições |
| `syncDeleteToCRM` | POST /api/import-from-agenda/sync-delete | Sincroniza exclusões |
| `syncCancelToCRM` | POST /api/import-from-agenda/sync-cancel | Sincroniza cancelamentos |
| `autoSendPreAgendamento` | POST /api/pre-agendamento/webhook | Envia pré-agendamento |
| `confirmarAgendamento` | POST /api/import-from-agenda/confirmar-por-external-id | Confirma agendamento |

### Agendamentos

| Endpoint | Descrição |
|----------|-----------|
| GET /api/appointments | Lista agendamentos |
| DELETE /api/appointments/:id | Remove agendamento |
| PATCH /api/appointments/:id/cancel | Cancela agendamento |

## 🔄 Migração Firebase → API

**⚠️ Importante:** Este projeto foi migrado do Firebase para API REST.

### O que mudou?

| Antes | Depois |
|-------|--------|
| `database.ref()` | `fetch()` / Axios |
| Firebase Realtime DB | MongoDB via API |
| `onSnapshot` | Socket.io + polling |

### Arquivos modificados

- ✅ `src/services/crmApi.js` - Novo serviço (substitui crmExport.js)
- ✅ `src/components/ReminderList.jsx` - Agora usa API
- ✅ `src/components/ExportButton.jsx` - Simplificado (integração automática)
- ❌ `src/services/crmExport.js` - Descontinuado (mantido como backup)

## 🐛 Troubleshooting

### Erro: "Token inválido"
Verifique se `VITE_API_TOKEN` está configurado corretamente no `.env`

### Erro: "Network Error"
Verifique se `VITE_API_URL` está acessível e o backend está online

### Erro: CORS
O backend precisa ter a URL do frontend na lista de CORS permitidos

## 📝 Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Cria build de produção |
| `npm run preview` | Visualiza build localmente |
| `npm run deploy` | Deploy na Vercel |
| `bash scripts/verify-build.sh` | Verifica antes do build |

## 🤝 Contribuição

1. Faça backup antes de alterar
2. Teste localmente antes do deploy
3. Siga o guia em `MIGRACAO-FIREBASE-para-API.md`

## 📄 Licença

Privado - Fono Inova
