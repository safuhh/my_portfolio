import type { Metadata } from "next";
import { getCaseStudy } from "@/data";
import { Hero } from "@/components/sections/case-study/Hero";
import { Ledger } from "@/components/sections/case-study/Ledger";
import { Context } from "@/components/sections/case-study/Context";
import { Vision } from "@/components/sections/case-study/Vision";
import { Pull } from "@/components/sections/case-study/Pull";
import { Product } from "@/components/sections/case-study/Product";
import { Dashboard } from "@/components/sections/case-study/Dashboard";
import { Toggle } from "@/components/sections/case-study/Toggle";
import { Outcomes } from "@/components/sections/case-study/Outcomes";
import { Colophon } from "@/components/sections/case-study/Colophon";
import { NextCase } from "@/components/sections/case-study/NextCase";

export const metadata: Metadata = {
  title: "Tasktrox · Case Study · Mohed Abbas",
  description:
    "A complete identity and product redesign for a project-management platform built for architecture studios.",
};

export default function TasktroxCaseStudy() {
  const cs = getCaseStudy("tasktrox");
  if (!cs?.hero) return null;
  return (
    <main>
      <Hero {...cs.hero} />
      {cs.ledger && <Ledger {...cs.ledger} />}
      <Context />
      <Vision />
      <Pull />
      <Product />
      <Dashboard />
      <Toggle />
      <Outcomes />
      <Colophon />
      <NextCase />
    </main>
  );
}
