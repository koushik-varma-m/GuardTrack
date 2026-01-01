/* eslint-disable no-console */
// Demo seeding for guards, analysts, premises, checkpoints, and assignments.
// Run: npm run seed:demo

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function upsertUsers() {
  const users = [
    { name: 'Admin Demo', email: 'admin.demo@example.com', role: 'ADMIN', password: 'Admin@123!' },
    { name: 'Analyst Alpha', email: 'analyst.alpha@example.com', role: 'ANALYST', password: 'Analyst@123!' },
    { name: 'Analyst Beta', email: 'analyst.beta@example.com', role: 'ANALYST', password: 'Analyst@123!' },
    { name: 'Guard One', email: 'guard.one@example.com', role: 'GUARD', password: 'Guard@123!' },
    { name: 'Guard Two', email: 'guard.two@example.com', role: 'GUARD', password: 'Guard@123!' },
  ];

  const results = [];
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    const upserted = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, passwordHash },
      create: { name: user.name, email: user.email, role: user.role, passwordHash },
    });
    results.push(upserted);
  }
  return results;
}

async function upsertPremises() {
  // Premise 1 uses the ID from existing QR codes so those files keep working.
  const premise1Id = 'cmj1oj7v600049v6bctjrf2vz';
  const premise1 = await prisma.premise.upsert({
    where: { id: premise1Id },
    update: { name: 'Demo HQ', address: '123 Demo Street' },
    create: {
      id: premise1Id,
      name: 'Demo HQ',
      address: '123 Demo Street',
    },
  });

  // Name is not unique, so use a manual find+create/update
  const existingPremise2 = await prisma.premise.findFirst({
    where: { name: 'West Wing Yard' },
  });

  const premise2 = existingPremise2
    ? await prisma.premise.update({
        where: { id: existingPremise2.id },
        data: { address: '500 Yard Road' },
      })
    : await prisma.premise.create({
        data: {
          name: 'West Wing Yard',
          address: '500 Yard Road',
        },
      });

  return { premise1, premise2 };
}

async function upsertCheckpoints(premise1Id, premise2Id) {
  const checkpoints = [
    {
      id: 'cmj7pcw960003vdmhxmcxmrbc',
      premiseId: premise1Id,
      name: 'Lobby North',
      description: 'Main lobby entrance',
      xCoord: 10,
      yCoord: 10,
      intervalMinutes: 1,
      qrCodeValue: 'checkpoint-Demo_1-cmj7pcw960003vdmhxmcxmrbc',
    },
    {
      id: 'cmj7pda140005vdmh3v8rl3f2',
      premiseId: premise1Id,
      name: 'Loading Bay',
      description: 'Rear loading dock',
      xCoord: 70,
      yCoord: 30,
      intervalMinutes: 1,
      qrCodeValue: 'checkpoint-Demo_2-cmj7pda140005vdmh3v8rl3f2',
    },
    {
      premiseId: premise2Id,
      name: 'Yard Gate',
      description: 'Front gate checkpoint',
      xCoord: 20,
      yCoord: 20,
      intervalMinutes: 2,
      qrCodeValue: `checkpoint-${premise2Id}-gate`,
    },
    {
      premiseId: premise2Id,
      name: 'Generator Shed',
      description: 'Backup power area',
      xCoord: 60,
      yCoord: 60,
      intervalMinutes: 2,
      qrCodeValue: `checkpoint-${premise2Id}-gen`,
    },
  ];

  const upserts = [];
  for (const cp of checkpoints) {
    const upserted = await prisma.checkpoint.upsert({
      where: cp.id ? { id: cp.id } : { qrCodeValue: cp.qrCodeValue },
      update: {
        premiseId: cp.premiseId,
        name: cp.name,
        description: cp.description,
        xCoord: cp.xCoord,
        yCoord: cp.yCoord,
        intervalMinutes: cp.intervalMinutes,
        qrCodeValue: cp.qrCodeValue,
      },
      create: {
        id: cp.id,
        premiseId: cp.premiseId,
        name: cp.name,
        description: cp.description,
        xCoord: cp.xCoord,
        yCoord: cp.yCoord,
        intervalMinutes: cp.intervalMinutes,
        qrCodeValue: cp.qrCodeValue,
      },
    });
    upserts.push(upserted);
  }
  return upserts;
}

async function createAssignments({ guards, premises }) {
  const now = new Date();
  const start = new Date(now.getTime() - 15 * 60 * 1000); // started 15 min ago
  const end = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now

  const assignments = [
    {
      guardEmail: 'guard.one@example.com',
      premiseId: premises.premise1.id,
      intervalMinutes: 1,
      startTime: start,
      endTime: end,
    },
    {
      guardEmail: 'guard.two@example.com',
      premiseId: premises.premise2.id,
      intervalMinutes: 2,
      startTime: start,
      endTime: end,
    },
  ];

  const results = [];
  for (const a of assignments) {
    const guard = guards.find((g) => g.email === a.guardEmail);
    if (!guard) continue;

    const existing = await prisma.guardAssignment.findFirst({
      where: { guardId: guard.id, premiseId: a.premiseId },
    });

    const saved = existing
      ? await prisma.guardAssignment.update({
          where: { id: existing.id },
          data: {
            startTime: a.startTime,
            endTime: a.endTime,
            intervalMinutes: a.intervalMinutes,
          },
        })
      : await prisma.guardAssignment.create({
          data: {
            guardId: guard.id,
            premiseId: a.premiseId,
            startTime: a.startTime,
            endTime: a.endTime,
            intervalMinutes: a.intervalMinutes,
          },
        });

    results.push(saved);
  }
  return results;
}

async function assignAnalysts({ analysts, premises }) {
  const pairs = [
    { analystEmail: 'analyst.alpha@example.com', premiseId: premises.premise1.id },
    { analystEmail: 'analyst.beta@example.com', premiseId: premises.premise2.id },
  ];

  const results = [];
  for (const p of pairs) {
    const analyst = analysts.find((a) => a.email === p.analystEmail);
    if (!analyst) continue;

    const upserted = await prisma.analystAssignment.upsert({
      where: {
        analystId_premiseId: {
          analystId: analyst.id,
          premiseId: p.premiseId,
        },
      },
      update: {},
      create: {
        analystId: analyst.id,
        premiseId: p.premiseId,
      },
    });
    results.push(upserted);
  }
  return results;
}

async function main() {
  console.log('Seeding demo data...');
  const users = await upsertUsers();
  const guards = users.filter((u) => u.role === 'GUARD');
  const analysts = users.filter((u) => u.role === 'ANALYST');

  const premises = await upsertPremises();
  await upsertCheckpoints(premises.premise1.id, premises.premise2.id);

  await createAssignments({ guards, premises });
  await assignAnalysts({ analysts, premises });

  console.log('Demo users created/updated:');
  users.forEach((u) => console.log(`- ${u.role}: ${u.email}`));
  console.log('Premises ready:', premises.premise1.name, '/', premises.premise2.name);
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
