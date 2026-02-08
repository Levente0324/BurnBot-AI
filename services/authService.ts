import { supabase } from "./supabaseClient";
import type { Session, User, AuthChangeEvent } from "@supabase/supabase-js";

export interface AuthResult {
  user: User | null;
  error: string | null;
}

/**
 * Sign up with email and password.
 */
export const signUp = async (
  email: string,
  password: string,
): Promise<AuthResult> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
};

/**
 * Sign in with email and password.
 */
export const signIn = async (
  email: string,
  password: string,
): Promise<AuthResult> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
};

/**
 * Sign out the current user.
 */
export const signOut = async (): Promise<void> => {
  await supabase.auth.signOut();
};

/**
 * Get the current session (null if not logged in).
 */
export const getSession = async (): Promise<Session | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

/**
 * Get the current user (null if not logged in).
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user;
};

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export const onAuthStateChange = (
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) => {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return data.subscription.unsubscribe;
};
