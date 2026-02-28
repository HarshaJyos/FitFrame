'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
    User,
    signInWithPopup,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    updateProfile,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUserProfile } from '@/lib/firestore';

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, displayName: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
        return unsub;
    }, []);

    const signInWithGoogle = useCallback(async () => {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        await createUserProfile({
            uid: result.user.uid,
            displayName: result.user.displayName ?? '',
            email: result.user.email ?? '',
            photoURL: result.user.photoURL ?? undefined,
        });
    }, []);

    const signInWithEmail = useCallback(async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    }, []);

    const signUp = useCallback(async (email: string, password: string, displayName: string) => {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        await createUserProfile({
            uid: result.user.uid,
            displayName,
            email,
        });
    }, []);

    const signOut = useCallback(async () => {
        await firebaseSignOut(auth);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithEmail, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
