'use client';

import { motion } from 'framer-motion';

interface Case {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  skinCount: number;
  created_at: string;
}

interface CaseSelectorProps {
  cases: Case[];
  selectedCase: Case | null;
  onSelectCase: (caseItem: Case) => void;
  isLoading?: boolean;
  userCredits?: number;
}

export const CaseSelector = ({ 
  cases, 
  selectedCase, 
  onSelectCase, 
  isLoading = false,
  userCredits = 0
}: CaseSelectorProps) => {
  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">Available Cases</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white/5 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-white/20 rounded mb-2"></div>
              <div className="h-3 bg-white/10 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">Available Cases</h3>
        <div className="text-center py-8">
          <p className="text-white/60 mb-4">No cases available</p>
          <p className="text-white/40 text-sm">
            Please contact support or try refreshing the page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
        <h3 className="text-base sm:text-lg font-bold text-white">
          Cases ({cases.length})
        </h3>
        <div className="text-right">
          <div className="text-xs sm:text-sm text-white/60">Credits</div>
          <div className="text-base sm:text-lg font-bold text-green-400">{userCredits}</div>
        </div>
      </div>
      <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-80 overflow-y-auto">
        {cases.map((caseItem, index) => (
          <motion.div
            key={caseItem.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelectCase(caseItem)}
            className={`relative p-3 sm:p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
              selectedCase?.id === caseItem.id
                ? 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/25'
                : 'border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-700/50 active:bg-gray-600/50'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Selected indicator */}
            {selectedCase?.id === caseItem.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-purple-500 rounded-full flex items-center justify-center"
              >
                <span className="text-white text-xs">✓</span>
              </motion.div>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-white text-sm sm:text-lg">
                  {caseItem.name}
                </h4>
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <span className={`font-bold text-sm sm:text-base ${userCredits >= caseItem.price ? 'text-green-400' : 'text-red-400'}`}>
                    {caseItem.price} Credits
                  </span>
                  {userCredits >= caseItem.price ? (
                    <span className="text-green-400 text-xs sm:text-sm">✓</span>
                  ) : (
                    <span className="text-red-400 text-xs sm:text-sm">✗</span>
                  )}
                </div>
              </div>
              
              {caseItem.description && (
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                  {caseItem.description}
                </p>
              )}
              
              {caseItem.skinCount !== undefined && (
                <div className="flex items-center justify-between text-xs sm:text-sm text-gray-400">
                  <span>{caseItem.skinCount} possible rewards</span>
                  <span className="text-purple-400">Tap to select</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Footer info */}
      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-600 text-center">
        <p className="text-gray-400 text-xs sm:text-sm">
          Select a case to open
        </p>
      </div>
    </div>
  );
}; 