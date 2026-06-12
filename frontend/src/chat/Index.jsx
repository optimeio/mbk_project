"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { MessageSquare, Shield, Users, GraduationCap, ArrowRight, Zap } from 'lucide-react';
import clsx from 'clsx';
import { DEMO_USERS, ROLES } from './services/streamClient';
import { getRoleMeta } from './utils/helpers';
import { useAuth } from '@/context/AuthContext';

const ROLE_OPTIONS = [
  {
    role:     ROLES.SUPER_ADMIN,
    user:     DEMO_USERS.admin,
    icon:     Shield,
    title:    'Super Admin',
    subtitle: 'Full platform access · Broadcast announcements',
    features: ['Broadcast to all users', 'Pin announcements', 'View all channels', 'Manage platform'],
    gradient: 'from-accent-violet/15 to-brand-600/20',
    border:   'border-purple-500/25',
    glow:     'hover:shadow-[0_0_24px_rgba(139,92,246,0.15)]',
    badge:    'bg-purple-500/10 text-purple-600 border-purple-500/20',
    route:    '/dashboard',
  },
  {
    role:     ROLES.SPOC_ADMIN,
    user:     DEMO_USERS.spoc1,
    icon:     Users,
    title:    'SPOC Admin',
    subtitle: 'Single Point of Contact · Batch coordinator',
    features: ['Direct message trainers', 'Create trainer groups', 'Manage batch channels', 'Receive announcements'],
    gradient: 'from-brand-500/15 to-accent-teal/10',
    border:   'border-brand-500/25',
    glow:     'hover:shadow-[0_0_24px_rgba(45,122,82,0.15)]',
    badge:    'bg-brand-500/10 text-brand-600 border-brand-500/20',
    route:    '/spoc/dashboard',
  },
  {
    role:     ROLES.TRAINER,
    user:     DEMO_USERS.trainer1,
    icon:     GraduationCap,
    title:    'Trainer',
    subtitle: 'Content delivery · Session management',
    features: ['Message SPOC Admin', 'Join group channels', 'Share materials', 'Receive announcements'],
    gradient: 'from-accent-teal/12 to-accent-green/10',
    border:   'border-emerald-500/25',
    glow:     'hover:shadow-[0_0_24px_rgba(16,185,129,0.15)]',
    badge:    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    route:    '/trainer/dashboard',
  },
];

export default function ChatDemoPortal() {
  const router = useRouter();
  const { setAuthUser } = useAuth();
  const [loading, setLoading] = useState(null);

  const handleSelect = async (option) => {
    setLoading(option.role);
    // Store selected user in session/local storage for the app to pick up
    if (setAuthUser) {
        setAuthUser(option.user);
    }
    // Small delay to show loading state
    setTimeout(() => {
        router.push(option.route);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6 text-surface-900">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-brand-500/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-accent-teal/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-4xl animate-fade-in">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 mb-6">
            <Zap size={12} className="text-brand-400" />
            <span className="text-xs font-medium text-brand-400">Demo Mode</span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow-brand text-white">
              <MessageSquare size={22} />
            </div>
            <h1 className="text-4xl font-extrabold text-surface-900 tracking-tight">
              MBK<span className="text-brand-600"> Chat</span>
            </h1>
          </div>
          <p className="text-surface-400 text-base max-w-md mx-auto">
            Internal communication platform for education and training teams.
            Select a role to continue.
          </p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ROLE_OPTIONS.map((option) => {
            const Icon     = option.icon;
            const isLoading = loading === option.role;
            const meta     = getRoleMeta(option.role);

            return (
              <button
                key={option.role}
                onClick={() => handleSelect(option)}
                disabled={!!loading}
                className={clsx(
                  'relative flex flex-col p-6 rounded-2xl text-left transition-all duration-300 group',
                  `bg-gradient-to-br ${option.gradient}`,
                  'border',
                  option.border,
                  option.glow,
                  'hover:translate-y-[-2px]',
                  loading && !isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                )}
              >
                {/* Icon */}
                <div className={clsx(
                  'w-11 h-11 rounded-xl flex items-center justify-center mb-4',
                  'border transition-transform duration-200 group-hover:scale-110',
                  option.badge,
                )}>
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Icon size={20} />
                  )}
                </div>

                {/* Role badge */}
                <div className={clsx(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border mb-2',
                  option.badge,
                )}>
                  {meta.badge} · {option.title}
                </div>

                <h3 className="text-base font-bold text-surface-900 mb-1">{option.title}</h3>
                <p className="text-xs text-surface-500 mb-4 leading-relaxed">{option.subtitle}</p>

                {/* Feature list */}
                <ul className="space-y-1.5 mb-5 flex-1">
                  {option.features.map((f, i) => (
                    <li key={`${option.role}-${i}-${f}`} className="flex items-center gap-2 text-xs text-surface-400">
                      <span className={clsx('w-1 h-1 rounded-full flex-shrink-0')} style={{ background: meta.dot }} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className={clsx(
                  'flex items-center gap-2 text-xs font-semibold transition-all duration-200',
                  'group-hover:gap-3',
                  option.badge.includes('purple') ? 'text-purple-400' :
                  option.badge.includes('brand')  ? 'text-brand-400' : 'text-emerald-400',
                )}>
                  Enter as {option.title}
                  <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                </div>

                {/* User preview */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-right">
                    <p className="text-[10px] text-surface-500">Signed in as</p>
                    <p className="text-[11px] font-medium text-surface-300">{option.user.name}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="text-center text-xs text-surface-600 mt-8">
          🔒 This is a demo environment. Configure your Stream API key in{' '}
          <code className="text-brand-400">.env.local</code> before use.
        </div>
      </div>
    </div>
  );
}
