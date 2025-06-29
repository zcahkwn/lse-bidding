import * as React from "react"
import { cn } from "@/lib/utils"

export interface NonNegativeInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: string
  onChange: (value: string) => void
}

const NonNegativeInput = React.forwardRef<HTMLInputElement, NonNegativeInputProps>(
  ({ className, value, onChange, onKeyDown, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      
      // Allow empty string for clearing the field
      if (inputValue === "") {
        onChange("")
        return
      }
      
      // Only allow non-negative integers (including zero)
      const numericValue = parseInt(inputValue, 10)
      if (!isNaN(numericValue) && numericValue >= 0) {
        onChange(inputValue)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow backspace, delete, tab, escape, enter, and arrow keys
      if ([8, 9, 27, 13, 37, 38, 39, 40, 46].indexOf(e.keyCode) !== -1 ||
          // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z
          (e.keyCode === 65 && e.ctrlKey === true) ||
          (e.keyCode === 67 && e.ctrlKey === true) ||
          (e.keyCode === 86 && e.ctrlKey === true) ||
          (e.keyCode === 88 && e.ctrlKey === true) ||
          (e.keyCode === 90 && e.ctrlKey === true)) {
        // Call the parent onKeyDown if provided
        onKeyDown?.(e)
        return
      }
      
      // Ensure that it is a number and stop the keypress for non-numeric keys
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault()
      }
      
      // Call the parent onKeyDown if provided
      onKeyDown?.(e)
    }

    return (
      <input
        type="text"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        ref={ref}
        {...props}
      />
    )
  }
)
NonNegativeInput.displayName = "NonNegativeInput"

export { NonNegativeInput }