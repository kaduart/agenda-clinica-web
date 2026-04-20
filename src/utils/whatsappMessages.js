/**
 * 🟢 Utilitários para mensagens WhatsApp (Sem API)
 * Usa wa.me para abrir WhatsApp Web com mensagens pré-formatadas
 */

/**
 * Gera link de confirmação de agendamento
 */
export function gerarLinkConfirmacao(paciente) {
  const phone = (paciente.phone || '').replace(/\D/g, '');
  if (!phone) return null;
  
  const nome = (paciente.name || paciente.fullName || paciente.patient || 'Paciente').split(' ')[0];
  const data = paciente.date 
    ? new Date(paciente.date + 'T12:00:00').toLocaleDateString('pt-BR')
    : '';
  const hora = paciente.time || '';
  const profissional = paciente.professional || paciente.doctor?.fullName || '';
  
  const msg = `Olá ${nome} 💚

Sua avaliação está *CONFIRMADA*!

📅 Data: ${data}
⏰ Horário: ${hora}${profissional ? `\n👩‍⚕️ Profissional: ${profissional}` : ''}
🏥 Clínica Fono Inova

Um dia antes, enviaremos uma mensagem para lembrá-lo(a).

Te esperamos! 😊`;

  return `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
}

/**
 * Gera link de lembrete (para o dia anterior)
 */
export function gerarLinkLembrete(paciente) {
  const phone = (paciente.phone || '').replace(/\D/g, '');
  if (!phone) return null;
  
  const nome = (paciente.name || paciente.fullName || paciente.patient || 'Paciente').split(' ')[0];
  const data = paciente.date 
    ? new Date(paciente.date + 'T12:00:00').toLocaleDateString('pt-BR')
    : '';
  const hora = paciente.time || '';
  
  const msg = `Olá ${nome} 💚

Lembrete: sua avaliação é *AMANHÃ*!

📅 Data: ${data}
⏰ Horário: ${hora}
🏥 Clínica Fono Inova

Estamos te esperando! 🌟

Precisa remarcar? Responda aqui.`;

  return `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
}

/**
 * Abre WhatsApp Web e mostra toast
 */
export function enviarWhatsApp(tipo, paciente, onSuccess) {
  const link = tipo === 'confirmacao' 
    ? gerarLinkConfirmacao(paciente)
    : gerarLinkLembrete(paciente);
    
  if (!link) {
    alert('❌ Telefone não encontrado para este paciente');
    return;
  }
  
  // Abre WhatsApp Web na mesma aba (não nova aba)
  window.location.href = link;
  
  // Callback para toast (chamar antes de sair da página)
  if (onSuccess) {
    onSuccess(tipo === 'confirmacao' 
      ? '✅ Confirmação aberta no WhatsApp Web'
      : '🔔 Lembrete aberto no WhatsApp Web'
    );
  }
}

/**
 * Copia link do lembrete para uso posterior
 */
export function copiarLinkLembrete(paciente, onSuccess) {
  const link = gerarLinkLembrete(paciente);
  
  if (!link) {
    alert('❌ Telefone não encontrado');
    return;
  }
  
  navigator.clipboard.writeText(link).then(() => {
    if (onSuccess) {
      onSuccess('🔗 Link do lembrete copiado! Use no dia anterior.');
    }
  });
}
