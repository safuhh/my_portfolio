import { Hero } from '@/components/sections/Hero';
import { Philosophy } from '@/components/sections/Philosophy';
import { Services } from '@/components/sections/Services';
import { Projects } from '@/components/sections/Projects';
import { Archive } from '@/components/sections/Archive';
import { Contact } from '@/components/sections/Contact';
import { WelcomeScreen } from '@/components/ui/WelcomeScreen';

export default function Home() {
  return (
    <>
      <WelcomeScreen />
      <Hero />
      <Philosophy />
      <Services />
      <Projects />
      <Archive />
      <Contact />
    </>
  );
}
