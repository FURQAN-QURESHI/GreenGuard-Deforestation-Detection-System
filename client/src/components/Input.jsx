import React, { useState } from 'react';

const Input = ({
    label,
    type = 'text',
    placeholder,
    value,
    onChange,
    className = '',
    icon: Icon = null,
    error = '',
    required = false
}) => {
    return (
        <div className={`gg-input-group ${className}`}>
            {label && (
                <label className="gg-input-label">
                    {label}
                    {required && <span style={{ color: 'var(--color-primary)', marginLeft: '4px' }}>*</span>}
                </label>
            )}
            <div style={{ position: 'relative' }}>
                {Icon && (
                    <div style={{
                        position: 'absolute',
                        left: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                        pointerEvents: 'none'
                    }}>
                        <Icon size={20} />
                    </div>
                )}
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className="gg-input"
                    style={Icon ? { paddingLeft: '48px' } : {}}
                />
            </div>
            {error && (
                <p style={{ marginTop: '6px', fontSize: '0.875rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {error}
                </p>
            )}
        </div>
    );
};

export default Input;
