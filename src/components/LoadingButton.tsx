'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface LoadingButtonProps {
  isLoading: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'premium' | 'case';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  loadingText?: string;
}

export const LoadingButton = ({
  isLoading,
  disabled = false,
  onClick,
  children,
  className = '',
  variant = 'default',
  size = 'default',
  loadingText = 'Loading...'
}: LoadingButtonProps) => {
  return (
    <Button
      onClick={onClick}
      disabled={isLoading || disabled}
      variant={variant}
      size={size}
      className={`relative overflow-hidden transition-all duration-200 ${className}`}
    >
      <motion.div
        className="flex items-center justify-center gap-2"
        animate={{
          opacity: isLoading ? 0.7 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        {isLoading && (
          <motion.div
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        )}
        <span>{isLoading ? loadingText : children}</span>
      </motion.div>
      
      {/* Background loading effect */}
      {isLoading && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      )}
    </Button>
  );
}; 