import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { computeCheckpointStatus } from '../services/statusService';
import { createAlert } from '../services/alertService';

export function startIntervalChecker() {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('🔍 [CRON] Running interval checker...');
    const now = new Date();

    try {
      // Get all active assignments
      const activeAssignments = await prisma.guardAssignment.findMany({
        where: {
          startTime: {
            lte: now,
          },
          endTime: {
            gte: now,
          },
        },
        include: {
          premise: {
            include: {
              checkpoints: true,
            },
          },
        },
      });

      for (const assignment of activeAssignments) {
        for (const checkpoint of assignment.premise.checkpoints) {
          try {
            // Compute status for this guard + assignment + checkpoint
            const status = await computeCheckpointStatus(
              assignment.guardId,
              checkpoint.id,
              assignment.id
            );

            // Check for ORANGE alert
            if (status === 'ORANGE' && !checkpoint.orangeAlertSent) {
              await createAlert(
                'ORANGE',
                assignment.guardId,
                checkpoint.id,
                assignment.id,
                `Checkpoint "${checkpoint.name}" is overdue. Status: ORANGE`
              );

              // Mark orange alert as sent
              await prisma.checkpoint.update({
                where: { id: checkpoint.id },
                data: { orangeAlertSent: true },
              });

              console.log(
                `⚠️ [ALERT] ORANGE alert created for checkpoint ${checkpoint.name} (guard: ${assignment.guardId})`
              );
            }

            // Check for RED alert
            if (status === 'RED' && !checkpoint.redAlertSent) {
              await createAlert(
                'RED',
                assignment.guardId,
                checkpoint.id,
                assignment.id,
                `Checkpoint "${checkpoint.name}" is critically overdue. Status: RED`
              );

              // Mark red alert as sent
              await prisma.checkpoint.update({
                where: { id: checkpoint.id },
                data: { redAlertSent: true },
              });

              console.log(
                `🚨 [ALERT] RED alert created for checkpoint ${checkpoint.name} (guard: ${assignment.guardId})`
              );
            }

            // Reset flags when status goes back to GREEN
            if (status === 'GREEN') {
              if (checkpoint.orangeAlertSent || checkpoint.redAlertSent) {
                await prisma.checkpoint.update({
                  where: { id: checkpoint.id },
                  data: {
                    orangeAlertSent: false,
                    redAlertSent: false,
                  },
                });
              }
            }
          } catch (error) {
            console.error(
              `Error checking status for checkpoint ${checkpoint.id} in assignment ${assignment.id}:`,
              error
            );
          }
        }
      }

      console.log(`✅ [CRON] Interval check completed. Checked ${activeAssignments.length} active assignments.`);
    } catch (error) {
      console.error('❌ [CRON] Error in interval checker:', error);
    }
  });

  console.log('⏰ [CRON] Interval checker started (runs every 5 minutes)');
}

