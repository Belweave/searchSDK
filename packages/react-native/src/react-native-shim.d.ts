// Build-only declaration. Public declarations do not reference React Native types.
declare module "react-native" {
  export const NativeModules: Record<string, unknown>;
}
