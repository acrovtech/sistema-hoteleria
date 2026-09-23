import 'dotenv/config';
import { PrismaClient, Plan, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const hotel = await prisma.hotel.upsert({
    where: { slug: 'hotel-demo' },
    update: {},
    create: {
      slug: 'hotel-demo',
      name: 'Hotel Demo',
      plan: Plan.ADMIN_ONLY,
    },
  });

  await prisma.user.upsert({
    where: { email: 'superadmin@hotel.test' },
    update: {
      role: Role.SUPERADMIN,
      hotelId: null,
    },
    create: {
      email: 'superadmin@hotel.test',
      password: await bcrypt.hash('SuperAdmin123!', 10),
      role: Role.SUPERADMIN,
      hotelId: null,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@hotel.test' },
    update: {
      role: Role.ADMIN_HOTEL,
      hotelId: hotel.id,
    },
    create: {
      email: 'admin@hotel.test',
      password: await bcrypt.hash('Admin123!', 10),
      role: Role.ADMIN_HOTEL,
      hotelId: hotel.id,
    },
  });

  console.log('Seed completado: hotel-demo, superadmin@hotel.test, admin@hotel.test');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
