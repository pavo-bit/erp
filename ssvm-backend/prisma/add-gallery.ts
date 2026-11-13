import prisma from '../src/lib/prisma';



async function main() {
  console.log("Adding missing gallery images...");

  const newImages = [
    // Events (needs 6 more)
    { title: "Annual Day 2023", category: "Events", imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop" },
    { title: "Republic Day", category: "Events", imageUrl: "https://images.unsplash.com/photo-1533174000222-ed5efa3c0802?w=800&h=600&fit=crop" },
    { title: "Teachers Day", category: "Events", imageUrl: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&h=600&fit=crop" },
    { title: "Childrens Day", category: "Events", imageUrl: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&h=600&fit=crop" },
    { title: "Alumni Meet", category: "Events", imageUrl: "https://images.unsplash.com/photo-1523580494112-029415446059?w=800&h=600&fit=crop" },
    { title: "Winter Carnival", category: "Events", imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop" },

    // Sports (needs 6 more)
    { title: "Cricket Match", category: "Sports", imageUrl: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&h=600&fit=crop" },
    { title: "Athletics Meet", category: "Sports", imageUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&h=600&fit=crop" },
    { title: "Volleyball", category: "Sports", imageUrl: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&h=600&fit=crop" },
    { title: "Badminton", category: "Sports", imageUrl: "https://images.unsplash.com/photo-1622279457486-69d73ce183a6?w=800&h=600&fit=crop" },
    { title: "Chess Tournament", category: "Sports", imageUrl: "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&h=600&fit=crop" },
    { title: "Table Tennis", category: "Sports", imageUrl: "https://images.unsplash.com/photo-1534158914592-062992fbe900?w=800&h=600&fit=crop" },

    // Academic (needs 6 more)
    { title: "Physics Lab", category: "Academic", imageUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=600&fit=crop" },
    { title: "Library Study", category: "Academic", imageUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&h=600&fit=crop" },
    { title: "Computer Science", category: "Academic", imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=600&fit=crop" },
    { title: "Biology Class", category: "Academic", imageUrl: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&h=600&fit=crop" },
    { title: "Debate Competition", category: "Academic", imageUrl: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=600&fit=crop" },
    { title: "Robotics Workshop", category: "Academic", imageUrl: "https://images.unsplash.com/photo-1561557944-6e7860d1a7eb?w=800&h=600&fit=crop" },
  ];

  for (let i = 0; i < newImages.length; i++) {
    const img = newImages[i];
    await prisma.galleryImage.create({
      data: {
        title: img.title,
        category: img.category,
        imageUrl: img.imageUrl,
        sortOrder: 100 + i,
      }
    });
  }

  console.log("Added 18 new images!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
