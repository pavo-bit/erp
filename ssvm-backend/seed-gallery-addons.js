require('tsx/cjs');
const prisma = require('./src/lib/prisma').default;

async function main() {
  const images = [
    {
      title: 'Sishuvatika Play Area',
      category: 'Sishuvatika',
      imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1000&auto=format&fit=crop',
      description: 'Children enjoying the outdoor play area in Sishuvatika.'
    },
    {
      title: 'Sishuvatika Learning',
      category: 'Sishuvatika',
      imageUrl: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?q=80&w=1000&auto=format&fit=crop',
      description: 'Interactive learning sessions for our youngest students.'
    },
    {
      title: 'NCC Parade',
      category: 'NCC/Scout/Guide',
      imageUrl: 'https://images.unsplash.com/photo-1563604313264-b6bcba951914?q=80&w=1000&auto=format&fit=crop',
      description: 'Annual NCC parade and flag hoisting ceremony.'
    },
    {
      title: 'Scout Camp',
      category: 'NCC/Scout/Guide',
      imageUrl: 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?q=80&w=1000&auto=format&fit=crop',
      description: 'Students participating in a weekend scouting camp.'
    }
  ];

  console.log('Seeding new gallery categories...');
  
  for (const img of images) {
    await prisma.galleryImage.create({
      data: img
    });
    console.log(`Created image: ${img.title}`);
  }
  
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
