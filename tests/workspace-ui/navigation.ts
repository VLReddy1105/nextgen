export const usePathname = () =>
  `/dashboard/${new URLSearchParams(location.search).get("page") || "overview"}`;
export const useSearchParams = () => new URLSearchParams(location.search);
export const useRouter = () => ({
  push: (url: string) => {
    location.href = url;
  },
  refresh: () => {},
});
