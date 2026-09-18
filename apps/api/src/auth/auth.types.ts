export interface KeycloakClaims {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

export interface AuthUser {
  id: string;
  keycloakSub: string;
  email: string;
  name: string;
}
