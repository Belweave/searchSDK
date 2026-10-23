// Build-only declaration for the optional Expo peer. This subset is checked
// separately against official Expo 55/56/57 declarations without this shim.
// It is not emitted or shipped, and public declarations do not import Expo.
declare module "expo/fetch" {
  export function fetch(input: string | URL, init?: RequestInit): Promise<Response>;
}
