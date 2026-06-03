"use client";

import {
  NewNavbar,
  CinematicHeroSection,
  StatsSection,
  WelcomeSection,
  LeadershipSection,
  ThoughtSection,
  StudentAchievementsSection,
  NewFooter,
} from "@/components";

export default function HomePage() {
  return (
    <>
      <NewNavbar />
      <main>
        <CinematicHeroSection />
        <StatsSection />
        <WelcomeSection />
        <LeadershipSection />
        <ThoughtSection />
        <StudentAchievementsSection />
      </main>
      <NewFooter />
    </>
  );
}
