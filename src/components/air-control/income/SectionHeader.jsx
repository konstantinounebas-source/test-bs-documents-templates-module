import React from 'react';

export default function SectionHeader({ title, className = '' }) {
    return (
        <tr>
            <td
                colSpan={20}
                className={`bg-slate-700 text-white font-bold px-3 py-2 text-sm ${className}`}
            >
                {title}
            </td>
        </tr>
    );
}