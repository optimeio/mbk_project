import React, { useContext } from 'react';
import { LoadingContext } from '@/context/LoadingContext';
import { Loader2 } from 'lucide-react';

const LoadingSpinner = () => {
  const { loading } = useContext(LoadingContext);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/30 z-[9999] transition-opacity duration-300 ${loading ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      aria-hidden={!loading}
    >
      <Loader2 className="animate-spin text-white" size={64} />
    </div>
  );
};

export default LoadingSpinner;
