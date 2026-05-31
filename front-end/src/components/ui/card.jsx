import React from 'react';

export const Card = ({ className, children, ...props }) => (
  <div
    className={`rounded-2xl border border-overlay/10 bg-slate shadow-sm theme-surface ${className || ''}`}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ className, children, ...props }) => (
  <div className={`p-6 pb-3 ${className || ''}`} {...props}>{children}</div>
);

export const CardTitle = ({ className, children, ...props }) => (
  <h3 className={`text-lg font-semibold text-mist ${className || ''}`} {...props}>{children}</h3>
);

export const CardContent = ({ className, children, ...props }) => (
  <div className={`p-6 pt-0 ${className || ''}`} {...props}>{children}</div>
);
