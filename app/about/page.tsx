import type { Metadata } from 'next';
import { AboutPageView } from '@/components/sections/about-page';

export const metadata: Metadata = {
  title: 'About · Muhammed Safvan',
  description:
    'Muhammed Safvan builds web products end to end. Profile, experience, certifications and studies.',
  alternates: { canonical: '/about' },
};

/* Dedicated About page — composed like a case study (editorial reading
   rhythm with the Ledger woven in as a vitals strip and a colophon). Navbar,
   transitions and providers come from the root layout. */
export default function AboutRoute() {
  return <AboutPageView />;
}
