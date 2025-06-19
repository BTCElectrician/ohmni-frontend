// auth.ts
import NextAuth, { DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

// Extend the built-in session/token types
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
    } & DefaultSession["user"];
  }
  interface User {
    accessToken?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    accessToken?: string;
    id?: string;
  }
}

export const config: NextAuthConfig = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error("Missing credentials");
          return null;
        }

        // Always use full URL since this runs server-side
        const loginUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`;
        
        console.log("🔐 Attempting login to:", loginUrl);
        console.log("📧 Email:", credentials.email);

        try {
          const res = await fetch(loginUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const text = await res.text();
          console.log("📡 Response status:", res.status);
          console.log("📡 Raw response:", text);
          
          // Log credentials (without password) for debugging
          console.log("📧 Attempted login with email:", credentials.email);
          console.log("🔑 Password length:", String(credentials.password).length);

          // Try to parse as JSON
          let data;
          try {
            data = JSON.parse(text);
          } catch (e) {
            console.error("Failed to parse response as JSON:", e);
            console.error("Response was:", text);
            return null;
          }

          if (res.ok && data.access_token) {
            console.log("✅ Login successful, token received");
            return {
              id: data.user?.id || credentials.email,
              name: data.user?.fullname || data.user?.username,
              email: data.user?.email || credentials.email,
              accessToken: data.access_token,
            };
          }

          console.error("❌ Login failed:", data);
          return null;
        } catch (error) {
          console.error("🚨 Network/Auth error:", error);
          console.error("Login URL was:", loginUrl);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { 
  handlers: { GET, POST }, 
  auth, 
  signIn, 
  signOut 
} = NextAuth(config); 