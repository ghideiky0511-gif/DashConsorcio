import { Suspense } from "react";
import { AuthCallbackHandler } from "./auth-callback-handler";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <AuthCallbackHandler />
    </Suspense>
  );
}
