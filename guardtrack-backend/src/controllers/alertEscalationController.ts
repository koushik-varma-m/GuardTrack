import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendEmailStub } from '../services/alertService';

export async function escalateAlert(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { note } = req.body as { note?: string };
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!note || note.trim().length < 3) {
      return res.status(400).json({ error: 'A note (min 3 chars) is required to escalate' });
    }

    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        guard: { select: { id: true, name: true, email: true } },
        checkpoint: { select: { id: true, name: true } },
        assignment: {
          select: { id: true, premiseId: true },
        },
      },
    });

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    if (alert.type !== 'RED') {
      return res.status(400).json({ error: 'Only RED alerts can be escalated' });
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: {
        escalateRequested: true,
        escalateNote: note.trim(),
        escalateBy: userId,
        escalatedAt: new Date(),
      },
      include: {
        guard: { select: { id: true, name: true, email: true, phone: true } },
        checkpoint: { select: { id: true, name: true } },
        assignment: { select: { id: true, premiseId: true, startTime: true, endTime: true } },
      },
    });

    // Notify admins (stub)
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, name: true, email: true },
    });
    admins.forEach((admin) => {
      console.log('📢 [ADMIN ESCALATION STUB]', admin.email, 'needs to assign a new guard.');
      console.log('   Note:', note.trim());
    });

    res.json(updated);
  } catch (error) {
    console.error('Escalate alert error:', error);
    res.status(500).json({ error: 'Failed to escalate alert' });
  }
}
