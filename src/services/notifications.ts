// ============================================================
//  notifications.ts — Notificações push de streak
//
//  Funcionamento:
//  1. Pede permissão ao usuário na primeira vez
//  2. Após cada sessão, agenda uma notificação para 21h
//     caso o usuário não abra o app naquele dia
//  3. O Service Worker dispara a notificação fora do app
//  4. Mensagem varia conforme tamanho do streak
// ============================================================

const NOTIF_PERMISSION_KEY  = 'notif_permission_asked';
const NOTIF_SCHEDULED_KEY   = 'notif_scheduled_date';
const NOTIF_HOUR            = 21; // 21h local do usuário

// Mensagens por faixa de streak — mais dramáticas conforme o streak cresce
export function getStreakMessage(streak: number): { title: string; body: string } {
  if (streak >= 100) return {
    title: '🔥 100+ dias! Não quebre agora.',
    body: 'Você é uma lenda. Sua chama está acesa há mais de 100 dias. Não apague hoje.',
  };
  if (streak >= 30) return {
    title: `🔥 ${streak} dias seguidos em risco!`,
    body: 'Um mês de dedicação. Faltam poucos minutos para meia-noite — abra o app agora.',
  };
  if (streak >= 14) return {
    title: `⚡ Sua sequência de ${streak} dias está quase apagando`,
    body: 'Duas semanas de fé e constância. Vale 2 minutos para manter isso vivo?',
  };
  if (streak >= 7) return {
    title: `✨ ${streak} dias seguidos — não perca agora`,
    body: 'Uma semana inteira. É só abrir o app por um instante para manter o ritmo.',
  };
  if (streak >= 3) return {
    title: `🕯️ Sua chama de ${streak} dias precisa de você`,
    body: 'Pequenos passos constantes constroem grandes hábitos. Abra o Versiculando.',
  };
  return {
    title: '📖 Hora da sua leitura de hoje',
    body: 'Um versículo por dia transforma. Abra o Versiculando e continue sua jornada.',
  };
}

// Verifica se o browser suporta notificações
export function notificationsSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

// Pede permissão — deve ser chamado em resposta a um gesto do usuário
export async function requestPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  const permission = await Notification.requestPermission();
  localStorage.setItem(NOTIF_PERMISSION_KEY, permission);
  return permission;
}

export function getPermissionStatus(): NotificationPermission | null {
  if (!notificationsSupported()) return null;
  return Notification.permission;
}

// Agenda notificação de streak para as 21h de hoje (se ainda não passou)
// ou para as 21h de amanhã se já passou das 21h.
// O Service Worker usa postMessage para receber o agendamento.
export async function scheduleStreakNotification(streak: number): Promise<void> {
  if (!notificationsSupported()) return;
  if (Notification.permission !== 'granted') return;

  const today = new Date().toISOString().split('T')[0];
  const alreadyScheduled = localStorage.getItem(NOTIF_SCHEDULED_KEY);

  // Não reagenda se já agendou para hoje
  if (alreadyScheduled === today) return;

  const sw = await navigator.serviceWorker.ready;
  if (!sw) return;

  const now   = new Date();
  const target = new Date();
  target.setHours(NOTIF_HOUR, 0, 0, 0);

  // Se já passou das 21h, agenda para amanhã às 21h
  if (now >= target) {
    target.setDate(target.getDate() + 1);
  }

  const delayMs = target.getTime() - now.getTime();
  const { title, body } = getStreakMessage(streak);

  sw.active?.postMessage({
    type:    'SCHEDULE_STREAK_NOTIFICATION',
    delayMs,
    title,
    body,
    streak,
    scheduledFor: target.toISOString(),
  });

  localStorage.setItem(NOTIF_SCHEDULED_KEY, today);
}

// Cancela notificação agendada (chamar quando usuário abre o app)
export async function cancelStreakNotification(): Promise<void> {
  if (!notificationsSupported()) return;
  const sw = await navigator.serviceWorker.ready.catch(() => null);
  sw?.active?.postMessage({ type: 'CANCEL_STREAK_NOTIFICATION' });
}

// Limpa o agendamento salvo — chamar quando o usuário conclui uma atividade no dia
export function markTodayActive(): void {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem('last_active_day_notif', today);
  // Remove agendamento pendente — usuário já está ativo hoje
  cancelStreakNotification();
}
