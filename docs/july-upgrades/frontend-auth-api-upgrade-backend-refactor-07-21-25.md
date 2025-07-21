<chatName="Auth-API Response Refactor Plan"/>

Below is a step-by-step implementation blueprint to migrate the frontend to the new backend contract where every auth endpoint response is wrapped in a top-level data field.

================================================================
1. Update shared TypeScript types
================================================================
File: types/api.ts  

1.1 Rename current AuthResponse → AuthPayload (to hold ONLY the real payload).  
```ts
export interface AuthPayload {
  access_token: string;
  user: User;
  message?: string;       // keep; backend still sends it
}
```

1.2 Make the existing generic ApiResponse<T> the **canonical** wrapper.  
It already matches the new format (`{ data?: T; error?: string; message?: string; }`) so no structural change is required.

1.3 Add convenient aliases to avoid verbose generics at call sites:  
```ts
export type AuthApiResponse = ApiResponse<AuthPayload>;
export type RegisterApiResponse = ApiResponse<{ user: User }>; // adjust if backend returns something else
```

Side effects: all code that imported `AuthResponse` must now import `AuthPayload | AuthApiResponse` as appropriate.

================================================================
2. NextAuth (Credentials provider) – login flow
================================================================
File: auth.ts  

Locate authorize(credentials)  

Old:
```ts
const data: AuthResponse = await response.json();
if (data.access_token) { … }
```

New (exact snippet):
```ts
const apiRes: AuthApiResponse = await response.json();

if (!apiRes.data?.access_token) {
  throw new Error(apiRes.message || 'Invalid credentials');
}

const { access_token, user } = apiRes.data;

return {
  id: user?.id ?? credentials.email,
  email: user?.email ?? credentials.email,
  name: user?.fullname || user?.username,
  accessToken: access_token,
};
```

Architectural note: all access to the payload must go through `apiRes.data`.  Keep the early‐error pattern above to surface wrapped backend errors quickly.

================================================================
3. Non-NextAuth calls that hit auth endpoints
================================================================
3.1 Registration page  
File: app/register/page.tsx  

Old:
```ts
const data = await response.json()
if (!response.ok) throw new Error(data.message ?? 'Registration failed')
```

New:
```ts
const apiRes: RegisterApiResponse = await response.json();
if (!response.ok || apiRes.error) {
  throw new Error(apiRes.error ?? apiRes.message ?? 'Registration failed');
}

toastSuccess(apiRes.message ?? 'Account created'); // if you want a toast
```

3.2 Password reset / profile / any future auth pages  
• Search codebase for `/api/auth/` usage **outside** of `auth.ts`.  
• For each occurrence make the same pattern change (`res.data.…`).

Typical files (found in repo):
• app/test-auth/page.tsx  
• any upcoming profile page (none yet, but prepare).

================================================================
4. (Optional but recommended) Centralised helper
================================================================
Create util to remove duplication.

File (new): lib/api/unwrap.ts  
```ts
export async function unwrapApiResponse<T>(res: Response): Promise<T> {
  const apiRes: ApiResponse<T> = await res.json();
  if (!res.ok || apiRes.error) {
    throw new Error(apiRes.error ?? apiRes.message ?? res.statusText);
  }
  if (!apiRes.data) {
    throw new Error('Malformed API response: missing data');
  }
  return apiRes.data;
}
```
• Use it in register & test-auth pages (and future calls) to keep code DRY.

================================================================
5. Update mock / debug pages
================================================================
File: app/test-auth/page.tsx  

Both `testLogin` & `testRegister` currently log raw text.  
Simplest edit:

```ts
const apiRes = JSON.parse(data) as AuthApiResponse;   // or RegisterApiResponse
setResult(JSON.stringify(apiRes, null, 2));
```

================================================================
6. ESLint & TypeScript hygiene
================================================================
• Running `pnpm type-check` (or `npm run type-check`) after renaming `AuthResponse` will show breakages; fix all imports.  
• Add rule override (optional) to enforce usage of `ApiResponse<T>` for `/api/auth/**` endpoints.

================================================================
7. File list summary
================================================================
Modified:
  - types/api.ts
  - auth.ts
  - app/register/page.tsx
  - app/test-auth/page.tsx
  - (any future profile / reset-password pages)

Added:
  - lib/api/unwrap.ts  (optional)

No changes needed in:
  - useAuth() hook (it only calls `signIn('credentials')` which is already patched via auth.ts)
  - getAccessToken() (token shape unchanged)

================================================================
8. Risks / side effects
================================================================
• Forgetting to change even one `.access_token` reference will cause runtime “undefined” login failures.  
  ⇒ Use repo-wide search: `\.access_token\b`  

• If backend ever returns `{data:null, error:'...'}` with HTTP 200, the new helper correctly throws.  

• No change to refresh token endpoint assumed; if it also wraps, update `getAccessToken()` similarly.

================================================================
9. Architectural decision record
================================================================
Decision: Treat wrapper as transport concern, payload as domain object.  
• Keep `ApiResponse<T>` generic in `types/api.ts`.  
• Consumer code must **unwrap once**, early, then operate on clean domain types.  
This keeps downstream logic (store mutations, UI components) unchanged.

================================================================
Once above changes compile cleanly, login / registration flows will work with the new backend response format.

================================================================
10. Branch Strategy Recommendation
================================================================
<chatName="Auth-Wrapper Refactor Branch Recommendation"/>

Recommendation: create a short-lived feature branch (e.g. feat/auth-response-wrapper) instead of committing directly to main.

Key reasons:

1. Breaking API contract  
   • The change affects every consumer of `/api/auth/*`.  
   • A single missed `.access_token` reference will break login/refresh at runtime.

2. Coordinated rollout with backend  
   • We need to merge only after their new responses are live in all environments.  
   • A branch lets us keep CI green on `main` while the backend deploys.

3. Focused code-review surface  
   • Reviewers can diff only auth-related files and test locally against the new backend.  
   • Easier to revert/patch if an edge-case is found.

4. Parallel work isolation  
   • Other ongoing tasks (chat, PWA, etc.) stay unblocked.

Minimal branching workflow:

1. `git checkout -b feat/auth-response-wrapper`  
2. Apply the implementation plan (type changes, auth.ts, register page, helper util, debug pages).  
3. Push and open PR titled "feat: adapt frontend to wrapped auth responses".  
4. Request backend team to tag their deployment SHA in the PR for coordinated merge.  
5. Merge via standard review/CI once both sides are ready; delete branch.

The branch should remain small (≤5–6 files touched) and fast to merge, so no long-running divergence risk.