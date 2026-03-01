export default function SkeletonCard() {
  return (
    <div className="p-7 rounded-3xl border border-[#e5e5e5] bg-white animate-pulse">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-6 w-24 bg-[#f0f0f0] rounded-lg" />
          <div className="h-4 w-14 bg-[#f0f0f0] rounded" />
        </div>
        <div className="space-y-2.5">
          <div className="h-6 w-3/4 bg-[#f0f0f0] rounded-lg" />
          <div className="h-6 w-1/2 bg-[#f0f0f0] rounded-lg" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-[#f0f0f0] rounded" />
          <div className="h-4 w-5/6 bg-[#f0f0f0] rounded" />
          <div className="h-4 w-4/6 bg-[#f0f0f0] rounded" />
        </div>
        <div className="flex gap-3 pt-1">
          <div className="h-9 w-28 bg-[#f0f0f0] rounded-xl" />
          <div className="h-9 w-28 bg-[#f0f0f0] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
