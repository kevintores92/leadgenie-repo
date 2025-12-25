import { motion } from "framer-motion";

interface LightningLoaderProps {
  text?: string;
  subtext?: string;
}

export function LightningLoader({ 
  text = "Processing", 
  subtext = "Please wait..." 
}: LightningLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        {/* Lightning SVG with pulse animation */}
        <motion.div
          className="relative w-32 h-32"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ 
            scale: [0, 1.2, 1],
            rotate: 0
          }}
          transition={{ 
            duration: 0.6,
            ease: "easeOut"
          }}
        >
          <motion.svg 
            viewBox="0 0 512 512" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            animate={{ 
              filter: [
                "drop-shadow(0 0 20px rgba(59, 130, 246, 0.5))",
                "drop-shadow(0 0 40px rgba(168, 85, 247, 0.8))",
                "drop-shadow(0 0 20px rgba(59, 130, 246, 0.5))"
              ]
            }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <defs>
              <linearGradient id="lightning-gradient-loader" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            
            {/* Lightning Bolt */}
            <motion.path
              d="M256 48 L160 280 H240 L180 464 L360 240 H280 L320 140 L256 48 Z"
              fill="url(#lightning-gradient-loader)"
              stroke="white"
              strokeWidth="8"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: [0, 1, 1, 1],
                opacity: [0, 1, 1, 0.8]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* Speed Lines with staggered animation */}
            <motion.rect 
              x="40" 
              y="240" 
              width="100" 
              height="32" 
              rx="16" 
              fill="url(#lightning-gradient-loader)" 
              initial={{ x: -100, opacity: 0 }}
              animate={{ 
                x: [40, 140],
                opacity: [0, 0.8, 0]
              }}
              transition={{ 
                duration: 1.2,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0
              }}
            />
            <motion.rect 
              x="80" 
              y="300" 
              width="140" 
              height="32" 
              rx="16" 
              fill="url(#lightning-gradient-loader)" 
              initial={{ x: -140, opacity: 0 }}
              animate={{ 
                x: [80, 200],
                opacity: [0, 0.6, 0]
              }}
              transition={{ 
                duration: 1.2,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.3
              }}
            />
          </motion.svg>
        </motion.div>

        {/* Text with fade in */}
        <motion.div 
          className="text-center space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-xl font-semibold text-foreground">
            {text}
          </h3>
          <p className="text-sm text-muted-foreground">
            {subtext}
          </p>
        </motion.div>

        {/* Pulse dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
