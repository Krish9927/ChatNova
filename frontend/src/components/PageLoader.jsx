import { LoaderIcon } from "lucide-react";
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen">
      <LoaderIcon className="w-10 h-10 animate-spin" />
    </div>
  );
}
export default PageLoader;