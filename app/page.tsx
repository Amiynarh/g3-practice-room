"use client";

import Link from "next/link";
import Image from "next/image";
import { SCENARIOS } from "@/lib/scenarios";
import { ScenarioIcon } from "@/components/ui/scenario-icon";
import { ChevronRight, BarChart3, Globe, Mic, Brain, Zap, FileText } from "lucide-react";
import { motion, type Variants } from "framer-motion";

const allScenarios = Object.values(SCENARIOS);

const levelLabel: Record<string, string> = {
  beginner: "Level 1",
  intermediate: "Level 2",
  advanced: "Level 3",
};

const levelColor: Record<string, string> = {
  beginner: "bg-green-50 text-green-700",
  intermediate: "bg-primary/8 text-primary",
  advanced: "bg-amber-50 text-amber-700",
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border bg-white/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/branding/logo/g3women-colored.png"
              alt="G3Women"
              width={100}
              height={32}
              className="h-8 w-auto object-contain"
              priority
            />
            <div className="h-5 w-px bg-border mx-1 hidden sm:block" />
            <span className="hidden sm:block text-xs font-semibold text-muted-foreground tracking-wide uppercase">
              Practice Room
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/signin"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors shadow-md shadow-primary/20"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20">
        <motion.div
          className="grid lg:grid-cols-2 gap-12 items-center"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <div>
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 bg-primary/8 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-8 border border-primary/20"
            >
              <Globe className="w-3.5 h-3.5" />
              Built for Nigerian women in tech
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight text-foreground"
            >
              Build real confidence for{" "}
              <span className="gradient-text">real situations</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-lg text-muted-foreground leading-relaxed"
            >
              Aunty Ada plays the interviewer, the manager, the client — so you can make
              your mistakes here, before the real conversation.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row gap-4 mt-10"
            >
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-primary text-white text-base font-semibold px-8 py-4 rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
              >
                Start for free
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                href="/signin"
                className="inline-flex items-center justify-center bg-white border border-border text-foreground text-base font-medium px-8 py-4 rounded-xl hover:bg-muted transition-colors"
              >
                Sign in
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-wrap items-center gap-5"
            >
              {[
                { icon: Mic, label: "Voice + Text" },
                { icon: Brain, label: "AI Coaching" },
                { icon: Zap, label: "4 Languages" },
                { icon: FileText, label: "Instant Feedback" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Icon className="w-4 h-4 text-primary" />
                  {label}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Aunty Ada animation */}
          <motion.div
            variants={fadeUp}
            className="relative flex justify-center lg:justify-end"
          >
            <div className="relative w-72 h-72 lg:w-96 lg:h-96">
              <div className="absolute inset-0 gradient-bg rounded-full opacity-15 blur-3xl" />
              <video
                src="/auntyada-branding/landingpage-animation/auntyada-landingpage-animation.mp4"
                autoPlay
                muted
                loop
                playsInline
                className="object-contain relative z-10 drop-shadow-2xl w-full h-full"
              />
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Aunty Ada positioning strip */}
      <section className="border-y border-primary/10 bg-primary/4 py-5">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-base text-foreground/80 font-medium leading-relaxed">
            <span className="text-primary font-semibold">Aunty Ada isn&apos;t a chatbot.</span>{" "}
            She role-plays real people so you can practise the hardest professional conversations —
            and get honest feedback every time.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/60 py-20 border-b border-border">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold text-center mb-3">How it works</h2>
            <p className="text-center text-muted-foreground mb-14">
              Three steps to a stronger professional voice
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Accept a mission",
                desc: "Choose your scenario — job interview, salary talk, client pitch. Tell Aunty Ada your background so the roleplay fits your actual situation.",
                icon: <ScenarioIcon name="Briefcase" className="w-6 h-6 text-primary" />,
              },
              {
                step: "2",
                title: "Practise with Aunty Ada",
                desc: "She plays the interviewer, the manager, the client — tough but fair. You respond as yourself. Voice or text, in English, Hausa, Yoruba, or Igbo.",
                icon: <Mic className="w-6 h-6 text-primary" />,
              },
              {
                step: "3",
                title: "See your results",
                desc: "Get a detailed score breakdown — confidence, clarity, relevance. Specific tips for your next session. Watch yourself improve over time.",
                icon: <BarChart3 className="w-6 h-6 text-primary" />,
              },
            ].map(({ step, title, desc, icon }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5, ease: "easeOut" as const }}
                className="bg-white rounded-2xl p-6 border border-border relative shadow-sm card-lift"
              >
                <div className="absolute -top-4 -left-4 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md shadow-primary/30">
                  {step}
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  {icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Missions / Scenarios */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold text-center mb-3">Available missions</h2>
          <p className="text-center text-muted-foreground mb-12">
            Every mission is built around real situations Nigerian women face in tech.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allScenarios.map((scenario, i) => (
            <motion.div
              key={scenario.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.45, ease: "easeOut" as const }}
              className="group bg-white border border-border rounded-xl p-5 space-y-3 mission-card hover:border-primary/30 flex flex-col"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <ScenarioIcon name={scenario.icon} className="w-5 h-5 text-primary" />
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${levelColor[scenario.difficulty]}`}>
                  {levelLabel[scenario.difficulty]}
                </span>
              </div>
              <h3 className="font-semibold">{scenario.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1">{scenario.description}</p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-1"
              >
                Try this mission <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Mission CTA */}
      <section
        className="py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #290c4e 0%, #f18805 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "url('/branding/patterns/pattern.svg')", backgroundSize: "400px" }}
        />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <Image
            src="/branding/logo/g3womenwhite.png"
            alt="G3Women"
            width={120}
            height={40}
            className="h-10 w-auto object-contain mx-auto mb-8 opacity-90"
          />
          <h2 className="text-3xl font-bold mb-6 text-white">Built for Nigerian women in tech</h2>
          <p className="text-lg text-white/80 leading-relaxed max-w-2xl mx-auto">
            Aunty Ada Practice Room is a product of G3Women Digital Academy — a platform teaching
            thousands of Nigerian women tech skills in their own language.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 mt-8 bg-white text-primary font-semibold px-8 py-4 rounded-xl hover:bg-white/90 transition-colors shadow-lg"
          >
            Start your first mission free
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-white">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <Image
              src="/branding/logo/g3women-colored.png"
              alt="G3Women"
              width={80}
              height={26}
              className="h-6 w-auto object-contain"
            />
            <span className="text-border">|</span>
            <span>Aunty Ada Practice Room</span>
          </div>
          <p>&#169; {new Date().getFullYear()} G3Women Digital Academy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
