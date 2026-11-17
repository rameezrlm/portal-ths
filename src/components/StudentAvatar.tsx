import React, { useEffect, useState } from 'react';

interface StudentAvatarProps {
  name: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
const sizes = { sm: 'h-8 w-8 text-[11px]', md: 'h-11 w-11 text-sm', lg: 'h-20 w-20 text-xl' };
export const StudentAvatar: React.FC<StudentAvatarProps> = ({ name, imageUrl, size = 'sm', className = '' }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [imageUrl]);
  const initials = (name || 'S').split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase();
  return <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 font-bold text-emerald-900 ring-1 ring-emerald-200 ${sizes[size]} ${className}`}>
    {imageUrl && !failed ? <img src={imageUrl} alt={`${name} profile`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover" /> : initials}
  </span>;
};
