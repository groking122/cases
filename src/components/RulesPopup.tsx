"use client"

import { AnimatePresence, motion } from "framer-motion"

interface RulesPopupProps {
	isOpen: boolean
	onClose: () => void
}

export default function RulesPopup({ isOpen, onClose }: RulesPopupProps) {
	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-sm flex items-center justify-center p-4"
					onClick={onClose}
				>
					<motion.div
						initial={{ scale: 0.95, y: 8, opacity: 0 }}
						animate={{ scale: 1, y: 0, opacity: 1 }}
						exit={{ scale: 0.95, y: 8, opacity: 0 }}
						transition={{ type: "spring", stiffness: 300, damping: 24 }}
						className="relative w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl"
						onClick={(e) => e.stopPropagation()}
					>
						<button
							aria-label="Close"
							onClick={onClose}
							className="absolute right-3 top-3 h-8 w-8 rounded-lg border border-border text-foreground/70 hover:text-foreground"
						>
							×
						</button>
						<div className="px-5 pt-5 pb-4">
							<h3 className="text-xl font-extrabold text-foreground mb-2">How it works?</h3>
							<p className="text-sm text-foreground/80 mb-4">
								Fair case openings. No pre-sale, no insiders.
							</p>
							<ol className="space-y-2 text-sm text-foreground/80">
								<li>1. Connect your Cardano wallet</li>
								<li>2. Buy credits (or use existing)</li>
								<li>3. Pick a case and open it</li>
								<li>4. Credits update instantly with winnings</li>
								<li>5. Withdraw credits via the Stash page</li>
							</ol>
							<div className="mt-5">
								<button
									onClick={onClose}
									className="w-full rounded-xl bg-foreground text-background px-4 py-2.5 text-sm font-semibold hover:opacity-90"
								>
									Got it
								</button>
							</div>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}


