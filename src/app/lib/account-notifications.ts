/**
 * GO-H12 — Notificações de conta (persistência + dedupe).
 * Uma notificação por transição de status; nunca duplicar o mesmo dedupeKey.
 */
import { prisma } from "@/app/lib/prisma";
import { isOperationalNoFileService } from "@/app/lib/service-catalog";

export type AccountNotificationType =
  | "appointment_accepted"
  | "service_started"
  | "service_completed"
  | "appointment_rejected"
  | "appointment_cancelled"
  | "files_available";

export type AccountNotificationRecord = {
  id: string;
  type: string;
  title: string;
  message: string;
  actionLabel: string | null;
  actionHref: string | null;
  appointmentId: number | null;
  serviceId: string | null;
  readAt: string | null;
  createdAt: string;
};

export { isOperationalNoFileService } from "@/app/lib/service-catalog";

function hrefAgendamentos(appointmentId?: number | null): string {
  if (appointmentId != null) {
    return `/minha-conta?tab=agendamentos&apt=${appointmentId}`;
  }
  return "/minha-conta?tab=agendamentos";
}

function hrefDownloads(): string {
  return "/minha-conta?tab=downloads";
}

function hrefHistorico(appointmentId?: number | null): string {
  if (appointmentId != null) {
    return `/minha-conta?tab=agendamentos&apt=${appointmentId}`;
  }
  return "/minha-conta?tab=agendamentos";
}

export async function createAccountNotification(input: {
  userId: string;
  type: AccountNotificationType;
  title: string;
  message: string;
  actionLabel: string;
  actionHref: string;
  appointmentId?: number | null;
  serviceId?: string | null;
  dedupeKey: string;
  metadata?: Record<string, unknown>;
}): Promise<{ created: boolean; id?: string }> {
  try {
    const row = await prisma.userNotification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        actionLabel: input.actionLabel,
        actionHref: input.actionHref,
        appointmentId: input.appointmentId ?? null,
        serviceId: input.serviceId ?? null,
        dedupeKey: input.dedupeKey,
        metadata: JSON.stringify(input.metadata || {}),
      },
      select: { id: true },
    });
    return { created: true, id: row.id };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "P2002") {
      return { created: false };
    }
    console.error("[GO-H12] createAccountNotification failed:", err);
    return { created: false };
  }
}

/** Emite notificação de transição de Appointment (1 por status alvo). */
export async function notifyAppointmentStatusChange(params: {
  appointmentId: number;
  toStatus: string;
  alreadyProcessed?: boolean;
}): Promise<void> {
  if (params.alreadyProcessed) return;

  const apt = await prisma.appointment.findUnique({
    where: { id: params.appointmentId },
    select: { id: true, userId: true, tipo: true, status: true },
  });
  if (!apt) return;

  const to = String(params.toStatus || apt.status).toLowerCase();
  const aptId = apt.id;

  if (to === "aceito" || to === "confirmado") {
    await createAccountNotification({
      userId: apt.userId,
      type: "appointment_accepted",
      title: "Seu agendamento foi aceito.",
      message:
        "Seu agendamento foi aprovado pela equipe e já pode ser acompanhado pela página de Agendamentos.",
      actionLabel: "Ver Agendamento",
      actionHref: hrefAgendamentos(aptId),
      appointmentId: aptId,
      dedupeKey: `appointment_accepted:apt:${aptId}`,
    });
    return;
  }

  if (to === "em_andamento") {
    await createAccountNotification({
      userId: apt.userId,
      type: "service_started",
      title: "Seu serviço foi iniciado.",
      message:
        "Nossa equipe iniciou o seu serviço.\n\nVocê poderá acompanhar o andamento pela página de Agendamentos.",
      actionLabel: "Acompanhar Serviço",
      actionHref: hrefAgendamentos(aptId),
      appointmentId: aptId,
      dedupeKey: `service_started:apt:${aptId}`,
    });
    return;
  }

  if (to === "recusado") {
    await createAccountNotification({
      userId: apt.userId,
      type: "appointment_rejected",
      title: "Seu agendamento foi recusado.",
      message:
        "Infelizmente não foi possível realizar este agendamento.\n\nCaso exista direito a reembolso ou cupom de remarcação, acesse agora a página de Agendamentos para escolher a opção desejada.",
      actionLabel: "Ver Agendamentos",
      actionHref: hrefAgendamentos(aptId),
      appointmentId: aptId,
      dedupeKey: `appointment_rejected:apt:${aptId}`,
    });
    return;
  }

  if (to === "cancelado") {
    await createAccountNotification({
      userId: apt.userId,
      type: "appointment_cancelled",
      title: "Seu agendamento foi cancelado.",
      message:
        "Seu agendamento foi cancelado.\n\nCaso exista direito a reembolso financeiro ou cupom de remarcação, acesse a página de Agendamentos para selecionar a opção desejada e concluir esse processo.",
      actionLabel: "Ver Agendamentos",
      actionHref: hrefAgendamentos(aptId),
      appointmentId: aptId,
      dedupeKey: `appointment_cancelled:apt:${aptId}`,
    });
    return;
  }

  if (to === "concluido") {
    const services = await prisma.service.findMany({
      where: { appointmentId: aptId },
      select: { id: true, tipo: true, deliveryAudioUrl: true },
    });
    const hasFiles = services.some((s) => Boolean(s.deliveryAudioUrl));
    const allOperational = services.length > 0 && services.every((s) => isOperationalNoFileService(s.tipo));
    const productionComplete = hasFiles || (!allOperational && services.length > 0);

    if (productionComplete && hasFiles) {
      await createAccountNotification({
        userId: apt.userId,
        type: "service_completed",
        title: "Seu serviço foi concluído.",
        message:
          "Se este for um serviço de produção (Mixagem, Masterização, Beat, Sonoplastia ou Produção Completa), seus arquivos já estão disponíveis para download.\n\nCaso seja um serviço de Sessão ou Captação, o serviço foi finalizado com sucesso e registrado em seu histórico.",
        actionLabel: "Ir para Downloads",
        actionHref: hrefDownloads(),
        appointmentId: aptId,
        dedupeKey: `service_completed:apt:${aptId}`,
      });
    } else {
      await createAccountNotification({
        userId: apt.userId,
        type: "service_completed",
        title: "Seu serviço foi concluído.",
        message:
          "Se este for um serviço de produção (Mixagem, Masterização, Beat, Sonoplastia ou Produção Completa), seus arquivos já estão disponíveis para download.\n\nCaso seja um serviço de Sessão ou Captação, o serviço foi finalizado com sucesso e registrado em seu histórico.",
        actionLabel: "Ver Histórico",
        actionHref: hrefHistorico(aptId),
        appointmentId: aptId,
        dedupeKey: `service_completed:apt:${aptId}`,
      });
    }
  }
}

/** Emite notificação ao concluir um Service (produção ou operacional). */
export async function notifyServiceCompleted(params: {
  serviceId: string;
  alreadyProcessed?: boolean;
}): Promise<void> {
  if (params.alreadyProcessed) return;

  const svc = await prisma.service.findUnique({
    where: { id: params.serviceId },
    select: {
      id: true,
      userId: true,
      tipo: true,
      appointmentId: true,
      deliveryAudioUrl: true,
      status: true,
    },
  });
  if (!svc || svc.status !== "concluido") return;

  const aptId = svc.appointmentId;
  const noFile = isOperationalNoFileService(svc.tipo);
  const hasFile = Boolean(svc.deliveryAudioUrl);

  await createAccountNotification({
    userId: svc.userId,
    type: "service_completed",
    title: "Seu serviço foi concluído.",
    message:
      "Se este for um serviço de produção (Mixagem, Masterização, Beat, Sonoplastia ou Produção Completa), seus arquivos já estão disponíveis para download.\n\nCaso seja um serviço de Sessão ou Captação, o serviço foi finalizado com sucesso e registrado em seu histórico.",
    actionLabel: noFile || !hasFile ? "Ver Histórico" : "Ir para Downloads",
    actionHref: noFile || !hasFile ? hrefHistorico(aptId) : hrefDownloads(),
    appointmentId: aptId,
    serviceId: svc.id,
    dedupeKey: aptId != null
      ? `service_completed:apt:${aptId}`
      : `service_completed:svc:${svc.id}`,
  });
}

/** Quando só a URL de entrega é gravada (sem mudança de status). */
export async function notifyFilesAvailable(params: {
  serviceId: string;
}): Promise<void> {
  const svc = await prisma.service.findUnique({
    where: { id: params.serviceId },
    select: {
      id: true,
      userId: true,
      tipo: true,
      appointmentId: true,
      deliveryAudioUrl: true,
    },
  });
  if (!svc?.deliveryAudioUrl) return;
  if (isOperationalNoFileService(svc.tipo)) return;

  await createAccountNotification({
    userId: svc.userId,
    type: "files_available",
    title: "Arquivos disponíveis para download.",
    message: "Os arquivos do seu serviço já estão disponíveis.",
    actionLabel: "Ir para Downloads",
    actionHref: hrefDownloads(),
    appointmentId: svc.appointmentId,
    serviceId: svc.id,
    dedupeKey: `files_available:svc:${svc.id}`,
  });
}

export async function listAccountNotifications(
  userId: string,
  take = 50
): Promise<AccountNotificationRecord[]> {
  const rows = await prisma.userNotification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    message: r.message,
    actionLabel: r.actionLabel,
    actionHref: r.actionHref,
    appointmentId: r.appointmentId,
    serviceId: r.serviceId,
    readAt: r.readAt ? r.readAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function markNotificationsRead(params: {
  userId: string;
  ids?: string[];
  all?: boolean;
}): Promise<number> {
  if (params.all) {
    const res = await prisma.userNotification.updateMany({
      where: { userId: params.userId, readAt: null },
      data: { readAt: new Date() },
    });
    return res.count;
  }
  const ids = (params.ids || []).filter(Boolean);
  if (!ids.length) return 0;
  const res = await prisma.userNotification.updateMany({
    where: { userId: params.userId, id: { in: ids }, readAt: null },
    data: { readAt: new Date() },
  });
  return res.count;
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return prisma.userNotification.count({
    where: { userId, readAt: null },
  });
}
