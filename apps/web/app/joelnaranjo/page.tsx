'use client';

import React, { useState } from 'react';
import { createSuperAdmin } from './actions';

export default function BootstrapPage() {
    const [unlocked, setUnlocked] = useState(false);
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    // Form states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === "1234") {
            setUnlocked(true);
            setMessage(null);
        } else {
            setMessage({ type: 'error', text: 'Secret key incorrect.' });
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match.' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const result = await createSuperAdmin({
                email,
                password,
                secretKey: pin // Send pin to server for re-verification
            });

            if (result.success) {
                setMessage({ type: 'success', text: 'Super Admin created successfully! You can now login.' });
                // Optional: Reset form
                setEmail('');
                setPassword('');
                setConfirmPassword('');
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to create Super Admin.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An unexpected error occurred.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 border border-slate-200">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Bootstrap Access</h1>
                <p className="text-slate-500 text-sm mb-6">
                    This is a restricted area for system initialization.
                </p>

                {message && (
                    <div className={`p-3 rounded-lg text-sm mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                        {message.text}
                    </div>
                )}

                {!unlocked ? (
                    <form onSubmit={handleUnlock} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Enter Secret Key</label>
                            <input
                                type="password"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                autoFocus
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="****"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
                        >
                            Unlock Registration
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="admin@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Confirm Password</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-2 rounded-lg font-medium text-white transition-all ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            {loading ? 'Creating Admin...' : 'Register Super Admin'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setUnlocked(false)}
                            className="w-full text-xs text-slate-400 hover:text-slate-600 text-center"
                        >
                            Lock again
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
