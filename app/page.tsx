import { Hero } from '@/components/sections/Hero';
import { Philosophy } from '@/components/sections/Philosophy';
import { Projects } from '@/components/sections/Projects';
import { Archive } from '@/components/sections/Archive';
import { WelcomeScreen } from '@/components/ui/WelcomeScreen';

export default function Home() {
  return (
    <>
      <WelcomeScreen />
      <Hero />
      <Philosophy />
      <Projects />
      <Archive />
    </>
  );
}
