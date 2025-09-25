import { motion } from "framer-motion";
export default function Spinner({ size=40 }: { size?: number }) {
  return (
    <motion.div
      style={{ width: size, height: size }}
      className="border-4 border-gray-300 border-t-blue-600 rounded-full mx-auto"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
    />
  );
}