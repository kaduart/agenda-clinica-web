# 🚀 Migração: Firebase → API REST (MongoDB)

Guia para migrar a Agenda Externa do Firebase para API REST direta.

## 📋 Resumo da Mudança

| Antes (Firebase) | Depois (API REST) |
|------------------|-------------------|
| `database.ref()` | `fetch()` para API |
| Real-time sync | Socket.io + polling |
| Cache local no Firebase | Cache em memória (Map) |
| Exportação assíncrona | Exportação síncrona com feedback |

## 🔄 Substituições de Código

### 1. Serviço de Exportação

**ANTES:** `src/services/crmExport.js`
```javascript
import { database } from "../config/firebase";
// ... usa database.ref() para tudo
```

**DEPOIS:** `src/services/crmApi.js` (já criado)
```javascript
// Usa fetch() para API REST direto
import { exportToCRM, autoSendPreAgendamento } from './crmApi';
```

### 2. Atualizar Imports

**Arquivos que usam crmExport.js:**

```javascript
// ANTES
import { exportToCRM, syncDeleteToCRM } from './services/crmExport';

// DEPOIS
import { exportToCRM, syncDeleteToCRM } from './services/crmApi';
```

**Lista de arquivos para atualizar:**
- `src/components/ExportButton.jsx`
- `src/components/AppointmentRow.jsx`
- `src/App.jsx` (se importar funções de exportação)

### 3. Remover Firebase Config

**DELETAR:** `src/config/firebase.js`
```javascript
// DELETAR ESTE ARQUIVO INTEIRO
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// ...
```

**DELETAR:** `src/firebase.js` (se existir)

### 4. Atualizar .env

**ANTES:**
```env
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_DATABASE_URL=xxx
VITE_FIREBASE_PROJECT_ID=xxx
```

**DEPOIS:**
```env
VITE_API_URL=https://fono-inova-crm-back.onrender.com
VITE_API_TOKEN=agenda_export_token_fono_inova_2025_secure_abc123
```

### 5. Componentes que usam Firebase diretamente

**ReminderList.jsx** - Precisa ser reescrito:
```javascript
// ANTES
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// DEPOIS
import api from '../services/api';
// Usar: api.get('/api/reminders') ou similar
```

## 🛠️ Passo a Passo da Migração

### Passo 1: Backup
```bash
cp src/services/crmExport.js src/services/crmExport.js.backup
cp src/config/firebase.js src/config/firebase.js.backup
```

### Passo 2: Testar novo serviço
```bash
# O arquivo src/services/crmApi.js já está criado
# Testar importação:
npm run dev
# Verificar console por erros
```

### Passo 3: Atualizar componentes um a um

1. **ExportButton.jsx**
   - Trocar import de `crmExport` para `crmApi`
   - Remover lógica de Firebase

2. **AppointmentRow.jsx**
   - Atualizar funções de sync

3. **App.jsx**
   - Remover imports do Firebase
   - Usar apenas API

### Passo 4: Testar fluxo completo

```bash
npm run build
# Testar:
# 1. Criar agendamento
# 2. Editar agendamento
# 3. Confirmar agendamento
# 4. Cancelar agendamento
# 5. Excluir agendamento
```

### Passo 5: Remover Firebase

```bash
npm uninstall firebase
rm -rf src/config/firebase.js
rm -rf .firebaserc firebase.json
```

## 🧪 Testes Pós-Migração

### Teste 1: Exportar para CRM
```javascript
// Console do navegador
import { exportToCRM } from './services/crmApi';

const mockAppointment = {
    id: 'test_123',
    patient: 'Paciente Teste',
    phone: '11999998888',
    birthDate: '1990-01-01',
    professional: 'Dra. Teste',
    date: '2026-03-01',
    time: '10:00',
    status: 'Confirmado'
};

exportToCRM(mockAppointment);
```

### Teste 2: Sincronizar Update
```javascript
import { syncUpdateToCRM } from './services/crmApi';

syncUpdateToCRM(
    { id: 'test_123', date: '2026-03-01', time: '10:00' },
    { date: '2026-03-02', time: '14:00' }
);
```

### Teste 3: Sincronizar Delete
```javascript
import { syncDeleteToCRM } from './services/crmApi';

syncDeleteToCRM('test_123', 'Teste de exclusão');
```

## 🐛 Problemas Comuns

### Problema 1: "Cannot find module '../config/firebase'"
**Solução:** Atualizar o import para novo serviço

### Problema 2: Cache não persiste entre reloads
**Solução:** Isso é esperado! O cache é em memória. 
Para persistência, usar localStorage:
```javascript
// No crmApi.js, substituir Map por localStorage
```

### Problema 3: Dados não aparecem no CRM
**Solução:** Verificar:
1. Token está correto?
2. API está respondendo?
3. Ver console por erros

## 📊 Checklist Final

- [ ] `crmExport.js` não é mais importado
- [ ] `firebase` removido de package.json
- [ ] Configuração Firebase deletada
- [ ] Exportação funcionando
- [ ] Sincronização de updates funcionando
- [ ] Sincronização de deletes funcionando
- [ ] Cancelamentos funcionando
- [ ] Sem erros no console
- [ ] Build completa sem erros

## 🆘 Rollback (se necessário)

```bash
# Restaurar backup
cp src/services/crmExport.js.backup src/services/crmExport.js
cp src/config/firebase.js.backup src/config/firebase.js
npm install firebase

# Reverter imports nos componentes
```

## 📞 Suporte

Se encontrar problemas:
1. Verificar logs do navegador (F12 → Console)
2. Verificar logs do backend no Render
3. Testar API diretamente com curl/Postman

---

**🎉 Após migração, a agenda externa será 100% independente do Firebase!**
