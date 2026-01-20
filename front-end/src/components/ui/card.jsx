import React from 'react';

export const Card = ({ className, children, ...props }) => {
    return (
        <div
            className={`rounded-xl border shadow-sm ${className || ''}`}
            {...props}
        >
            {children}
        </div>
    );
};
