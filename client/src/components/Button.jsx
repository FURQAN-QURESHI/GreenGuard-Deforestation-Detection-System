import React from 'react';

const Button = ({
    children,
    onClick,
    variant = 'primary',
    size = 'md',
    className = '',
    type = 'button',
    disabled = false,
    loading = false,
    icon: Icon = null
}) => {

    // Size mapping using inline styles or utility classes can still work 
    // but here we use our custom CSS system for the base design
    const sizeClasses = {
        sm: 'py-2 px-3 text-sm',
        md: 'py-3 px-6 text-base',
        lg: 'py-4 px-8 text-lg'
    };

    const variantClass = variant === 'primary' ? 'gg-btn-primary' :
        variant === 'secondary' ? 'gg-btn-secondary' : '';

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`gg-btn ${variantClass} ${sizeClasses[size]} ${className}`}
        >
            {loading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            ) : Icon ? (
                <Icon size={20} />
            ) : null}

            <span>{children}</span>
        </button>
    );
};

export default Button;
