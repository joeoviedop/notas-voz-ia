import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data (be careful in production!)
  if (process.env.NODE_ENV !== 'production') {
    await prisma.auditEvent.deleteMany();
    await prisma.action.deleteMany();
    await prisma.summary.deleteMany();
    await prisma.transcript.deleteMany();
    await prisma.media.deleteMany();
    await prisma.note.deleteMany();
    await prisma.passwordReset.deleteMany();
    await prisma.user.deleteMany();
    await prisma.processingJob.deleteMany();
    await prisma.systemConfig.deleteMany();
  }

  // Create test user
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const testUser = await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: hashedPassword,
    },
  });

  console.log('✅ Created test user:', testUser.email);

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: await bcrypt.hash('admin123', 12),
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create sample notes with different statuses
  const note1 = await prisma.note.create({
    data: {
      title: 'Reunión de planificación del proyecto MVP',
      status: 'ready',
      tags: ['trabajo', 'proyecto', 'mvp'],
      userId: testUser.id,
      media: {
        create: {
          filename: 'reunion-mvp-2024-01-15.mp3',
          originalName: 'Reunión MVP 15 Enero.mp3',
          size: 2456789,
          contentType: 'audio/mpeg',
          storageKey: `audio/${testUser.id}/${nanoid()}/reunion-mvp.mp3`,
        },
      },
      transcript: {
        create: {
          text: 'Buenos días equipo. Hoy vamos a revisar el progreso del MVP y definir las próximas tareas. Primero, necesitamos completar la documentación técnica para el viernes. Segundo, el equipo de QA debe revisar los casos de prueba antes del lunes. Tercero, debemos coordinar con el equipo de diseño para los ajustes finales de la interfaz.',
          language: 'es',
          confidence: 0.95,
          provider: 'mock',
        },
      },
      summary: {
        create: {
          tlDr: 'Reunión de seguimiento del MVP con 3 acciones principales: documentación técnica, casos de prueba QA y ajustes de UI.',
          bullets: [
            'Completar documentación técnica para el viernes',
            'QA debe revisar casos de prueba antes del lunes',
            'Coordinar ajustes finales de UI con diseño',
          ],
          provider: 'mock',
        },
      },
      actions: {
        create: [
          {
            text: 'Completar documentación técnica del MVP',
            done: false,
            dueSuggested: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            userId: testUser.id,
          },
          {
            text: 'Revisar casos de prueba con equipo QA',
            done: false,
            dueSuggested: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
            userId: testUser.id,
          },
          {
            text: 'Coordinar ajustes de UI con diseño',
            done: false,
            dueSuggested: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            userId: testUser.id,
          },
        ],
      },
    },
  });

  const note2 = await prisma.note.create({
    data: {
      title: 'Ideas para nuevas funcionalidades',
      status: 'uploaded',
      tags: ['ideas', 'desarrollo', 'features'],
      userId: testUser.id,
      media: {
        create: {
          filename: 'brainstorm-ideas-2024.mp3',
          originalName: 'Brainstorm Ideas.mp3',
          size: 1234567,
          contentType: 'audio/mpeg',
          storageKey: `audio/${testUser.id}/${nanoid()}/brainstorm-ideas.mp3`,
        },
      },
    },
  });

  const note3 = await prisma.note.create({
    data: {
      title: 'Notas de la llamada con el cliente',
      status: 'transcribing',
      tags: ['cliente', 'feedback', 'reunión'],
      userId: testUser.id,
      media: {
        create: {
          filename: 'cliente-feedback-2024.wav',
          originalName: 'Llamada Cliente Feedback.wav',
          size: 3456789,
          contentType: 'audio/wav',
          storageKey: `audio/${testUser.id}/${nanoid()}/cliente-feedback.wav`,
        },
      },
    },
  });

  // Create some audit events
  await prisma.auditEvent.createMany({
    data: [
      {
        type: 'user_created',
        userId: testUser.id,
        correlationId: nanoid(),
      },
      {
        type: 'note_created',
        userId: testUser.id,
        noteId: note1.id,
        correlationId: nanoid(),
      },
      {
        type: 'media_uploaded',
        userId: testUser.id,
        noteId: note1.id,
        correlationId: nanoid(),
      },
      {
        type: 'transcription_completed',
        userId: testUser.id,
        noteId: note1.id,
        correlationId: nanoid(),
      },
      {
        type: 'summarization_completed',
        userId: testUser.id,
        noteId: note1.id,
        correlationId: nanoid(),
      },
    ],
  });

  // Create system config
  await prisma.systemConfig.createMany({
    data: [
      {
        key: 'max_file_size_mb',
        value: '25',
      },
      {
        key: 'supported_audio_types',
        value: 'audio/mpeg,audio/wav,audio/mp4,audio/aac',
      },
      {
        key: 'default_stt_provider',
        value: 'mock',
      },
      {
        key: 'default_llm_provider',
        value: 'mock',
      },
      {
        key: 'transcription_timeout_minutes',
        value: '10',
      },
      {
        key: 'summarization_timeout_minutes',
        value: '5',
      },
    ],
  });

  console.log('✅ Created sample notes and data');
  
  // Log summary
  const userCount = await prisma.user.count();
  const noteCount = await prisma.note.count();
  const actionCount = await prisma.action.count();
  const auditCount = await prisma.auditEvent.count();

  console.log('\n📊 Database seeded successfully:');
  console.log(`   Users: ${userCount}`);
  console.log(`   Notes: ${noteCount}`);
  console.log(`   Actions: ${actionCount}`);
  console.log(`   Audit Events: ${auditCount}`);
  
  console.log('\n🔐 Test credentials:');
  console.log('   Email: test@example.com');
  console.log('   Password: password123');
  console.log('   Admin: admin@example.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });