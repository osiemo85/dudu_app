export function DisclaimerBanner({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
      <p className="font-semibold">Demonstration guidance</p>
      <p className="mt-1">{text}</p>
    </div>
  );
}
