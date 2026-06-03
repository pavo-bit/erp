const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'ssvmcollegesquare1987@gmail.com';
  const password = 'g937070302';
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    // Update password if user exists
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });
    console.log(`Updated existing user: ${email}`);
  } else {
    // Create new admin user
    await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
        name: 'Admin',
        role: 'ADMIN',
      },
    });
    console.log(`Created new admin user: ${email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
