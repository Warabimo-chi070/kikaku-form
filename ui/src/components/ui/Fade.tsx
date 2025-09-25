import { motion, AnimatePresence, type MotionProps } from "framer-motion";
import * as React from "react";
import { fade, fadeUp } from "../../lib/motion";

const motionMap = {
  div: motion.div,
  section: motion.section,
  span: motion.span,
  p: motion.p,
} as const;

type AllowedTag = keyof typeof motionMap;

type Props = React.PropsWithChildren<{
  type?: "fade" | "fadeUp";
  as?: AllowedTag;
  className?: string;
}> & MotionProps;

export default function Fade({
  type = "fade",
  as = "div",
  className,
  children,
  ...rest
}: Props) {
  const Comp = motionMap[as];
  const variants = type === "fadeUp" ? fadeUp : fade;

  return (
    <AnimatePresence mode="wait">
      <Comp
        variants={variants}
        initial="hidden"
        animate="show"
        exit="exit"
        className={className}
        {...rest}
      >
        {children}
      </Comp>
    </AnimatePresence>
  );
}