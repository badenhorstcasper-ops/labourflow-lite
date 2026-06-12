// Shown only while PayFast is in sandbox mode.
// Set VITE_PAYFAST_LIVE=true in project env to hide once live.
const isLive = import.meta.env.VITE_PAYFAST_LIVE === "true";

const TestModeBanner = () => {
  if (isLive) return null;
  return (
    <div className="w-full bg-amber-100 border-b border-amber-300 text-amber-900 text-center text-xs sm:text-sm px-4 py-2">
      <strong>Test mode:</strong> payments run through PayFast sandbox — no real
      charge will be made and no plan will activate yet. Live billing goes on
      shortly.
    </div>
  );
};

export default TestModeBanner;
