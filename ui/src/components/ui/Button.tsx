import { motion } from "framer-motion";
type MotionBtnProps = React.ComponentProps<typeof motion.button>;

export default function Button({ children, className="", ...rest }: MotionBtnProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 320, damping: 20 }}
      className={
        "px-4 py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow " + className
      }
      {...rest}
    >
      {children}
    </motion.button>
  );
}