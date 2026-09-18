import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';

const keycloakUrl = process.env.KEYCLOAK_URL;
const keycloakRealm = process.env.KEYCLOAK_REALM;
const clientId = process.env.KEYCLOAK_CLIENT_ID;
const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;

if (!keycloakUrl || !keycloakRealm || !clientId || !clientSecret) {
  throw new Error('Keycloak authentication environment variables are required');
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId,
      clientSecret,
      issuer: `${keycloakUrl.replace(/\/$/, '')}/realms/${keycloakRealm}`,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken =
        typeof token.accessToken === 'string' ? token.accessToken : undefined;
      return session;
    },
  },
});
