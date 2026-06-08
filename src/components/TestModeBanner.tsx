// Shown while PayFast is still in sandbox. Remove (or gate on
// import.meta.env.VITE_PAYFAST_LIVE === "true") once live keys are in.
const TestModeBanner = () => (
  <div className="w-full bg-amber-100 border-b border-amber-300 text-amber-900 text-center text-xs sm:text-sm px-4 py-2">
    <strong>Test mode:</strong> payments run through PayFast sandbox — no real
    charge will be made and no plan will activate yet. Live billing goes on
    shortly.
  </div>
);

export default TestModeBanner;
