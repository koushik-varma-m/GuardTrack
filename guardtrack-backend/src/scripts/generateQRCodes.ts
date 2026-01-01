import { prisma } from '../config/prisma';
import { generateCheckpointQrPng } from '../utils/qr';
import fs from 'fs';
import path from 'path';

async function generateQRCodesForAllCheckpoints() {
  try {
    console.log('🔍 Fetching all checkpoints...');
    
    const checkpoints = await prisma.checkpoint.findMany({
      include: {
        premise: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (checkpoints.length === 0) {
      console.log('❌ No checkpoints found in the database.');
      return;
    }

    console.log(`📋 Found ${checkpoints.length} checkpoint(s)`);

    // Create QR codes directory if it doesn't exist
    const qrCodesDir = path.join(__dirname, '../../qr-codes');
    if (!fs.existsSync(qrCodesDir)) {
      fs.mkdirSync(qrCodesDir, { recursive: true });
    }

    console.log('\n📸 Generating QR codes...\n');

    for (const checkpoint of checkpoints) {
      try {
        // Generate QR code buffer
        const qrBuffer = await generateCheckpointQrPng(
          checkpoint.id,
          checkpoint.premiseId
        );

        // Generate filename
        const filename = `checkpoint-${checkpoint.name.replace(/[^a-z0-9]/gi, '_')}-${checkpoint.id}.png`;
        const filepath = path.join(qrCodesDir, filename);

        // Save QR code to file
        fs.writeFileSync(filepath, qrBuffer);

        // Also generate the JSON payload for easy testing
        const { generateCheckpointQrPayload } = await import('../utils/qr');
        const payload = await generateCheckpointQrPayload(
          checkpoint.id,
          checkpoint.premiseId
        );
        const jsonFilename = `checkpoint-${checkpoint.name.replace(/[^a-z0-9]/gi, '_')}-${checkpoint.id}.json`;
        const jsonFilepath = path.join(qrCodesDir, jsonFilename);
        fs.writeFileSync(jsonFilepath, payload);

        console.log(`✅ Generated QR code for: ${checkpoint.name}`);
        console.log(`   Premise: ${checkpoint.premise.name}`);
        console.log(`   File: ${filename}`);
        console.log(`   JSON: ${jsonFilename}`);
        console.log(`   Payload: ${payload}\n`);
      } catch (error) {
        console.error(`❌ Error generating QR code for checkpoint ${checkpoint.name}:`, error);
      }
    }

    console.log(`\n✨ All QR codes generated successfully!`);
    console.log(`📁 QR codes saved to: ${qrCodesDir}`);
    console.log(`\n💡 You can now use these QR codes to test scanning.`);
    console.log(`   Each QR code contains a JSON payload with checkpointId, premiseId, token, and exp.`);
  } catch (error) {
    console.error('❌ Error generating QR codes:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateQRCodesForAllCheckpoints();

