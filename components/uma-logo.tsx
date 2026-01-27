import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export interface UmalogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
}

const UmaLogo = React.forwardRef<HTMLDivElement, UmalogoProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-6 w-auto",
      md: "h-8 w-auto",
      lg: "h-12 w-auto",
    }

    return (
      <div
        ref={ref}
        className={cn("flex items-center", className)}
        {...props}
      >
        <Image
          src="/uma-logo.png"
          alt="UMA Logo"
          width={80}
          height={32}
          className={cn(sizeClasses[size])}
          priority
          style={{ objectFit: "contain" }}
        />
      </div>
    )
  }
)
UmaLogo.displayName = "UmaLogo"

export { UmaLogo }
