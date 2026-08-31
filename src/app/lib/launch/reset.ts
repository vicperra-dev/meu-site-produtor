/**
 * LAUNCH-01 / LAUNCH-02 — reset de produção preservando admin(s) permanentes.
 * Limpeza de dados operacionais em uma única transação Prisma.
 */
import fs from "fs";
import path from "path";
import type { PrismaClient, Prisma } from "@prisma/client";

export const PRESERVE_ADMIN_NAME = "Victor Pereira Ramos";

export type LaunchResetResult = {
  mode: "dry-run" | "execute";
  preservedAdmin: { id: string; email: string; nomeCompleto: string } | null;
  usersBefore: number;
  usersAfter: number;
  deleted: Record<string, number>;
  uploadsRemoved: number;
  reportFilesRemoved: number;
  warnings: string[];
};

export const PRESERVE_ADMIN_EMAILS = new Set([
  "thouse.rec.tremv@gmail.com",
  "tremv03021@gmail.com",
  "vicperra@gmail.com",
]);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isPreserveAdminEmail(email: string): boolean {
  return PRESERVE_ADMIN_EMAILS.has(normalizeEmail(email));
}

function preserveEmailWhere(): Prisma.UserWhereInput {
  return {
    OR: [...PRESERVE_ADMIN_EMAILS].map((email) => ({
      email: { equals: email, mode: "insensitive" as const },
    })),
  };
}

/**
 * Localiza o admin permanente a preservar.
 * Prioridade: e-mail allowlist + role ADMIN → nome normalizado + e-mail allowlist.
 * Sem fallback fraco (evita preservar ADMIN errado e apagar vicperra@gmail.com).
 */
export async function findPreservedAdmin(prisma: PrismaClient) {
  for (const email of PRESERVE_ADMIN_EMAILS) {
    const byEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, role: "ADMIN" },
      select: { id: true, email: true, nomeCompleto: true, foto: true, role: true },
    });
    if (byEmail) return byEmail;
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true, nomeCompleto: true, foto: true, role: true },
  });

  const byName = admins.find(
    (a) =>
      a.nomeCompleto.trim().toLowerCase() === PRESERVE_ADMIN_NAME.toLowerCase() &&
      isPreserveAdminEmail(a.email)
  );
  if (byName) return byName;

  return null;
}

/** Usuários removíveis: nunca o preservado, never e-mails allowlist, never role ADMIN. */
export async function findRemovableUsers(prisma: PrismaClient, preservedId: string) {
  return prisma.user.findMany({
    where: {
      AND: [
        { id: { not: preservedId } },
        { role: { not: "ADMIN" } },
        { NOT: preserveEmailWhere() },
      ],
    },
    select: { id: true, email: true, role: true },
  });
}

async function countAll(prisma: PrismaClient) {
  const [
    users,
    appointments,
    services,
    payments,
    coupons,
    userPlans,
    subscriptions,
    syncEvents,
    transitionHistory,
    paymentMetadata,
    sessions,
    loginLogs,
    chatSessions,
    userQuestions,
    accountDeletionLogs,
    passwordResetCodes,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.appointment.count(),
    prisma.service.count(),
    prisma.payment.count(),
    prisma.coupon.count(),
    prisma.userPlan.count(),
    prisma.subscription.count(),
    prisma.synchronizationEvent.count(),
    prisma.domainTransitionHistory.count(),
    prisma.paymentMetadata.count(),
    prisma.session.count(),
    prisma.loginLog.count(),
    prisma.chatSession.count(),
    prisma.userQuestion.count(),
    prisma.accountDeletionLog.count(),
    prisma.passwordResetCode.count(),
  ]);
  return {
    users,
    appointments,
    services,
    payments,
    coupons,
    userPlans,
    subscriptions,
    synchronizationEvents: syncEvents,
    domainTransitionHistory: transitionHistory,
    paymentMetadata,
    sessions,
    loginLogs,
    chatSessions,
    userQuestions,
    accountDeletionLogs,
    passwordResetCodes,
  };
}

function cleanTemporaryReports(root: string, execute: boolean): number {
  const dir = path.resolve(root, "reports/domain-guardian");
  if (!fs.existsSync(dir)) return 0;
  const patterns = [
    /^sim\d+-last-run\.json$/,
    /^rc\d+-execution.*\.json$/,
    /^launch01-reset.*\.json$/,
    /-certify-run.*\.log$/,
  ];
  let removed = 0;
  for (const entry of fs.readdirSync(dir)) {
    if (!patterns.some((re) => re.test(entry))) continue;
    if (execute) fs.unlinkSync(path.join(dir, entry));
    removed++;
  }
  return removed;
}

function cleanUploads(root: string, preserveAvatarUrl: string | null | undefined, execute: boolean): number {
  const uploadsRoot = path.resolve(root, "public/uploads");
  if (!fs.existsSync(uploadsRoot)) return 0;
  let removed = 0;
  const preserveFile = preserveAvatarUrl
    ? path.basename(preserveAvatarUrl.replace(/^\//, ""))
    : null;

  for (const folder of ["avatars", "deliveries", "tmp", "temp", "homolog"]) {
    const target = path.join(uploadsRoot, folder);
    if (!fs.existsSync(target)) continue;
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (folder === "avatars" && preserveFile && entry.name === preserveFile) continue;
      if (execute) fs.unlinkSync(path.join(target, entry.name));
      removed++;
    }
  }
  return removed;
}

/**
 * Ordem de exclusão (respeita FKs Prisma):
 * Sync/History → Chat → Logs/Sessions → Coupons → Subscriptions →
 * Services → Appointments → UserPlans → Payments → PaymentMetadata →
 * AccountDeletion/PasswordReset → Users (não-ADMIN)
 */
async function executeAtomicCleanup(
  prisma: PrismaClient,
  preserved: { id: string; email: string },
  otherIds: string[]
): Promise<Record<string, number>> {
  return prisma.$transaction(
    async (tx) => {
      const deleted: Record<string, number> = {};

      // Guarda final: nenhum ID removível pode ser o admin preservado / allowlist / ADMIN
      if (otherIds.includes(preserved.id)) {
        throw new Error("LAUNCH-02 ABORT: otherIds contém o admin preservado");
      }
      if (otherIds.length) {
        const doomed = await tx.user.findMany({
          where: { id: { in: otherIds } },
          select: { id: true, email: true, role: true },
        });
        for (const u of doomed) {
          if (u.id === preserved.id || isPreserveAdminEmail(u.email) || u.role === "ADMIN") {
            throw new Error(
              `LAUNCH-02 ABORT: tentativa de remover usuário protegido (${u.email} / ${u.role})`
            );
          }
        }
      }

      deleted.synchronizationEvents = (await tx.synchronizationEvent.deleteMany({})).count;
      deleted.domainTransitionHistory = (await tx.domainTransitionHistory.deleteMany({})).count;

      deleted.chatSessions = (await tx.chatSession.deleteMany({})).count;

      deleted.userQuestions = (await tx.userQuestion.deleteMany({})).count;
      deleted.loginLogs = (await tx.loginLog.deleteMany({})).count;
      // Sessões de todos (admin precisará re-login)
      deleted.sessions = (await tx.session.deleteMany({})).count;

      // Coupons antes de Payment / UserPlan (FKs paymentId / userPlanId)
      deleted.coupons = (await tx.coupon.deleteMany({})).count;

      // Subscription antes de UserPlan (FK userPlanId)
      deleted.subscriptions = (await tx.subscription.deleteMany({})).count;

      deleted.services = (await tx.service.deleteMany({})).count;
      deleted.appointments = (await tx.appointment.deleteMany({})).count;
      deleted.userPlans = (await tx.userPlan.deleteMany({})).count;
      deleted.payments = (await tx.payment.deleteMany({})).count;
      deleted.paymentMetadata = (await tx.paymentMetadata.deleteMany({})).count;

      deleted.accountDeletionLogs = (await tx.accountDeletionLog.deleteMany({})).count;
      deleted.passwordResetCodes = (await tx.passwordResetCode.deleteMany({})).count;

      if (otherIds.length) {
        deleted.users = (
          await tx.user.deleteMany({
            where: {
              AND: [
                { id: { in: otherIds } },
                { id: { not: preserved.id } },
                { role: { not: "ADMIN" } },
                { NOT: preserveEmailWhere() },
              ],
            },
          })
        ).count;
      } else {
        deleted.users = 0;
      }

      // Pós-condição: admin allowlist ainda existe
      const stillThere = await tx.user.findFirst({
        where: {
          AND: [{ id: preserved.id }, { role: "ADMIN" }, preserveEmailWhere()],
        },
        select: { id: true },
      });
      if (!stillThere) {
        throw new Error("LAUNCH-02 ABORT: admin preservado ausente após limpeza — rollback");
      }

      const adminCount = await tx.user.count({ where: { role: "ADMIN" } });
      if (adminCount < 1) {
        throw new Error("LAUNCH-02 ABORT: nenhum ADMIN restante — rollback");
      }

      return deleted;
    },
    {
      maxWait: 15_000,
      timeout: 180_000,
    }
  );
}

export async function runLaunchReset(
  prisma: PrismaClient,
  opts: { execute: boolean; root?: string }
): Promise<LaunchResetResult> {
  const root = opts.root || process.cwd();
  const warnings: string[] = [];
  const deleted: Record<string, number> = {};

  const preserved = await findPreservedAdmin(prisma);
  if (!preserved) {
    return {
      mode: opts.execute ? "execute" : "dry-run",
      preservedAdmin: null,
      usersBefore: await prisma.user.count(),
      usersAfter: await prisma.user.count(),
      deleted,
      uploadsRemoved: 0,
      reportFilesRemoved: 0,
      warnings: [
        "ADMIN permanente (allowlist de e-mail + role ADMIN) não encontrado — reset abortado",
      ],
    };
  }

  if (!isPreserveAdminEmail(preserved.email) || preserved.role !== "ADMIN") {
    return {
      mode: opts.execute ? "execute" : "dry-run",
      preservedAdmin: null,
      usersBefore: await prisma.user.count(),
      usersAfter: await prisma.user.count(),
      deleted,
      uploadsRemoved: 0,
      reportFilesRemoved: 0,
      warnings: [
        `Candidato a preservação rejeitado (email=${preserved.email}, role=${preserved.role}) — reset abortado`,
      ],
    };
  }

  const before = await countAll(prisma);
  deleted._before = before.users;

  const otherUsers = await findRemovableUsers(prisma, preserved.id);
  const otherIds = otherUsers.map((u) => u.id);

  // Contagem de ADMINs extras (não removidos — permanente)
  const extraAdmins = await prisma.user.count({
    where: {
      AND: [{ role: "ADMIN" }, { id: { not: preserved.id } }],
    },
  });
  if (extraAdmins > 0) {
    warnings.push(
      `${extraAdmins} usuário(s) ADMIN adicional(is) serão preservados (política ADMIN permanente)`
    );
  }

  if (opts.execute) {
    const txDeleted = await executeAtomicCleanup(prisma, preserved, otherIds);
    Object.assign(deleted, txDeleted);
  } else {
    deleted.synchronizationEvents = before.synchronizationEvents;
    deleted.domainTransitionHistory = before.domainTransitionHistory;
    deleted.chatSessions = before.chatSessions;
    deleted.userQuestions = before.userQuestions;
    deleted.loginLogs = before.loginLogs;
    deleted.sessions = before.sessions;
    deleted.coupons = before.coupons;
    deleted.subscriptions = before.subscriptions;
    deleted.services = before.services;
    deleted.appointments = before.appointments;
    deleted.userPlans = before.userPlans;
    deleted.payments = before.payments;
    deleted.paymentMetadata = before.paymentMetadata;
    deleted.accountDeletionLogs = before.accountDeletionLogs;
    deleted.passwordResetCodes = before.passwordResetCodes;
    deleted.users = otherUsers.length;
  }

  const uploadsRemoved = cleanUploads(root, preserved.foto, opts.execute);
  const reportFilesRemoved = cleanTemporaryReports(root, opts.execute);

  const expectedUsersAfter = opts.execute
    ? await prisma.user.count()
    : before.users - otherUsers.length;

  if (opts.execute) {
    const adminStill = await prisma.user.findFirst({
      where: { id: preserved.id, role: "ADMIN" },
      select: { id: true, email: true },
    });
    if (!adminStill || !isPreserveAdminEmail(adminStill.email)) {
      warnings.push("CRÍTICO: admin preservado não encontrado após execute");
    }
    if (expectedUsersAfter < 1) {
      warnings.push(`Esperado ≥1 usuário após reset; encontrado ${expectedUsersAfter}`);
    }
  }

  return {
    mode: opts.execute ? "execute" : "dry-run",
    preservedAdmin: {
      id: preserved.id,
      email: preserved.email,
      nomeCompleto: preserved.nomeCompleto,
    },
    usersBefore: before.users,
    usersAfter: expectedUsersAfter,
    deleted,
    uploadsRemoved,
    reportFilesRemoved,
    warnings,
  };
}
