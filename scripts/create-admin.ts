import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@tasktracker.com';
  const password = 'admin123';
  const name = 'Admin User';

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    console.log('❌ Admin user already exists with email:', email);
    console.log('   Please use a different email or delete the existing user.');
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role: Role.ADMIN,
      // organizationId is null for admin users
    },
  });

  console.log('✅ Admin user created successfully!');
  console.log('\n📋 Admin Credentials:');
  console.log('   Email:', admin.email);
  console.log('   Password:', password);
  console.log('   Role:', admin.role);
  console.log('\n⚠️  Please change the password after first login!');
}

createAdmin()
  .catch((error) => {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
