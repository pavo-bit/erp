import prisma from './src/lib/prisma';

import express from 'express';
import { app } from './src/index'; // Warning: this might trigger app.listen if index.ts executes it unconditionally

async function main() {
  // Count models
  // @ts-ignore
  const models = Object.keys(prisma._baseDmmf.modelMap);
  console.log(`\n========================================`);
  console.log(`TOTAL PRISMA MODELS: ${models.length}`);
  console.log(`========================================\n`);
  
  // Count routes
  let routeCount = 0;
  function countRoutes(layer: any, currentPath: string = '') {
    if (layer.route) {
      routeCount++;
    } else if (layer.name === 'router' && layer.handle.stack) {
      layer.handle.stack.forEach((stackItem: any) => {
        countRoutes(stackItem, currentPath);
      });
    }
  }

  app._router.stack.forEach((layer: any) => countRoutes(layer));
  
  console.log(`========================================`);
  console.log(`TOTAL EXPRESS ROUTES: ${routeCount}`);
  console.log(`========================================\n`);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
