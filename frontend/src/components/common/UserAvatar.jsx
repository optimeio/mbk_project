"use client";

import { useState, useEffect } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { getProfilePictureUrl } from '@/utils/imageUtils';

const UserAvatar = ({ profilePicture, name, className = "h-10 w-10", showInitials = true }) => {
    const [imgError, setImgError] = useState(false);

    // Reset error state when profilePicture changes
    useEffect(() => {
        setImgError(false);
    }, [profilePicture]);

    if (profilePicture && !imgError) {
        return (
            <img 
                className={`${className} rounded-full object-cover`}
                src={getProfilePictureUrl(profilePicture)} 
                alt={name || 'User'}
                onError={() => setImgError(true)}
            />
        );
    }

    if (showInitials && name) {
        return (
            <div className={`${className} rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs ring-2 ring-indigo-50`}>
                {name.charAt(0).toUpperCase()}
            </div>
        );
    }

    return (
        <UserCircleIcon className={`${className} text-gray-300`} aria-hidden="true" />
    );
};

export default UserAvatar;
