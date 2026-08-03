import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Home,
  UserIcon,
  Clock,
  Star,
  ArrowRight,
  CheckCircle2,
  Bath,
  UtensilsCrossed,
  Armchair,
} from "lucide-react";
import AuthLink from "./components/AuthLink";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * UTILS
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * MOCK DATA
 */
const FEATURES = [
  {
    icon: Home,
    title: "Track by room",
    description:
      "Organize chores by Kitchen, Bathroom, Living Room and more, so nothing in the house gets forgotten.",
    accent: "indigo",
  },
  {
    icon: UserIcon,
    title: "Assign to household members",
    description:
      "Split the work fairly. Every task gets a name attached, so everyone knows what's theirs to do.",
    accent: "amber",
  },
  {
    icon: Clock,
    title: "Track effort & duration",
    description:
      "Log how long each chore actually took and rate the effort, so you can plan the week realistically.",
    accent: "green",
  },
  {
    icon: Star,
    title: "Favorite the essentials",
    description:
      "Star the rooms and tasks you care about most to keep them pinned right at the top of your day.",
    accent: "indigo",
  },
];

const PREVIEW_ROOMS = [
  { id: "kitchen", name: "Kitchen", icon: UtensilsCrossed },
  { id: "bathroom", name: "Bathroom", icon: Bath },
  { id: "living-room", name: "Living Room", icon: Armchair },
];

const ACCENT_STYLES: Record<
  string,
  { bg: string; text: string; ring: string }
> = {
  indigo: { bg: "bg-indigo-100", text: "text-indigo-600", ring: "shadow-indigo-100" },
  amber: { bg: "bg-amber-100", text: "text-amber-500", ring: "shadow-amber-100" },
  green: { bg: "bg-[#88A47C]/15", text: "text-[#5A7350]", ring: "shadow-green-100" },
};

/**
 * ANIMATION VARIANTS
 */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

/**
 * COMPONENTS
 */

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-9 h-9 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 rotate-3">
        <Sparkles size={18} className="text-white" />
      </div>
      <span className="text-lg font-black tracking-tight">Chorez</span>
    </div>
  );
}

function Navbar() {
  return (
    <header className="sticky top-0 z-30 bg-[#FDFCF0]/80 backdrop-blur-md border-b border-indigo-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-3">
          <AuthLink className="hidden sm:flex items-center gap-1.5 text-sm font-bold text-indigo-600/80 hover:text-indigo-600 px-4 py-2.5 rounded-2xl transition-colors" />
          <Link
            href="/dashboard"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-200/40 rounded-full blur-3xl" />
      <div className="absolute top-40 -left-24 w-72 h-72 bg-[#88A47C]/20 rounded-full blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-6 pt-16 pb-20 md:pt-24 md:pb-28 grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 bg-white border border-indigo-100 px-4 py-1.5 rounded-full shadow-sm mb-6"
          >
            <span className="w-1.5 h-1.5 bg-[#88A47C] rounded-full" />
            <span className="text-xs font-black uppercase tracking-widest text-indigo-500">
              Built for households
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-4xl md:text-6xl font-black tracking-tight leading-[1.05] mb-6"
          >
            Chores, actually{" "}
            <span className="relative inline-block">
              <span className="relative z-10">done.</span>
              <span className="absolute left-0 bottom-1 md:bottom-2 h-3 md:h-4 w-full bg-amber-200/70 -rotate-1 rounded-sm z-0" />
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-indigo-600/70 text-lg font-medium max-w-md mb-8"
          >
            Chorez helps your household track tasks by room, split the load
            fairly, and celebrate the wins &mdash; so nothing falls through
            the cracks again.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="group bg-indigo-600 hover:bg-indigo-700 text-white font-black px-7 py-4 rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
            >
              Get Started
              <ArrowRight
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
            <AuthLink className="font-bold text-indigo-600 px-7 py-4 rounded-2xl border border-indigo-100 bg-white hover:border-indigo-200 transition-colors flex items-center gap-2" />
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="flex items-center gap-3 mt-10"
          >
            <div className="flex -space-x-3">
              {[
                { label: "A", color: "bg-indigo-100 text-indigo-700" },
                { label: "J", color: "bg-rose-100 text-rose-700" },
                { label: "S", color: "bg-amber-100 text-amber-700" },
              ].map((u) => (
                <div
                  key={u.label}
                  className={cn(
                    "w-9 h-9 rounded-full border-2 border-[#FDFCF0] flex items-center justify-center font-black text-xs shadow-sm",
                    u.color
                  )}
                >
                  {u.label}
                </div>
              ))}
            </div>
            <p className="text-sm font-bold text-indigo-400">
              Loved by families keeping their homes in sync
            </p>
          </motion.div>
        </motion.div>

        {/* Preview card */}
        <motion.div
          initial={{ opacity: 0, y: 30, rotate: -2 }}
          animate={{ opacity: 1, y: 0, rotate: -2 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          whileHover={{ rotate: 0 }}
          className="relative mx-auto w-full max-w-sm"
        >
          <div className="bg-white rounded-[2.5rem] p-6 border border-indigo-50 shadow-2xl shadow-indigo-100/80">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-md">
                Kitchen
              </span>
              <Star size={16} className="fill-amber-400 text-amber-400" />
            </div>
            <h3 className="font-black text-xl leading-tight mb-4">
              Deep clean oven
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
                <Clock size={14} />
                45m
              </div>
              <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm shadow-sm">
                A
              </div>
            </div>
            <button className="mt-5 w-full bg-[#88A47C] text-white py-3 rounded-2xl font-bold text-sm shadow-lg shadow-green-100 flex items-center justify-center gap-2">
              <CheckCircle2 size={16} />
              Done
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="absolute -bottom-6 -left-8 bg-white rounded-2xl px-4 py-3 border border-indigo-50 shadow-xl flex items-center gap-2"
          >
            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-black text-[10px]">
              S
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                Just finished
              </p>
              <p className="text-xs font-bold text-indigo-600">
                Water the plants
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function RoomStrip() {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-4">
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {PREVIEW_ROOMS.map((room) => {
          const Icon = room.icon;
          return (
            <div
              key={room.id}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-indigo-50 bg-white text-indigo-500 shadow-sm"
            >
              <Icon size={16} className="text-indigo-400" />
              <span className="font-bold text-sm">{room.name}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl mx-auto mb-14"
      >
        <span className="text-xs font-black uppercase tracking-widest text-indigo-400">
          Everything the household needs
        </span>
        <h2 className="text-3xl md:text-4xl font-black tracking-tight mt-3">
          One place to run the whole home.
        </h2>
        <p className="text-indigo-600/70 font-medium mt-4">
          From the kitchen sink to the bathroom floor, Chorez keeps every
          chore visible, assigned, and accounted for.
        </p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={stagger}
        className="grid sm:grid-cols-2 gap-5"
      >
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          const accent = ACCENT_STYLES[feature.accent];
          return (
            <motion.div
              key={feature.title}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className={cn(
                "bg-white p-7 rounded-[2rem] border border-indigo-50 shadow-sm hover:shadow-md transition-shadow",
                accent.ring
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-5",
                  accent.bg
                )}
              >
                <Icon size={22} className={accent.text} />
              </div>
              <h3 className="font-black text-lg mb-2">{feature.title}</h3>
              <p className="text-indigo-600/70 font-medium text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Add your rooms & tasks",
      description: "Set up the chores that matter to your household in seconds.",
    },
    {
      number: "02",
      title: "Assign to the team",
      description: "Give every task an owner so responsibilities are always clear.",
    },
    {
      number: "03",
      title: "Check off & track effort",
      description: "Mark tasks done, rate the effort, and watch the home run smoother.",
    },
  ];

  return (
    <section className="bg-white border-y border-indigo-50">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-black tracking-tight text-center mb-14"
        >
          Up and running in three steps
        </motion.h2>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="grid md:grid-cols-3 gap-8"
        >
          {steps.map((step) => (
            <motion.div key={step.number} variants={fadeUp} className="relative">
              <span className="text-5xl font-black text-indigo-100">
                {step.number}
              </span>
              <h3 className="font-black text-xl mt-3 mb-2">{step.title}</h3>
              <p className="text-indigo-600/70 font-medium text-sm leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function CtaBanner() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden bg-indigo-600 rounded-[2.5rem] px-8 py-14 md:py-20 text-center shadow-2xl shadow-indigo-200"
      >
        <div className="absolute -top-16 -left-16 w-56 h-56 bg-amber-300/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-[#88A47C]/30 rounded-full blur-3xl" />

        <div className="relative">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-4">
            Ready to get your household in sync?
          </h2>
          <p className="text-indigo-100 font-medium max-w-lg mx-auto mb-8">
            Join the households turning chore chaos into a shared, satisfying
            routine.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-white text-indigo-600 font-black px-8 py-4 rounded-2xl shadow-xl transition-all active:scale-95 hover:bg-amber-50"
          >
            Get Started
            <ArrowRight size={18} />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-indigo-50">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Logo />
        <p className="text-sm font-medium text-indigo-400">
          &copy; {new Date().getFullYear()} Chorez. Made for happier homes.
        </p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FDFCF0] text-[#2D336B] font-sans selection:bg-indigo-100">
      <Navbar />
      <Hero />
      <RoomStrip />
      <Features />
      <HowItWorks />
      <CtaBanner />
      <Footer />
    </div>
  );
}
