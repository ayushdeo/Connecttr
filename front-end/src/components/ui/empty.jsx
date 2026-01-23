import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function Empty({ className, children, ...props }) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center text-center max-w-md mx-auto p-8 rounded-xl border border-gray-200 bg-white/50 backdrop-blur-sm shadow-xl dark:bg-gray-900/50 dark:border-gray-800",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function EmptyHeader({ className, children, ...props }) {
    return (
        <div className={cn("flex flex-col items-center gap-2 mb-6", className)} {...props}>
            {children}
        </div>
    );
}

export function EmptyTitle({ className, children, ...props }) {
    return (
        <h3
            className={cn(
                "text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100",
                className
            )}
            {...props}
        >
            {children}
        </h3>
    );
}

export function EmptyDescription({ className, children, ...props }) {
    return (
        <p
            className={cn(
                "text-sm text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed",
                className
            )}
            {...props}
        >
            {children}
        </p>
    );
}

export function EmptyContent({ className, children, ...props }) {
    return (
        <div className={cn("w-full", className)} {...props}>
            {children}
        </div>
    );
}

export function EmptyMedia({ className, variant, children, ...props }) {
    return (
        <div
            className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-4 text-gray-600 dark:text-gray-400",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
