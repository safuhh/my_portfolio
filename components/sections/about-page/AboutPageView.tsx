/* ABOUT PAGE · composition
   The dedicated /about page, built like a case study: the Echo hero masthead,
   the reused case-study Ledger as a vitals strip, an Intro reading column,
   a numbered Experience list, Credentials (certs ledger + education), a
   Colophon, and the shared home-page Contact form as the closing CTA.
   Editorial is the base language; the Ledger is woven in at the top (vitals)
   and the bottom (colophon). */

import { Ledger } from "@/components/sections/case-study/Ledger";
import { Contact } from "@/components/sections/Contact";
import { AboutPageHeroEcho } from "./Echo";
import { AboutPageIntro } from "./Intro";
import { AboutPageExperience } from "./Experience";
import { AboutPageCredentials } from "./Credentials";
import { AboutPageColophon } from "./Colophon";

const VITALS = [
  { label: "Status", primary: "Full time", secondary: "Builds independently" },
  { label: "Discipline", primary: "Full Stack", secondary: "Interface to infrastructure" },
  { label: "Building", primary: "TASKTROX", secondary: "Internal ops platform" },
  { label: "Based in", primary: "Europe", secondary: "Working worldwide" },
  { label: "Ships", primary: "Real things", secondary: "Not mockups" },
];

export function AboutPageView() {
  return (
    <main>
      <AboutPageHeroEcho />
      <Ledger entries={VITALS} />
      <AboutPageIntro />
      <AboutPageExperience />
      <AboutPageCredentials />
      <AboutPageColophon />
      <Contact />
    </main>
  );
}
