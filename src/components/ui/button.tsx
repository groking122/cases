import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-poppins",
  {
    variants: {
      variant: {
        default: "bg-slate-800 text-white hover:bg-slate-700 border border-slate-600 shadow-lg hover:shadow-xl",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 border border-red-500 shadow-lg hover:shadow-xl",
        outline:
          "border border-slate-600 bg-slate-900/50 text-slate-200 hover:bg-slate-800 hover:text-white backdrop-blur-sm",
        secondary:
          "bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-500 shadow-lg",
        ghost: "text-slate-300 hover:bg-slate-800 hover:text-white",
        link: "text-blue-400 underline-offset-4 hover:underline hover:text-blue-300",
        premium: "bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:from-yellow-600 hover:to-orange-700 shadow-lg hover:shadow-xl border border-orange-400",
        case: "bg-gradient-to-r from-blue-600 to-purple-700 text-white hover:from-blue-700 hover:to-purple-800 shadow-lg hover:shadow-xl border border-purple-500"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants } 