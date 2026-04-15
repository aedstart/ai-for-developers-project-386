import prisma from '../src/prisma';

async function seed() {
  console.log('Seeding database...');

  // Check if default event types exist
  const existingTypes = await prisma.eventType.findMany();
  
  if (existingTypes.length === 0) {
    // Create default event types
    await prisma.eventType.createMany({
      data: [
        {
          name: 'Встреча 15 минут',
          description: 'Короткая встреча на 15 минут',
          duration: 15,
        },
        {
          name: 'Встреча 30 минут',
          description: 'Стандартная встреча на 30 минут',
          duration: 30,
        },
      ],
    });
    console.log('Created default event types');
  }

  // Check if working hours exist
  const existingWorkingHours = await prisma.workingHours.findFirst();
  
  if (!existingWorkingHours) {
    // Create default working hours (9:00 - 18:00)
    await prisma.workingHours.create({
      data: {
        startTime: '09:00',
        endTime: '18:00',
      },
    });
    console.log('Created default working hours');
  }

  console.log('Seeding completed!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
