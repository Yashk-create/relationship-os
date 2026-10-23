export const isClerkConfigured = () => {
  return !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
};
