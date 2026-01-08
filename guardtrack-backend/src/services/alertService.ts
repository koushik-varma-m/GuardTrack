import { prisma } from '../config/prisma';
import { AlertType } from '@prisma/client';

type AlertWithRelations = {
  id: string;
  type: AlertType;
  guardId: string;
  checkpointId: string;
  assignmentId: string;
  triggeredAt: Date;
  status: string;
  message: string | null;
  createdAt: Date;
  guard: { id: string; name: string; email: string; phone: string | null };
  checkpoint: { id: string; name: string };
  assignment: { id: string; startTime: Date; endTime: Date; premiseId: string };
  escalateRequested: boolean;
  escalateNote: string | null;
  escalateBy: string | null;
  escalatedAt: Date | null;
};

export async function createAlert(
  type: AlertType,
  guardId: string,
  checkpointId: string,
  assignmentId: string,
  message?: string
): Promise<AlertWithRelations> {
  const alert = await prisma.alert.create({
    data: {
      type,
      guardId,
      checkpointId,
      assignmentId,
      triggeredAt: new Date(),
      status: 'OPEN',
      message: message || null,
    },
    include: {
      guard: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      checkpoint: {
        select: {
          id: true,
          name: true,
        },
      },
      assignment: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          premiseId: true,
        },
      },
    },
  });

  // Send email notification (stub for now)
  sendEmailStub(alert);
  // Notify guard directly (stub for now)
  sendGuardNotificationStub(alert);
  // Notify analysts for the premise on RED
  if (alert.type === 'RED') {
    await notifyAnalystsStub(alert);
  }

  return alert;
}

export function sendEmailStub(alert: AlertWithRelations): void {
  console.log('📧 [EMAIL STUB] Alert Notification:');
  console.log(`   Type: ${alert.type}`);
  console.log(`   Guard: ${alert.guard.name} (${alert.guard.email})`);
  console.log(`   Checkpoint: ${alert.checkpoint.name}`);
  console.log(`   Assignment: ${alert.assignment.id}`);
  console.log(`   Triggered At: ${alert.triggeredAt}`);
  console.log(`   Message: ${alert.message || 'No message'}`);
  console.log('---');
}

export function sendGuardNotificationStub(alert: AlertWithRelations): void {
  if (alert.type !== 'ORANGE' && alert.type !== 'RED') return;
  console.log('📲 [GUARD NOTIFY STUB]');
  console.log(`   Guard: ${alert.guard.name} (${alert.guard.email}${alert.guard.phone ? `, ${alert.guard.phone}` : ''})`);
  console.log(`   Type: ${alert.type}`);
  console.log(`   Checkpoint: ${alert.checkpoint.name}`);
  console.log(`   Message: ${alert.message || 'No message'}`);
  console.log('   Action: Would send in-app alert and SMS to guard.');
  console.log('---');
}

export async function notifyAnalystsStub(alert: AlertWithRelations): Promise<void> {
  try {
    const analysts = await prisma.analystAssignment.findMany({
      where: { premiseId: alert.assignment.premiseId },
      include: {
        analyst: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });
    if (!analysts.length) return;
    analysts.forEach(({ analyst }) => {
      console.log('📧 [ANALYST NOTIFY STUB]');
      console.log(`   Analyst: ${analyst.name} (${analyst.email}${analyst.phone ? `, ${analyst.phone}` : ''})`);
      console.log(`   RED alert at ${alert.checkpoint.name}`);
      console.log(`   Message: ${alert.message || 'No message'}`);
      console.log('   Action: Would send email/SMS/in-app notification to analyst.');
      console.log('---');
    });
  } catch (error) {
    console.error('Failed to notify analysts (stub):', error);
  }
}
