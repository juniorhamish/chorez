"use client";

import { motion } from "framer-motion";

/**
 * `framer-motion`'s `motion.*` components rely on client-only features and
 * can't be rendered directly from a Server Component. Re-exporting the
 * primitives used by the (otherwise fully static) landing page from this
 * small client island lets the rest of the page stay a Server Component.
 */
export const MotionDiv = motion.div;
export const MotionH1 = motion.h1;
export const MotionH2 = motion.h2;
export const MotionP = motion.p;
